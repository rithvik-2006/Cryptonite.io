import polars as pl


def compute_microstructure_features(df: pl.DataFrame) -> pl.DataFrame:
    """Transforms raw tick/OHLCV + Orderbook data into modern microstructure features.

    Assumes incoming DataFrame has columns:
        price, volume, bid_vol, ask_vol, taker_buy_vol, taker_sell_vol

    Returns the DataFrame enriched with:
        - order_book_imbalance  : [-1, 1] buy/sell depth ratio
        - volume_delta          : taker buy - taker sell (z-score normalized)
        - cvd_10                : cumulative volume delta over 10 bars (z-score)
        - cvd_50                : cumulative volume delta over 50 bars (z-score)
        - realized_volatility   : rolling std of log returns (20-bar)
    """
    df = df.sort("timestamp") if "timestamp" in df.columns else df

    # ── 1. Order Book Imbalance (OBI) ──────────────────────────────────
    # Range [-1, 1]. +1 = heavy buy-side depth, -1 = heavy sell-side depth.
    df = df.with_columns([
        ((pl.col("bid_vol") - pl.col("ask_vol")) /
         (pl.col("bid_vol") + pl.col("ask_vol") + 1e-8)).alias("order_book_imbalance")
    ])

    # ── 2. Volume Delta (Buy pressure vs Sell pressure) ────────────────
    df = df.with_columns([
        (pl.col("taker_buy_vol") - pl.col("taker_sell_vol")).alias("volume_delta_raw")
    ])

    # Cumulative Volume Delta (CVD) over rolling windows
    df = df.with_columns([
        pl.col("volume_delta_raw").rolling_sum(window_size=10).alias("cvd_10_raw"),
        pl.col("volume_delta_raw").rolling_sum(window_size=50).alias("cvd_50_raw"),
    ])

    # ── 3. Rolling Z-Score Normalization ───────────────────────────────
    # Keeps unbounded features in a stable range for neural network input.
    for col_name in ["volume_delta_raw", "cvd_10_raw", "cvd_50_raw"]:
        alias = col_name.replace("_raw", "")
        df = df.with_columns([
            ((pl.col(col_name) - pl.col(col_name).rolling_mean(window_size=50)) /
             (pl.col(col_name).rolling_std(window_size=50) + 1e-8)).alias(alias)
        ])

    # Drop raw intermediates
    df = df.drop(["volume_delta_raw", "cvd_10_raw", "cvd_50_raw"])

    # ── 4. Realized Volatility Regime ──────────────────────────────────
    # Rolling standard deviation of percentage returns (20-bar lookback).
    df = df.with_columns([
        pl.col("price").pct_change().rolling_std(window_size=20).alias("realized_volatility")
    ])

    return df
