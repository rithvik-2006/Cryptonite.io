CREATE DATABASE IF NOT EXISTS cryptonite;

USE cryptonite;

-- Market Ticks: The most granular level of price updates from providers
CREATE TABLE IF NOT EXISTS market_ticks (
    token_address String,
    chain String,
    dex String,
    price Float64,
    liquidity Float64,
    volume_24h Float64,
    timestamp DateTime64(9, 'UTC'), -- Nanosecond precision
    source String,
    confidence Float32
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (token_address, chain, dex, timestamp);

-- Trades: Individual trades (buys/sells)
CREATE TABLE IF NOT EXISTS trades (
    trade_id String,
    token_address String,
    chain String,
    dex String,
    trade_type Enum8('BUY' = 1, 'SELL' = 2),
    price Float64,
    amount Float64,
    timestamp DateTime64(9, 'UTC'),
    maker String,
    taker String
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (token_address, timestamp, trade_type);

-- Liquidity History: Snapshots of liquidity over time
CREATE TABLE IF NOT EXISTS liquidity_history (
    token_address String,
    chain String,
    dex String,
    total_liquidity Float64,
    base_reserve Float64,
    quote_reserve Float64,
    timestamp DateTime64(9, 'UTC')
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (token_address, timestamp);

-- Price History (Aggregated OHLCV - 1 minute candles as example for pre-aggregation)
CREATE TABLE IF NOT EXISTS price_history_1m (
    token_address String,
    chain String,
    dex String,
    open Float64,
    high Float64,
    low Float64,
    close Float64,
    volume Float64,
    timestamp_start DateTime,
    timestamp_end DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp_start)
ORDER BY (token_address, timestamp_start);
