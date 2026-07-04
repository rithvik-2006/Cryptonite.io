import polars as pl
from schemas.pipeline_state import MarketState, FeatureVector

class FeatureEngine:
    @staticmethod
    def compute(state: MarketState) -> FeatureVector:
        # Wrap raw lists into a zero-copy Polars DataFrame
        df = pl.DataFrame({
            "price": state.prices,
            "volume": state.volumes
        })
        
        if len(df) < 2:
            return FeatureVector(token_address=state.token_address, rsi=50.0, momentum=0.0, volatility=0.0)

        # 1. Momentum (Simple Rate of Change)
        returns = df["price"].pct_change()
        momentum = returns.tail(1)[0] if returns.tail(1)[0] is not None else 0.0

        # 2. Volatility (Standard deviation of returns)
        volatility = returns.std() if returns.std() is not None else 0.0

        # 3. Quick Heuristic RSI (Relative Strength Index)
        df = df.with_columns(
            pl.col("price").diff().alias("diff")
        ).with_columns(
            pl.when(pl.col("diff") > 0).then(pl.col("diff")).otherwise(0.0).alias("gain"),
            pl.when(pl.col("diff") < 0).then(-pl.col("diff")).otherwise(0.0).alias("loss")
        )
        
        avg_gain = df["gain"].mean()
        avg_gain = avg_gain if avg_gain is not None else 0.0
        
        avg_loss = df["loss"].mean()
        avg_loss = avg_loss if avg_loss is not None else 0.0
        
        if avg_loss == 0:
            rsi = 100.0 if avg_gain > 0 else 50.0
        else:
            rs = avg_gain / avg_loss
            rsi = 100.0 - (100.0 / (1.0 + rs))

        return FeatureVector(
            token_address=state.token_address,
            rsi=float(rsi),
            momentum=float(momentum),
            volatility=float(volatility)
        )
