import { Server } from 'socket.io';
import { FastifyInstance } from 'fastify';
import Redis from 'ioredis';
import { activeWebsocketConnections, websocketMessagesSentTotal } from '../metrics';

// Redis Pub/Sub events
enum RedisTopics {
    MARKET_UPDATE = 'market:update',
    MARKET_NEW = 'market:new',
    MARKET_PRICE = 'market:price',
    MARKET_LIQUIDITY = 'market:liquidity',
    MARKET_VOLUME = 'market:volume',
}

// Connect to Redis for sub and queries
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pubSubClient = new Redis(redisUrl, { enableReadyCheck: false });
const redisClient = new Redis(redisUrl);

// Helper to fetch all tokens from Redis
async function getAllTokens(): Promise<any[]> {
    try {
        const cached = await redisClient.get('tokens:all');
        if (cached) {
            return JSON.parse(cached);
        }
        const keys = await redisClient.keys('token:*');
        if (keys.length === 0) return [];
        const values = await redisClient.mget(...keys);
        return values
            .map(val => (val ? JSON.parse(val) : null))
            .filter(Boolean);
    } catch (err) {
        console.error('Error fetching tokens from Redis:', err);
        return [];
    }
}

export function setupWebsockets(fastify: FastifyInstance) {
    const io = new Server(fastify.server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    // Subscribe to local Redis Pub/Sub channel
    pubSubClient.subscribe(RedisTopics.MARKET_UPDATE, (err, count) => {
        if (err) {
            fastify.log.error(`Failed to subscribe to Redis Pub/Sub: ${err.message}`);
        } else {
            fastify.log.info(`Subscribed to Redis channel. Listening for updates on ${count} channels.`);
        }
    });

    // Handle messages received from Redis
    pubSubClient.on('message', async (channel, message) => {
        if (channel === RedisTopics.MARKET_UPDATE) {
            fastify.log.info(`Received market update event for token: ${message}`);
            // Fetch updated list of all tokens
            const tokens = await getAllTokens();
            // Emit to all clients in the channel room
            io.to('market:update').emit('price-update', tokens);
            websocketMessagesSentTotal.inc({ topic: 'market:update' });
        }
    });

    io.on('connection', async (socket) => {
        activeWebsocketConnections.inc();
        fastify.log.info(`Socket connected: ${socket.id}`);
        
        // Immediately send current list of tokens to the newly connected client
        const tokens = await getAllTokens();
        socket.emit('initial-data', tokens);

        socket.on('subscribe', (topic?: string) => {
            const channel = topic || 'market:update';
            socket.join(channel);
            fastify.log.info(`Socket ${socket.id} joined channel: ${channel}`);
        });

        socket.on('unsubscribe', (topic?: string) => {
            const channel = topic || 'market:update';
            socket.leave(channel);
            fastify.log.info(`Socket ${socket.id} left channel: ${channel}`);
        });

        socket.on('disconnect', () => {
            activeWebsocketConnections.dec();
            fastify.log.info(`Socket disconnected: ${socket.id}`);
        });
    });

    return io;
}
