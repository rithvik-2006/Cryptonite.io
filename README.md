<div align="center">

# 🪙💚Cryptonite

</div>


Cryptonite💚 A high-performance, resilient, and scalable data aggregation service built to fetch, merge, and stream meme coin data from multiple Decentralized Exchange (DEX) sources. This service mimics the data flow of platforms like axiom.trade/discover, providing a unified source of real-time market data via REST API and WebSockets.[1]

## 📊 Project Status

| Resource | Link |
|----------|------|
| 🚀 **Deployment** | [Your Deployment URL] |
| 📹 **Demo Video** | [Your YouTube Link] |
| 📮 **API Collection** | [View Postman Collection] |
| 🛠️ **Tech Stack** | Fastify, TypeScript, Node.js, Redis, Socket.io |

## 💡 Problem Statement

The cryptocurrency market is fragmented across multiple DEX platforms, making it challenging to get a unified view of meme coin data. This service addresses key challenges:[1]

1. **Multi-source Aggregation**: Fetching data concurrently from various APIs (DexScreener, Jupiter, GeckoTerminal)[1]
2. **Rate Limit Management**: Implementing exponential backoff and intelligent caching to adhere to strict rate limits (e.g., DexScreener's 300 req/min)[1]
3. **Data Consistency**: Intelligently merging duplicate tokens that appear across different DEXs[1]
4. **Real-time Efficiency**: Delivering continuous price updates via WebSockets to prevent wasteful repeated HTTP polling[1]

## 🏗️ Architecture Design

The system employs a centralized Fastify server responsible for coordinating external data sources, managing cache freshness, and streaming updates.[1]

### System Flow

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Client    │────────>│  Fastify Server  │<───────>│  Redis Cache    │
│  (Browser)  │<───────>│   with Socket.io │         └─────────────────┘
└─────────────┘         └──────────────────┘
                                │
                                │ Aggregates (Parallel Fetching)
                                ▼
                    ┌──────────────────────┐
                    │   External DEX APIs  │
                    ├──────────────────────┤
                    │  - DexScreener       │
                    │  - Jupiter Price     │
                    │  - GeckoTerminal     │
                    └──────────────────────┘
```

### Key Design Decisions

| Component | Rationale |
|-----------|-----------|
| **Fastify** | Chosen over Express for high performance, native async/await support, and robust schema validation which speeds up request handling[1] |
| **Redis Caching** | Used for horizontal scalability and persistent, low-latency data storage with a 30-second TTL[1] |
| **Token Merging** | Tokens are deduplicated by address, prioritizing the source that provides the highest liquidity or most complete data[1] |
| **Rate Limiting** | Implemented using Axios interceptors with exponential backoff (retry attempts at 1s, 2s, 4s) to gracefully handle upstream rate limits[1] |
| **Real-time Updates** | Socket.io pushes updates from a background scheduler to connected clients, ensuring data freshness every 30 seconds without client-side polling[1] |

## 🔌 API Documentation

### Token Data Structure

All returned tokens adhere to a unified structure:[1]

```json
{
  "token_address": "576P1t7XsRL4ZVj38LV2eYWxXRPguBADA8BxcNz1xo8y",
  "token_name": "PIPE CTO",
  "token_ticker": "PIPE",
  "price_sol": 4.414e-7,
  "market_cap_sol": 441.41,
  "volume_sol": 1322.43,
  "liquidity_sol": 149.36,
  "transaction_count": 2205,
  "price_1hr_change": 120.61,
  "protocol": "Raydium CLMM"
}
```

### REST Endpoints

#### `GET /api/tokens`

Fetch the aggregated list with filtering, sorting, and pagination.[1]

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timePeriod` | `1h \| 24h \| 7d` | `24h` | Price change time window for filtering |
| `sortBy` | `volume \| price \| market_cap` | `volume` | Metric used for sorting the results |
| `sortOrder` | `asc \| desc` | `desc` | Sort direction |
| `limit` | `number` | `20` | Results per page (Max 100) |
| `cursor` | `string` | `-` | Opaque string for cursor-based pagination |

**Example Request:**
```bash
GET /api/tokens?timePeriod=24h&sortBy=volume&sortOrder=desc&limit=50
```

#### `GET /api/tokens/:address`

Fetch details for a single token.[1]

| Path Parameter | Description |
|----------------|-------------|
| `address` | Required token contract address |

**Example Request:**
```bash
GET /api/tokens/576P1t7XsRL4ZVj38LV2eYWxXRPguBADA8BxcNz1xo8y
```

## ⚡ Real-time Updates (WebSockets)

The service utilizes Socket.io to push price and volume changes to clients, fulfilling the core requirement for live updates after the initial data load.[1]

### Connection URL
```
ws://[Your Deployment URL]
```

### Server → Client Events

| Event | Trigger | Description |
|-------|---------|-------------|
| `initial-data` | Sent immediately after client connects and subscribes | Full snapshot of the current token list[1] |
| `price-update` | Broadcasted every 30 seconds via a background scheduler | Refreshed token data for live price and volume changes[1] |

### Client-side Implementation

```javascript
import io from 'socket.io-client';

const socket = io('ws://your-deployment-url');

// Listen for initial data
socket.on('initial-data', (data) => {
  console.log('Initial token data:', data);
});

// Listen for price updates
socket.on('price-update', (data) => {
  console.log('Updated token data:', data);
});
```

**Note**: Filtering and sorting are executed client-side on the data received via the WebSocket stream, ensuring the front-end remains fast and prevents additional HTTP requests.[1]

## 🛠️ Installation & Setup

### Prerequisites

- Node.js (v18+)[1]
- Redis (v6+)[1]
- npm or yarn[1]

### Steps

```bash
# Clone the repository
git clone https://github.com/yourusername/meme-coin-aggregator.git
cd meme-coin-aggregator

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env to set REDIS_HOST, REDIS_PORT, and CACHE_TTL

# Start Redis (if not already running)
redis-server

# Start the development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory with the following configuration:[1]

```env
# Server Configuration
PORT=3000

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Cache/Scheduler Configuration
CACHE_TTL=30                    # Caching period in seconds
WS_UPDATE_INTERVAL=30000        # WebSocket push interval in milliseconds
```

### Available Scripts

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## ✅ Implementation Highlights

| Criteria | Implementation Details |
|----------|----------------------|
| **Data Aggregation** | Parallel fetching using `Promise.all()` from DexScreener, Jupiter, and GeckoTerminal[1] |
| **Caching Strategy** | Redis used with a 30s TTL; API cold start hits all sources, subsequent requests served from cache[1] |
| **Real-time Updates** | Socket.io broadcasts `price-update` events every 30s, driven by a background job that refreshes the Redis cache[1] |
| **Error Handling** | Axios retry logic with exponential backoff protects against rate limits; dedicated service files isolate external API failure[1] |
| **Filtering/Sorting** | Implemented efficiently on the aggregated dataset using URL query parameters (timePeriod, sortBy) and managed via cursor-based pagination for scalability[1] |

## 📁 Project Structure

```
meme-coin-aggregator/
├── src/
│   ├── routes/           # API route definitions
│   ├── services/         # External API integrations
│   ├── utils/            # Helper functions and utilities
│   ├── types/            # TypeScript type definitions
│   ├── config/           # Configuration files
│   └── server.ts         # Main server entry point
├── tests/                # Unit and integration tests
├── .env.example          # Environment variable template
├── package.json
├── tsconfig.json
└── README.md
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🚀 Deployment

The service can be deployed on various platforms including AWS, Google Cloud, Heroku, or Railway.

### Docker Deployment

```bash
# Build Docker image
docker build -t meme-coin-aggregator .

# Run with Docker Compose
docker-compose up -d
```

### Environment Setup

Ensure your production environment has:
- Redis instance configured and accessible
- Environment variables properly set
- Node.js runtime (v18+)
- Adequate memory for caching (minimum 512MB recommended)

## 🤝 Contributing

Contributions are welcome! Please ensure all new features include corresponding unit and integration tests.[1]

### Contribution Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

See the LICENSE file for details.[1]

## 🙏 Acknowledgments

- DexScreener API for comprehensive DEX data
- Jupiter Aggregator for Solana price feeds
- GeckoTerminal for multi-chain token data

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub or contact [your-email@example.com].

***

**Built with ❤️ using Fastify, TypeScript, and Redis**
