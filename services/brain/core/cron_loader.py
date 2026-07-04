import asyncio
import json
import logging
import httpx
import redis.asyncio as aioredis
from typing import List
from schemas.pipeline_state import MarketState

logger = logging.getLogger(__name__)

GATEWAY_BASE_URL = "http://localhost:8081"


class AutonomousMarketLoader:
    def __init__(self, redis_client: aioredis.Redis, orchestrator, interval_seconds: int = 60):
        self.redis = redis_client
        self.orchestrator = orchestrator
        self.interval = interval_seconds
        self._task = None
        self._http_client: httpx.AsyncClient = None

    def start(self):
        """Starts the periodic cron loop."""
        self._http_client = httpx.AsyncClient(timeout=30.0)
        self._task = asyncio.create_task(self._cron_loop())
        logger.info(f"Autonomous Market Loader started (Interval: {self.interval}s, Gateway: {GATEWAY_BASE_URL})")

    def stop(self):
        if self._task:
            self._task.cancel()

    async def _fetch_all_tokens(self) -> List[dict]:
        """Paginate through the Phase 1 gateway /tokens endpoint to collect all active tokens."""
        all_tokens = []
        cursor = None

        while True:
            params = {"limit": 100}
            if cursor:
                params["cursor"] = cursor

            response = await self._http_client.get(f"{GATEWAY_BASE_URL}/tokens", params=params)
            response.raise_for_status()
            payload = response.json()

            if not payload.get("success"):
                logger.warning("Cron Loader: Gateway returned success=false. Stopping pagination.")
                break

            tokens = payload.get("data", [])
            all_tokens.extend(tokens)

            pagination = payload.get("pagination", {})
            if pagination.get("hasMore") and pagination.get("nextCursor"):
                cursor = pagination["nextCursor"]
            else:
                break

        return all_tokens

    async def _cron_loop(self):
        while True:
            try:
                logger.info("Cron Loader: Fetching active tokens from Phase 1 gateway...")

                # 1. Fetch all tokens from the live Fastify gateway with pagination
                tokens = await self._fetch_all_tokens()

                if not tokens:
                    logger.warning("Cron Loader: No tokens returned from gateway. Retrying next cycle.")
                    await asyncio.sleep(self.interval)
                    continue

                logger.info(f"Cron Loader: Fetched {len(tokens)} tokens from Phase 1 gateway. Enqueuing for quant analysis...")

                enqueued = 0
                # 2. Build MarketState snapshots from live token data
                for token in tokens:
                    address = token.get("token_address")
                    if not address:
                        continue

                    current_price = float(token.get("price_sol", 0.001))
                    volume = float(token.get("volume_sol", 0))
                    last_updated = int(token.get("last_updated", 0))

                    # Use price change percentages to reconstruct a synthetic price history
                    pct_1h = float(token.get("price_1hr_change", 0)) / 100.0
                    pct_24h = float(token.get("price_24hr_change", 0)) / 100.0

                    # Reconstruct approximate historical prices from change percentages
                    price_24h_ago = current_price / (1.0 + pct_24h) if pct_24h != -1.0 else current_price
                    price_1h_ago = current_price / (1.0 + pct_1h) if pct_1h != -1.0 else current_price
                    price_mid = (price_24h_ago + price_1h_ago) / 2.0

                    prices = [price_24h_ago, price_mid, price_1h_ago, current_price]
                    volumes = [volume] * 4
                    timestamps = [
                        last_updated - 86400000,  # ~24h ago
                        last_updated - 43200000,  # ~12h ago
                        last_updated - 3600000,   # ~1h ago
                        last_updated              # now
                    ]

                    market_state = MarketState(
                        token_address=address,
                        prices=prices,
                        volumes=volumes,
                        timestamps=timestamps
                    )

                    await self.orchestrator.queue.put(market_state)
                    enqueued += 1

                logger.info(f"Cron Loader: Enqueued {enqueued} tokens into pipeline successfully.")

            except asyncio.CancelledError:
                logger.info("Cron Loader loop gracefully cancelled.")
                break
            except httpx.HTTPStatusError as e:
                logger.error(f"Cron Loader: Gateway HTTP error {e.response.status_code}: {e}")
            except httpx.ConnectError:
                logger.warning("Cron Loader: Cannot reach Phase 1 gateway. Is it running on port 8081?")
            except Exception as e:
                logger.error(f"Error in Autonomous Market Loader: {str(e)}", exc_info=True)

            # Wait for next scheduled run
            await asyncio.sleep(self.interval)
