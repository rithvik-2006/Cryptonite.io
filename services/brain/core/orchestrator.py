import asyncio
import json
import logging
import redis.asyncio as aioredis
from schemas.pipeline_state import MarketState, Recommendation
from engines.feature_engineering import FeatureEngine
from engines.mvp_impl import HeuristicForecastEngine, HeuristicDecisionEngine
from engines.rl_impl import ReinforcementLearningDecisionEngine
from engines.risk_and_explain import RiskEngine, ExplainabilityEngine

logger = logging.getLogger(__name__)

class QuantOrchestrator:
    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client
        self.queue = asyncio.Queue()
        self.forecast_engine = HeuristicForecastEngine()
        
        # HOT-SWAPPED: RL Inference Engine replaces heuristic engine
        rl_engine = ReinforcementLearningDecisionEngine("models/ppo_solana_v2")
        if rl_engine.model is not None:
            self.decision_engine = rl_engine
        else:
            logger.warning("Falling back to HeuristicDecisionEngine.")
            self.decision_engine = HeuristicDecisionEngine()

        self.risk_engine = RiskEngine()
        self._running_task = None

    def start(self):
        self._running_task = asyncio.create_task(self._pipeline_worker_loop())
        logger.info("Quant Intelligence Engine pipeline workers online.")

    async def trigger_pipeline(self, token_address: str):
        """Manual trigger preserved intact for targeted debugging."""
        history_raw = await self.redis.lrange(f"ticks:{token_address}", 0, 50)
        prices = [1.20, 1.22, 1.21, 1.23, 1.26] # Fallback defaults if Redis empty
        volumes = [1000, 1500, 1200, 2100, 2500]
        timestamps = [171000000, 171000060, 171000120, 171000180, 171000240]
        bid_vol, ask_vol, taker_buy_vol, taker_sell_vol = [], [], [], []
        
        if history_raw:
            prices = [float(json.loads(t)["price"]) for t in history_raw]
            volumes = [float(json.loads(t).get("volume", 0)) for t in history_raw]
            timestamps = [int(json.loads(t)["timestamp"]) for t in history_raw]
            # Microstructure: extract orderbook & taker flow when available
            bid_vol = [float(json.loads(t).get("bid_vol", 0)) for t in history_raw]
            ask_vol = [float(json.loads(t).get("ask_vol", 0)) for t in history_raw]
            taker_buy_vol = [float(json.loads(t).get("taker_buy_vol", 0)) for t in history_raw]
            taker_sell_vol = [float(json.loads(t).get("taker_sell_vol", 0)) for t in history_raw]

        market_state = MarketState(
            token_address=token_address, prices=prices, volumes=volumes, timestamps=timestamps,
            bid_vol=bid_vol, ask_vol=ask_vol,
            taker_buy_vol=taker_buy_vol, taker_sell_vol=taker_sell_vol
        )
        await self.queue.put(market_state)

    async def _pipeline_worker_loop(self):
        while True:
            try:
                market_state: MarketState = await self.queue.get()
                
                features = FeatureEngine.compute(market_state)
                forecast = self.forecast_engine.forecast(features)
                decision = self.decision_engine.decide(forecast, features)
                risk_report = self.risk_engine.evaluate(decision, features)
                reasons = ExplainabilityEngine.generate_reasons(features, risk_report)
                
                recommendation = Recommendation(
                    token_address=market_state.token_address,
                    action=risk_report.action,
                    confidence=round(risk_report.adjusted_confidence, 4),
                    risk_level=risk_report.risk_level,
                    reasons=reasons,
                    timestamp=int(asyncio.get_event_loop().time())
                )
                
                # Step 8: Recommendation Publisher & Top-Rank Indexing
                async with self.redis.pipeline(transaction=True) as pipe:
                    # Save individual token record
                    pipe.set(f"signal:{recommendation.token_address}", recommendation.model_dump_json())
                    
                    # Calculate composite rank score (BUY > HOLD > SELL, weighted by confidence)
                    score_multiplier = 1.0 if recommendation.action == "BUY" else (-1.0 if recommendation.action == "SELL" else 0.0)
                    ranking_score = recommendation.confidence * score_multiplier
                    
                    # Store inside Sorted Set for instant Top-N lookups
                    pipe.zadd("signals:top_ranked", {recommendation.token_address: ranking_score})
                    await pipe.execute()
                
                # Publish WebSocket update broadcast
                await self.redis.publish("market:update", json.dumps({
                    "type": "QUANT_SIGNAL", 
                    "address": recommendation.token_address,
                    "action": recommendation.action,
                    "confidence": recommendation.confidence
                }))
                
                self.queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error inside Quant Pipeline processing chain: {str(e)}", exc_info=True)
