use async_trait::async_trait;
use reqwest::Client;
use std::sync::Arc;
use tokio::sync::mpsc::Sender;
use crate::models::Token;

#[async_trait]
pub trait Connector: Send + Sync {
    fn name(&self) -> &'static str;
    async fn start(&self, tx: Sender<Token>, client: Arc<Client>);
}

// Simple Linear Congruential Generator for pseudo-randomness
struct Lcg {
    state: u64,
}

impl Lcg {
    fn new(seed: u64) -> Self {
        Self { state: seed }
    }
    fn next(&mut self) -> u64 {
        self.state = self.state.wrapping_mul(6364136223846793005).wrapping_add(1);
        self.state
    }
    fn next_f64(&mut self) -> f64 {
        (self.next() as f64) / (u64::MAX as f64)
    }
}

// Dummy DexScreener Connector
pub struct DexScreenerConnector;

impl DexScreenerConnector {
    pub fn new() -> Self {
        Self {}
    }
}

#[async_trait]
impl Connector for DexScreenerConnector {
    fn name(&self) -> &'static str {
        "DexScreener"
    }

    async fn start(&self, tx: Sender<Token>, _client: Arc<Client>) {
        tracing::info!("Started DexScreener Connector");
        
        let mut lcg = Lcg::new(12345);
        let tokens_metadata = vec![
            ("So11111111111111111111111111111111111111112", "SOL", "Solana", "solana", 145.0, 65_000_000_000.0),
            ("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", "ETH", "Ethereum", "ethereum", 3400.0, 410_000_000_000.0),
            ("2222222222222222222222222222222222222222222", "BTC", "Bitcoin", "solana", 65000.0, 1_280_000_000_000.0),
            ("JUPyiwrP55442kyB1RgbkbJWhXmJg75eT371GtQYHmH", "JUP", "Jupiter", "solana", 0.95, 1_300_000_000.0),
        ];

        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

            for (addr, ticker, name, chain, base_price, base_mc) in &tokens_metadata {
                let change_pct = (lcg.next_f64() - 0.5) * 0.02; // -1% to +1%
                let current_price = base_price * (1.0 + change_pct);
                let market_cap = base_mc * (1.0 + change_pct);
                let liquidity = 5_000_000.0 + (lcg.next_f64() * 2_000_000.0);
                let volume_24h = 15_000_000.0 + (lcg.next_f64() * 10_000_000.0);
                
                let timestamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64;

                let token = Token {
                    token_address: addr.to_string(),
                    ticker: ticker.to_string(),
                    name: name.to_string(),
                    chain: chain.to_string(),
                    dex: "Raydium".to_string(),
                    protocol: "v3".to_string(),
                    current_price,
                    market_cap,
                    liquidity,
                    fdv: market_cap * 1.1,
                    volume_24h,
                    transactions: 5000 + (lcg.next() % 2000),
                    buys: 2500 + (lcg.next() % 1000),
                    sells: 2500 + (lcg.next() % 1000),
                    price_change: change_pct * 100.0,
                    volume_change: (lcg.next_f64() - 0.5) * 5.0,
                    liquidity_change: (lcg.next_f64() - 0.5) * 2.0,
                    timestamp,
                    source: "DexScreener".to_string(),
                    confidence: 0.98,
                    data_freshness: timestamp,
                };

                if let Err(e) = tx.send(token).await {
                    tracing::error!("Failed to send token update: {:?}", e);
                }
            }
        }
    }
}
