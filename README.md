# Cryptonite Phase 1 — Institutional Real-Time Market Data Infrastructure

This repository contains the foundational Phase 1 architecture for Cryptonite, an AI-powered crypto advisor.

The objective of Phase 1 is to continuously ingest decentralized market data from multiple DEXs, normalize it, store it efficiently, and expose it through extremely fast APIs and WebSockets. The system is designed to support millions of updates per day while maintaining extremely low latency, effectively serving as the market data layer for future AI services.

## Architecture

Cryptonite uses an Event-Driven, CQRS, Microservices architecture.

- **Rust Ingestion Service (`services/ingestion-rust`)**: A highly concurrent pipeline built with Tokio that fetches from external DEX sources, normalizes the data, and publishes it.
- **Fastify API Gateway (`services/gateway-fastify`)**: A scalable, stateless Node.js Gateway that provides REST APIs and WebSocket streams to clients. It reads directly from the Redis Feature Store.
- **Redis (Online Feature Store)**: Used to store the latest market states, trades, and orderbook snapshots for $O(1)$ retrieval and pub/sub routing.
- **ClickHouse (Data Warehouse)**: Used as an append-only time-series database to store the full historical tick data for future AI training.
- **Monitoring Stack**: Prometheus and Grafana for full system observability.

## Project Structure

```text
cryptonite/
├── services/
│   ├── ingestion-rust/       # Rust Tokio data ingestion pipeline
│   └── gateway-fastify/      # Node.js Fastify API Gateway
├── shared/
│   ├── contracts/            # Shared interfaces (e.g. MarketData.ts)
│   ├── schemas/              # Zod / JSON schemas
│   └── protobuf/             # Protobuf definitions
├── infrastructure/
│   ├── docker/               # docker-compose.yml
│   ├── clickhouse/           # ClickHouse initialization scripts
│   ├── monitoring/           # Prometheus and Grafana config
│   └── redis/                # Redis configuration
├── docs/                     # Architecture and deployment docs
└── tests/                    # Integration testing suite
```

## Running Locally

To spin up the entire infrastructure locally, including Redis, ClickHouse, Prometheus, Grafana, and both the Rust and Fastify services:

1. Ensure you have Docker and Docker Compose installed.
2. Navigate to the docker infrastructure directory:
   ```bash
   cd infrastructure/docker
   ```
3. Start the stack:
   ```bash
   docker-compose up -d --build
   ```

### Accessing the Services
- **API Gateway**: `http://localhost:8080`
- **Swagger Documentation**: `http://localhost:8080/docs`
- **Grafana Dashboards**: `http://localhost:3000` (Login: `admin` / `admin`)
- **Prometheus**: `http://localhost:9090`
- **ClickHouse**: `localhost:8123`
- **Redis**: `localhost:6379`
