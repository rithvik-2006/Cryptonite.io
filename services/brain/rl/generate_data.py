import polars as pl
import numpy as np
import os
from engines.microstructure import compute_microstructure_features

def generate_synthetic_data(output_path="data/historical_solana_features.parquet", steps=10000):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Generate random walk price
    np.random.seed(42)
    returns = np.random.normal(0.0005, 0.02, steps)
    price = 10.0 * np.exp(np.cumsum(returns))
    volume = np.abs(np.random.normal(5000, 2000, steps))

    # ── Simulate Orderbook & Taker Flow ────────────────────────────────
    # Base bid/ask volumes correlated with price direction
    base_depth = np.abs(np.random.normal(3000, 1000, steps))
    directional_bias = np.sign(returns) * np.abs(np.random.normal(500, 200, steps))
    bid_vol = np.maximum(base_depth + directional_bias, 100.0)
    ask_vol = np.maximum(base_depth - directional_bias, 100.0)

    # Taker volumes: a fraction of total volume, skewed by momentum
    taker_ratio = 0.6
    buy_skew = np.clip(0.5 + returns * 10, 0.2, 0.8)  # More buys when price goes up
    taker_buy_vol = volume * taker_ratio * buy_skew
    taker_sell_vol = volume * taker_ratio * (1.0 - buy_skew)

    timestamps = np.arange(1710000000, 1710000000 + steps * 60, 60)[:steps]

    df = pl.DataFrame({
        "price": price,
        "volume": volume,
        "bid_vol": bid_vol,
        "ask_vol": ask_vol,
        "taker_buy_vol": taker_buy_vol,
        "taker_sell_vol": taker_sell_vol,
        "timestamp": timestamps,
    })

    # ── Classic Technical Features ─────────────────────────────────────
    df = df.with_columns([
        pl.col("price").pct_change().alias("momentum"),
        pl.col("price").rolling_mean(window_size=20).alias("sma_20"),
        pl.col("price").rolling_mean(window_size=50).alias("sma_50"),
        pl.col("price").diff().alias("diff")
    ])
    
    # Calculate RSI approximation for synthetic data
    df = df.with_columns([
        pl.when(pl.col("diff") > 0).then(pl.col("diff")).otherwise(0.0).alias("gain"),
        pl.when(pl.col("diff") < 0).then(-pl.col("diff")).otherwise(0.0).alias("loss")
    ])
    
    df = df.with_columns([
        pl.col("gain").rolling_mean(window_size=14).alias("avg_gain"),
        pl.col("loss").rolling_mean(window_size=14).alias("avg_loss")
    ])
    
    df = df.with_columns([
        (pl.col("avg_gain") / pl.col("avg_loss")).alias("rs")
    ])
    
    df = df.with_columns([
        pl.when(pl.col("avg_loss") == 0).then(100.0)
          .otherwise(100.0 - (100.0 / (1.0 + pl.col("rs")))).alias("rsi")
    ])
    
    # Calculate Volatility
    df = df.with_columns([
        pl.col("momentum").rolling_std(window_size=20).alias("volatility")
    ])
    
    # Clean up RSI intermediates
    df = df.drop(["diff", "gain", "loss", "avg_gain", "avg_loss", "rs"])

    # ── Microstructure Features ────────────────────────────────────────
    df = compute_microstructure_features(df)

    # Drop nulls from rolling window warmup
    df = df.drop_nulls()
    
    # Normalize SMA relative to price
    df = df.with_columns([
        (pl.col("sma_20") / pl.col("price")).alias("sma_20"),
        (pl.col("sma_50") / pl.col("price")).alias("sma_50")
    ])
    
    df.write_parquet(output_path)
    print(f"Generated {len(df)} rows of synthetic data with microstructure features at {output_path}")

if __name__ == "__main__":
    generate_synthetic_data()
