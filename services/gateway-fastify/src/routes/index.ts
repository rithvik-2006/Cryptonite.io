import { FastifyInstance } from 'fastify';
import { metricsRegistry, httpRequestsTotal, httpRequestDurationMicroseconds } from '../metrics';
import aggregationService from '../services/aggregation.service';
import cacheService from '../services/cache.service';
import { FilterParams, PaginationParams } from '../types/token.types';

export default async function routes(fastify: FastifyInstance) {
    fastify.addHook('onRequest', (request, reply, done) => {
        (request as any).startTime = process.hrtime();
        done();
    });

    fastify.addHook('onResponse', (request, reply, done) => {
        const hrtime = process.hrtime((request as any).startTime);
        const durationInSeconds = hrtime[0] + hrtime[1] / 1e9;
        const route = request.routeOptions.url || 'unknown';

        httpRequestsTotal.inc({ method: request.method, route, status_code: reply.statusCode });
        httpRequestDurationMicroseconds.observe({ method: request.method, route, status_code: reply.statusCode }, durationInSeconds);
        done();
    });

    fastify.get('/health', async (request, reply) => {
        const providers = aggregationService.getProviders();
        
        // Concurrently run healthCheck on all providers and cache
        const healthResults = await Promise.allSettled([
            cacheService.healthCheck(),
            ...providers.map(p => p.healthCheck())
        ]);

        const cacheHealthy = healthResults[0].status === 'fulfilled' && healthResults[0].value;
        const providerStatus: Record<string, string> = {};
        
        providers.forEach((p, idx) => {
            const res = healthResults[idx + 1];
            const isHealthy = res.status === 'fulfilled' && res.value;
            providerStatus[p.name] = isHealthy ? 'healthy' : 'unhealthy';
        });

        // Get total tokens cached
        const cachedTokens = await cacheService.get<any[]>('tokens:all') || [];
        const lastSyncStr = await cacheService.get<string>('provider:last_sync');
        const lastSync = lastSyncStr ? new Date(parseInt(lastSyncStr, 10)).toISOString() : null;

        const allHealthy = cacheHealthy && Object.values(providerStatus).every(status => status === 'healthy');

        return {
            status: allHealthy ? 'healthy' : 'degraded',
            providers: {
                redis: cacheHealthy ? 'healthy' : 'unhealthy',
                ...providerStatus
            },
            tokens: cachedTokens.length,
            lastSync
        };
    });

    fastify.get('/debug/providers', async (request, reply) => {
        const providers = aggregationService.getProviders();

        const debugResults = await Promise.allSettled(
            providers.map(async (provider) => {
                const healthy = await provider.healthCheck();
                const markets = await provider.fetchTrending(); // Get sample/trending list to count
                return {
                    name: provider.name,
                    status: healthy ? 'healthy' : 'unhealthy',
                    records: markets.length
                };
            })
        );

        const response: Record<string, { status: string; records: number }> = {};
        debugResults.forEach((res, idx) => {
            const providerName = providers[idx].name;
            if (res.status === 'fulfilled') {
                response[providerName] = {
                    status: res.value.status,
                    records: res.value.records
                };
            } else {
                response[providerName] = {
                    status: 'error',
                    records: 0
                };
            }
        });

        return response;
    });

    fastify.get('/metrics', async (request, reply) => {
        reply.header('Content-Type', metricsRegistry.contentType);
        return metricsRegistry.metrics();
    });

    fastify.get('/tokens', async (request, reply) => {
        const query = request.query as any;

        const filters: FilterParams = {
            timePeriod: query.timePeriod || '24h',
            sortBy: query.sortBy || 'volume',
            sortOrder: query.sortOrder || 'desc',
            search: query.search
        };

        const pagination: PaginationParams = {
            limit: query.limit ? parseInt(query.limit, 10) : 20,
            cursor: query.cursor
        };

        // Serves cached immediately and refreshes in background if stale
        const allTokens = await aggregationService.aggregateTokens();

        const paginatedResult = aggregationService.filterAndSort(allTokens, filters, pagination);

        const lastSyncStr = await cacheService.get<string>('provider:last_sync');
        const fromCache = lastSyncStr !== null;

        return {
            success: true,
            data: paginatedResult.tokens,
            pagination: {
                nextCursor: paginatedResult.nextCursor,
                hasMore: paginatedResult.hasMore
            },
            total: paginatedResult.total,
            fromCache
        };
    });

    fastify.get('/tokens/:address', async (request, reply) => {
        const { address } = request.params as { address: string };
        const cleanAddress = address.trim();

        // 1. Check cache first
        const cachedToken = await cacheService.get<any>(`token:${cleanAddress}`);
        if (cachedToken) {
            return {
                success: true,
                data: cachedToken,
                fromCache: true
            };
        }

        // 2. Fall back to querying providers concurrently
        const providers = aggregationService.getProviders();
        const results = await Promise.allSettled(
            providers.map(p => p.fetchToken(cleanAddress))
        );

        let resolvedToken: any = null;
        for (const res of results) {
            if (res.status === 'fulfilled' && res.value) {
                const token = res.value;
                if (!resolvedToken || token.liquidity_sol > resolvedToken.liquidity_sol) {
                    resolvedToken = token;
                }
            }
        }

        if (!resolvedToken) {
            return reply.status(404).send({
                success: false,
                error: 'Token not found across any provider'
            });
        }

        // Cache the newly resolved token
        await cacheService.set(`token:${cleanAddress}`, resolvedToken, 60); // 1 minute cache for individual tokens

        return {
            success: true,
            data: resolvedToken,
            fromCache: false
        };
    });

    fastify.get('/markets', async (request, reply) => {
        const allTokens = await aggregationService.aggregateTokens();
        
        // Group by source or protocol
        const marketSummary = allTokens.map(t => ({
            token_address: t.token_address,
            token_ticker: t.token_ticker,
            price_sol: t.price_sol,
            volume_sol: t.volume_sol,
            liquidity_sol: t.liquidity_sol,
            protocol: t.protocol,
            source: t.source
        }));

        return {
            success: true,
            data: marketSummary
        };
    });

    // Alias routes for market sections
    fastify.get('/markets/trending', async (request, reply) => {
        const allTokens = await aggregationService.aggregateTokens();
        const sorted = [...allTokens].sort((a, b) => b.volume_sol - a.volume_sol).slice(0, 20);
        return { success: true, data: sorted };
    });

    fastify.get('/markets/gainers', async (request, reply) => {
        const allTokens = await aggregationService.aggregateTokens();
        const sorted = [...allTokens].sort((a, b) => b.price_24hr_change - a.price_24hr_change).slice(0, 20);
        return { success: true, data: sorted };
    });

    fastify.get('/markets/losers', async (request, reply) => {
        const allTokens = await aggregationService.aggregateTokens();
        const sorted = [...allTokens].sort((a, b) => a.price_24hr_change - b.price_24hr_change).slice(0, 20);
        return { success: true, data: sorted };
    });

    fastify.get('/markets/new', async (request, reply) => {
        const allTokens = await aggregationService.aggregateTokens();
        const sorted = [...allTokens].sort((a, b) => b.last_updated - a.last_updated).slice(0, 20);
        return { success: true, data: sorted };
    });
}
