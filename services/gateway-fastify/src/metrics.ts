import promClient from 'prom-client';

promClient.collectDefaultMetrics({
    prefix: 'gateway_',
});

export const httpRequestsTotal = new promClient.Counter({
    name: 'gateway_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestDurationMicroseconds = new promClient.Histogram({
    name: 'gateway_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

export const activeWebsocketConnections = new promClient.Gauge({
    name: 'gateway_websocket_connections_active',
    help: 'Number of active WebSocket connections',
});

export const websocketMessagesSentTotal = new promClient.Counter({
    name: 'gateway_websocket_messages_sent_total',
    help: 'Total number of WebSocket messages sent',
    labelNames: ['topic'],
});

export const metricsRegistry = promClient.register;
