import polars as pl
from schemas.pipeline_state import MarketState, FeatureVector
from engines.microstructure import compute_microstructure_features

class FeatureEngine:
    @staticmethod
    def compute(state: MarketState) -> FeatureVector:
        df = pl.DataFrame({
            "price": state.prices,
            "volume": state.volumes
        })
        
        if len(df) < 50:
            # Fallback for newly listed tokens without sufficient candle history
            return FeatureVector(
                token_address=state.token_address, rsi=50.0, momentum=0.0, 
                volatility=0.0, sma_20=1.0, sma_50=1.0
            )

        # Polars native expressions for moving averages and metrics
        df = df.with_columns([
            pl.col("price").pct_change().alias("returns"),
            pl.col("price").rolling_mean(window_size=20).alias("sma_20"),
            pl.col("price").rolling_mean(window_size=50).alias("sma_50"),
            pl.col("price").diff().alias("diff")
        ])

        latest = df.tail(1)
        
        # Calculate RSI
        gain = df["diff"].clip(lower_bound=0.0).mean()
        loss = (-df["diff"].clip(upper_bound=0.0)).mean()
        
        # Handle cases where clip/mean returns None
        gain = gain if gain is not None else 0.0
        loss = loss if loss is not None else 0.0
        
        rsi = 100.0 if loss == 0 else 100.0 - (100.0 / (1.0 + (gain / loss)))

        # Handle potential None values for tail elements
        momentum_val = latest["returns"][0]
        momentum = float(momentum_val) if momentum_val is not None else 0.0
        
        volatility_val = df["returns"].std()
        volatility = float(volatility_val) if volatility_val is not None else 0.0

        sma_20_val = latest["sma_20"][0]
        sma_50_val = latest["sma_50"][0]
        price_val = latest["price"][0]
        
        sma_20 = float(sma_20_val / price_val) if (sma_20_val is not None and price_val) else 1.0
        sma_50 = float(sma_50_val / price_val) if (sma_50_val is not None and price_val) else 1.0

        # ── Microstructure Features ─────────────────────────────────────
        micro_kwargs = {}
        has_orderbook = bool(state.bid_vol) and bool(state.ask_vol)

        if has_orderbook and len(state.bid_vol) == len(state.prices):
            micro_df = pl.DataFrame({
                "price": state.prices,
                "volume": state.volumes,
                "bid_vol": state.bid_vol,
                "ask_vol": state.ask_vol,
                "taker_buy_vol": state.taker_buy_vol or [0.0] * len(state.prices),
                "taker_sell_vol": state.taker_sell_vol or [0.0] * len(state.prices),
                "timestamp": state.timestamps,
            })
            micro_df = compute_microstructure_features(micro_df)
            micro_latest = micro_df.tail(1)

            def _safe(col: str) -> float:
                val = micro_latest[col][0]
                return float(val) if val is not None else 0.0

            micro_kwargs = {
                "order_book_imbalance": _safe("order_book_imbalance"),
                "volume_delta": _safe("volume_delta"),
                "cvd_10": _safe("cvd_10"),
                "cvd_50": _safe("cvd_50"),
                "realized_volatility": _safe("realized_volatility"),
            }

        return FeatureVector(
            token_address=state.token_address,
            rsi=float(rsi),
            momentum=momentum,
            volatility=volatility,
            sma_20=sma_20, # Normalized to current price
            sma_50=sma_50,
            **micro_kwargs
        )
