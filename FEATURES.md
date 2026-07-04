# Cryptonite — Phase 1 Feature Summary

> Institutional-grade Solana market data aggregation platform.
> Phase 1 focuses exclusively on the real-time data layer — no AI, no wallets, no trading execution.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        External Data Sources                        │
│  DexScreener · GeckoTerminal · Jupiter · Raydium · Meteora · Orca  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ REST APIs
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Fastify API Gateway (Node.js)                   │
│  ┌──────────┐  ┌───────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Providers│→ │  Aggregation  │→ │  Redis   │→ │  REST / WS   │  │
│  │ (6 live) │  │  + Dedup +    │  │  Cache   │  │  Endpoints   │  │
│  │          │  │  Merge        │  │          │  │              │  │
│  └──────────┘  └───────────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   Rust Ingestion      ClickHouse          Prometheus
   Pipeline            Data Warehouse      + Grafana
```

---

## 1. Multi-Provider Market Data Ingestion

Six live market data providers fetch real production data from Solana DEX APIs:

| Provider | Data Source | Endpoint Strategy |
|----------|------------|-------------------|
| **DexScreener** | `api.dexscreener.com` | Search + token lookup across all Solana pairs |
| **GeckoTerminal** | `api.geckoterminal.com/api/v2` | Trending pools + top pools by volume (pool-first architecture) |
| **Jupiter** | `tokens.jup.ag` + `api.jup.ag/price/v2` | Verified token list + batch price resolution |
| **Raydium** | GeckoTerminal DEX-filtered pools | `/networks/solana/dexes/raydium/pools` |
| **Meteora** | GeckoTerminal DEX-filtered pools | `/networks/solana/dexes/meteora/pools` |
| **Orca** | GeckoTerminal DEX-filtered pools | `/networks/solana/dexes/orca/pools` |

Each provider implements the unified `MarketProvider` interface:

```typescript
interface MarketProvider {
  name: string;
  fetchTrending(): Promise<TokenData[]>;
  fetchToken(address: string): Promise<TokenData | null>;
  fetchMarkets(): Promise<TokenData[]>;
  healthCheck(): Promise<boolean>;
}
```

---

## 2. Rate Limiting & Resilience

- **Queue-based rate limiter** — Enforces per-provider requests-per-minute limits using a sliding window algorithm. Requests exceeding the limit are queued and drained sequentially.
- **Exponential backoff** — Every external API call is wrapped in a retry loop with configurable max retries and exponentially increasing delays (1s → 2s → 4s).
- **No nested throttling** — Private helper methods perform raw HTTP calls; only public-facing methods enter the rate limiter. This prevents deadlocks and burst-induced 429s.
- **Centralized HTTP client** — All providers use a shared Axios instance configured with a browser-standard `User-Agent` header to avoid Cloudflare edge rejection.
- **GeckoTerminal API version header** — Sends `Accept: application/json;version=20230302` to prevent schema mismatches.

---

## 3. Aggregation Engine

The `AggregationService` orchestrates all six providers in parallel:

- **`Promise.allSettled()`** — One provider failure never breaks the pipeline. Partial results are always served.
- **Deduplication** — Tokens are matched by normalized `token_address`. Duplicate listings from multiple providers are merged into a single record.
- **Merge strategy** (ordered priority):
  1. **Highest liquidity** — The provider reporting the deepest pool wins the price/metadata fields.
  2. **Newest timestamp** — Tiebreaker for equal liquidity.
  3. **Most complete metadata** — Longer token name/ticker preferred.
- **Cumulative fields** — `volume_sol` takes the maximum across sources; `transaction_count` is summed.
- **Async background refresh** — Cache reads are served instantly. If the cache is stale (older than `CACHE_TTL`), a non-blocking background task syncs fresh data without delaying the response.

---

## 4. Redis Caching Layer

- **Local Redis** (`ioredis`) — TCP-based connection to a local Redis 7 instance (no Upstash dependency).
- **Cache schema**:
  - `tokens:all` — Full merged token list
  - `markets:all` — Market summary dataset
  - `market:solana` — Filtered Solana-only tokens
  - `token:{address}` — Individual token lookups
  - `provider:last_sync` — Timestamp of last successful aggregation
- **Pipeline writes** — All cache updates are batched into a single Redis pipeline for minimal round-trip latency.
- **Configurable TTL** — Default 30 seconds, tunable via `CACHE_TTL` environment variable.
- **Health check** — `PING/PONG` probe exposed via the `/health` endpoint.

---

## 5. REST API Endpoints

All endpoints are served through the Fastify gateway on port `8081` (mapped from container port `8080`).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | System health — Redis status, per-provider status, token count, last sync time |
| `GET` | `/debug/providers` | Diagnostic view — per-provider health and record counts |
| `GET` | `/tokens` | Paginated token list with search, sorting, and filtering |
| `GET` | `/tokens/:address` | Single token lookup (cache-first, provider fallback) |
| `GET` | `/markets` | Market summary (address, ticker, price, volume, liquidity, protocol) |
| `GET` | `/markets/trending` | Top 20 tokens sorted by 24h volume |
| `GET` | `/markets/gainers` | Top 20 tokens sorted by 24h price increase |
| `GET` | `/markets/losers` | Top 20 tokens sorted by 24h price decrease |
| `GET` | `/markets/new` | Top 20 most recently updated tokens |
| `GET` | `/metrics` | Prometheus metrics scrape endpoint |
| `GET` | `/docs` | Swagger UI (auto-generated OpenAPI documentation) |

### Query Parameters (`/tokens`)

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | — | Filter by name, ticker, or address |
| `sortBy` | enum | `volume` | `volume`, `market_cap`, `price_change`, `liquidity` |
| `sortOrder` | enum | `desc` | `asc` or `desc` |
| `timePeriod` | enum | `24h` | `1h`, `24h`, `7d` (for price_change sorting) |
| `limit` | number | `20` | Results per page (max 100) |
| `cursor` | string | — | Cursor-based pagination offset |

---

## 6. Real-Time WebSocket Updates

- **Socket.IO** server attached to the Fastify HTTP server.
- **Redis Pub/Sub** — Subscribes to the `market:update` channel. When the Rust ingestion pipeline publishes a token update, the gateway fetches the latest state from Redis and broadcasts to all subscribed WebSocket clients.
- **Events**:
  - `initial-data` — Full token snapshot sent on connection.
  - `price-update` — Incremental updates pushed to clients in the `market:update` room.
  - `subscribe` / `unsubscribe` — Client-driven channel membership.
- **Optimized reads** — `getAllTokens()` reads the pre-cached `tokens:all` key first, falling back to individual `token:*` key scans only if the bulk cache is missing.

---

## 7. Rust Ingestion Pipeline

A high-performance Tokio-based async pipeline:

- **Connectors** — `DexScreenerConnector` generates market tick data and pushes it through an MPSC channel.
- **Pipeline processor** — Consumes from the channel, writes to:
  - **Redis** — Individual `token:{address}` keys + `market:update` Pub/Sub broadcast.
  - **ClickHouse** — Persisted market ticks with nanosecond-precision timestamps.
- **Buffered channel** — 10,000-element MPSC buffer absorbs ingestion bursts without backpressure.

---

## 8. ClickHouse Data Warehouse

Columnar OLAP database optimized for time-series market data:

| Table | Engine | Purpose |
|-------|--------|---------|
| `market_ticks` | MergeTree | Granular price updates from all providers (nanosecond precision) |
| `trades` | MergeTree | Individual buy/sell trade records |
| `liquidity_history` | MergeTree | Periodic liquidity snapshots per pool |
| `price_history_1m` | MergeTree | Pre-aggregated 1-minute OHLCV candles |

All tables are partitioned by date and ordered by `(token_address, timestamp)` for fast range queries.

---

## 9. Observability Stack

### Prometheus Metrics

Exported at `/metrics` via `prom-client`:

| Metric | Type | Description |
|--------|------|-------------|
| `gateway_http_requests_total` | Counter | Total HTTP requests by method, route, status |
| `gateway_http_request_duration_seconds` | Histogram | Request latency distribution (10 buckets: 100ms–10s) |
| `gateway_websocket_connections_active` | Gauge | Current live WebSocket connections |
| `gateway_websocket_messages_sent_total` | Counter | Total WebSocket messages broadcast by topic |

### Grafana Dashboard

Pre-configured Grafana instance at `http://localhost:3005` with Prometheus as the data source.

