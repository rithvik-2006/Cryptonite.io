use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Token {
    pub token_address: String,
    pub ticker: String,
    pub name: String,
    pub chain: String,
    pub dex: String,
    pub protocol: String,
    pub current_price: f64,
    pub market_cap: f64,
    pub liquidity: f64,
    pub fdv: f64,
    pub volume_24h: f64,
    pub transactions: u64,
    pub buys: u64,
    pub sells: u64,
    pub price_change: f64,
    pub volume_change: f64,
    pub liquidity_change: f64,
    pub timestamp: u64, // Unix epoch milliseconds
    pub source: String,
    pub confidence: f32,
    pub data_freshness: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, clickhouse::Row)]
pub struct MarketTick {
    pub token_address: String,
    pub chain: String,
    pub dex: String,
    pub price: f64,
    pub liquidity: f64,
    pub volume_24h: f64,
    #[serde(with = "clickhouse::serde::time::datetime64::nanos")]
    pub timestamp: time::OffsetDateTime,
    pub source: String,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, clickhouse::Row)]
pub struct Trade {
    pub trade_id: String,
    pub token_address: String,
    pub chain: String,
    pub dex: String,
    pub trade_type: u8, // 1 = BUY, 2 = SELL
    pub price: f64,
    pub amount: f64,
    #[serde(with = "clickhouse::serde::time::datetime64::nanos")]
    pub timestamp: time::OffsetDateTime,
    pub maker: String,
    pub taker: String,
}
