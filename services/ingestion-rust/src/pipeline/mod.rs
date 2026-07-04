use crate::models::{Token, MarketTick};
use clickhouse::Client as ClickHouseClient;
use redis::AsyncCommands;
use std::sync::Arc;
use tokio::sync::mpsc::Receiver;

pub struct Pipeline {
    rx: Receiver<Token>,
    redis_client: redis::Client,
    clickhouse_client: ClickHouseClient,
}

impl Pipeline {
    pub fn new(rx: Receiver<Token>, redis_client: redis::Client, clickhouse_client: ClickHouseClient) -> Self {
        Self {
            rx,
            redis_client,
            clickhouse_client,
        }
    }

    pub async fn run(mut self) {
        let redis_client = Arc::new(self.redis_client);
        let clickhouse_client = Arc::new(self.clickhouse_client);

        while let Some(token) = self.rx.recv().await {
            // Validate, Deduplicate, Merge, Quality Score logic goes here
            // For now, directly publish
            let redis = redis_client.clone();
            let ch = clickhouse_client.clone();

            tokio::spawn(async move {
                Self::publish(token, redis, ch).await;
            });
        }
    }

    async fn publish(token: Token, redis: Arc<redis::Client>, clickhouse: Arc<ClickHouseClient>) {
        tracing::debug!("Publishing token: {}", token.token_address);
        
        let mut conn_result = redis.get_multiplexed_async_connection().await;
        if let Ok(mut conn) = conn_result {
            // Save to Redis (Online Feature Store)
            let key = format!("token:{}", token.token_address);
            let json = serde_json::to_string(&token).unwrap_or_default();
            let _: redis::RedisResult<()> = conn.set(key, json).await;

            // Publish to Redis Pub/Sub for WebSockets
            let topic = "market:update";
            let _: redis::RedisResult<()> = conn.publish(topic, &token.token_address).await;
        } else {
            tracing::error!("Failed to connect to redis for token {}", token.token_address);
        }

        // Save to ClickHouse
        let mut insert = clickhouse.insert::<MarketTick>("market_ticks").await.unwrap();
        
        // Convert milliseconds unix epoch to OffsetDateTime
        let dt = time::OffsetDateTime::from_unix_timestamp_nanos((token.timestamp as i128) * 1_000_000).unwrap_or(time::OffsetDateTime::now_utc());

        let tick = MarketTick {
            token_address: token.token_address.clone(),
            chain: token.chain.clone(),
            dex: token.dex.clone(),
            price: token.current_price,
            liquidity: token.liquidity,
            volume_24h: token.volume_24h,
            timestamp: dt,
            source: token.source,
            confidence: token.confidence,
        };

        if let Err(e) = insert.write(&tick).await {
            tracing::error!("Error writing tick to ClickHouse: {:?}", e);
        }
        if let Err(e) = insert.end().await {
            tracing::error!("Error flushing tick to ClickHouse: {:?}", e);
        }
    }
}
