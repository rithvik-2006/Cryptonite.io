from fastapi import FastAPI, Depends, HTTPException, Query
from contextlib import asynccontextmanager
import redis.asyncio as aioredis
import logging
import json
from typing import List

from config.settings import settings
from core.orchestrator import QuantOrchestrator
from core.cron_loader import AutonomousMarketLoader
from schemas.pipeline_state import Recommendation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AppState:
    orchestrator: QuantOrchestrator = None
    cron_loader: AutonomousMarketLoader = None
    redis_client: aioredis.Redis = None

state = AppState()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize Redis connection pool
    state.redis_client = aioredis.from_url("redis://localhost:6379", decode_responses=True)
    
    # 2. Boot Quant Orchestrator workers
    state.orchestrator = QuantOrchestrator(redis_client=state.redis_client)
    state.orchestrator.start()

    # 3. Boot Autonomous Cron Loader (Sweeps every 60 seconds)
    state.cron_loader = AutonomousMarketLoader(
        redis_client=state.redis_client,
        orchestrator=state.orchestrator,
        interval_seconds=60
    )
    state.cron_loader.start()
    
    yield
    
    # Cleanup hook
    if state.cron_loader:
        state.cron_loader.stop()
    await state.redis_client.close()

app = FastAPI(title="Cryptonite Brain API", lifespan=lifespan)

@app.get("/health")
async def health_check():
    return {
        "status": "ok", 
        "redis": "connected" if state.redis_client else "disconnected",
        "queue_size": state.orchestrator.queue.qsize() if state.orchestrator else 0
    }

# ==========================================
# PRESERVED EXISTING MANUAL TRIGGER
# ==========================================
@app.post("/trigger/{token}")
async def trigger_pipeline(token: str):
    if not state.orchestrator:
        raise HTTPException(status_code=500, detail="Orchestrator not initialized")
    await state.orchestrator.trigger_pipeline(token)
    return {"status": "Pipeline triggered manually", "token": token}

# ==========================================
# NEW: GET TOP-N RECOMMENDATIONS
# ==========================================
@app.get("/recommendations/top", response_model=List[Recommendation])
async def get_top_recommendations(limit: int = Query(5, ge=1, le=20)):
    """
    Returns the top N highest confidence BUY recommendations, sorted descending.
    """
    if not state.redis_client:
        raise HTTPException(status_code=500, detail="Redis client not initialized")

    # 1. Query top token addresses from the Redis Sorted Set (highest score first)
    top_token_addresses = await state.redis_client.zrevrange("signals:top_ranked", 0, limit - 1)
    
    if not top_token_addresses:
        return []

    # 2. Batch fetch full recommendation JSON payloads using MGET
    keys = [f"signal:{addr}" for addr in top_token_addresses]
    raw_signals = await state.redis_client.mget(keys)

    recommendations = []
    for raw in raw_signals:
        if raw:
            recommendations.append(Recommendation.model_validate_json(raw))

    return recommendations

# ==========================================
# PRESERVED EXISTING SINGLE TOKEN ROUTE
# ==========================================
@app.get("/recommendations/{token}", response_model=Recommendation)
async def get_recommendation(token: str):
    if not state.redis_client:
         raise HTTPException(status_code=500, detail="Redis client not initialized")
    
    key = f"signal:{token}"
    data = await state.redis_client.get(key)
    if not data:
        raise HTTPException(status_code=404, detail="Recommendation record not found for asset")
    
    return Recommendation.model_validate_json(data)