---

## 10. Security & Middleware

- **Helmet** — Sets security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS** — Configured for open access (`origin: '*'`)
- **Rate limiting** — 100 requests/minute per client via `@fastify/rate-limit`
- **Health checks** — Docker-level `HEALTHCHECK` on the gateway container pings `/health` every 30 seconds.

---

## 11. Containerized Infrastructure

Single `docker-compose up -d --build` command brings up the full stack:

| Service | Image | Port |
|---------|-------|------|
| Redis | `redis:7-alpine` | `6377` |
| ClickHouse | `clickhouse/clickhouse-server:24-alpine` | `8123`, `9000` |
| Prometheus | `prom/prometheus:latest` | `9090` |
| Grafana | `grafana/grafana:latest` | `3005` |
| Ingestion Service | Custom Rust (multi-stage build) | Internal |
| Gateway Service | Custom Node.js (multi-stage build) | `8081` |

Redis is configured with `appendonly yes`, 2GB max memory, and `allkeys-lru` eviction.

---

## 12. Normalized Data Schema

Every provider normalizes its response into a unified `TokenData` contract:

```typescript
interface TokenData {
  token_address: string;    // On-chain mint address
  token_name: string;       // Human-readable name
  token_ticker: string;     // Symbol (e.g. SOL, BONK)
  price_sol: number;        // Price denominated in SOL
  market_cap_sol: number;   // Market cap in SOL
  volume_sol: number;       // 24h volume in SOL
  liquidity_sol: number;    // Total liquidity in SOL
  transaction_count: number;// 24h transaction count
  price_1hr_change: number; // 1h price change %
  price_24hr_change: number;// 24h price change %
  price_7d_change: number;  // 7d price change %
  protocol: string;         // DEX name (Raydium, Orca, etc.)
  source: string;           // Provider name
  last_updated: number;     // Unix timestamp (ms)
}
```

USD → SOL conversion is handled by a centralized `convertUsdToSol()` helper with dynamic SOL price calibration from live pool quote data.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Gateway listen port |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `CACHE_TTL` | `30` | Cache time-to-live in seconds |
| `NODE_ENV` | `development` | Runtime environment |

---

## Quick Start

```bash
cd infrastructure/docker
docker-compose up -d --build
```

- **API Gateway**: `http://localhost:8081`
- **Swagger Docs**: `http://localhost:8081/docs`
- **Grafana**: `http://localhost:3005` (admin/admin)
- **Prometheus**: `http://localhost:9090`
