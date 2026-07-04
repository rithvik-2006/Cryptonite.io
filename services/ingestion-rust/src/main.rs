mod models;
mod connectors;
mod pipeline;

use std::sync::Arc;
use tokio::sync::mpsc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use connectors::{Connector, DexScreenerConnector};
use pipeline::Pipeline;
use reqwest::Client;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting Cryptonite Ingestion Service...");

    let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1/".to_string());
    let clickhouse_url = env::var("CLICKHOUSE_URL").unwrap_or_else(|_| "http://127.0.0.1:8123".to_string());

    let redis_client = redis::Client::open(redis_url)?;
    let clickhouse_client = clickhouse::Client::default()
        .with_url(clickhouse_url)
        .with_database("cryptonite");

    // Initialize pipeline
    let (tx, rx) = mpsc::channel(10000);
    
    let pipeline = Pipeline::new(rx, redis_client, clickhouse_client);
    
    // Start pipeline processor
    tokio::spawn(async move {
        pipeline.run().await;
    });

    // Initialize connectors
    let reqwest_client = Arc::new(Client::new());
    
    let connectors: Vec<Box<dyn Connector>> = vec![
        Box::new(DexScreenerConnector::new())
    ];

    for connector in connectors {
        let tx_clone = tx.clone();
        let client_clone = reqwest_client.clone();
        
        tokio::spawn(async move {
            connector.start(tx_clone, client_clone).await;
        });
    }

    // Keep main thread alive
    tokio::signal::ctrl_c().await?;
    tracing::info!("Shutting down...");

    Ok(())
}
