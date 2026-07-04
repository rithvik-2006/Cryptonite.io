import pytest
import asyncio
from schemas.market import MarketState
from feature_engineering.engine import FeatureEngine
from forecasting.heuristic import HeuristicForecast
from strategy.rule_based import RuleBasedDecision
from risk.engine import RiskEngine
from explanation.engine import ExplainabilityEngine
from ranking.engine import RankingEngine
import polars as pl

@pytest.mark.asyncio
async def test_pipeline_integration():
    market_state = MarketState(
        token="PEPE",
        price=0.000012,
        volume=1000000,
        liquidity=500000,
        timestamp=1690000000
    )
    
    df = pl.DataFrame({"price": [0.000010, 0.000011, 0.000012]})
    
    feature_engine = FeatureEngine()
    features = await feature_engine.generate(market_state, df)
    
    assert features.token == "PEPE"
    
    forecast_engine = HeuristicForecast()
    forecast = await forecast_engine.predict(features)
    
    decision_engine = RuleBasedDecision()
    decision = await decision_engine.decide(forecast, features)
    
    risk_engine = RiskEngine()
    risk_report = await risk_engine.evaluate(decision)
    
    explanation_engine = ExplainabilityEngine()
    ranking_engine = RankingEngine(explanation_engine)
    recommendation = await ranking_engine.rank_and_generate(risk_report)
    
    assert recommendation.token == "PEPE"
    assert "score" in recommendation.model_dump()
    assert len(recommendation.reasoning) > 0
