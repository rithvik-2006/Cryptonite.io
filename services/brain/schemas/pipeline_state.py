from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import datetime

class MarketState(BaseModel):
    token_address: str
    prices: List[float]
    volumes: List[float]
    timestamps: List[int]
    # Microstructure raw data (optional — defaults for backward compat)
    bid_vol: List[float] = Field(default_factory=list)
    ask_vol: List[float] = Field(default_factory=list)
    taker_buy_vol: List[float] = Field(default_factory=list)
    taker_sell_vol: List[float] = Field(default_factory=list)

class FeatureVector(BaseModel):
    token_address: str
    rsi: float
    momentum: float
    volatility: float
    sma_20: float
    sma_50: float
    # Microstructure features
    order_book_imbalance: float = 0.0   # [-1, 1] buy/sell depth ratio
    volume_delta: float = 0.0           # taker buy - taker sell pressure
    cvd_10: float = 0.0                 # cumulative volume delta (10-bar)
    cvd_50: float = 0.0                 # cumulative volume delta (50-bar)
    realized_volatility: float = 0.0    # Garman-Klass proxy (rolling std of returns)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    def to_rl_state(self, current_position: float = 0.0) -> List[float]:
        """Flatten feature vector into an RL state observation array (11 dims)."""
        return [
            self.rsi / 100.0,              # Normalized 0.0 - 1.0
            self.momentum,
            self.volatility,
            self.sma_20,
            self.sma_50,
            self.order_book_imbalance,      # Already [-1, 1]
            self.volume_delta,              # Z-score normalized upstream
            self.cvd_10,                    # Z-score normalized upstream
            self.cvd_50,                    # Z-score normalized upstream
            self.realized_volatility,
            current_position               # 0.0 (Flat) or 1.0 (Long)
        ]

class ForecastResult(BaseModel):
    token_address: str
    predicted_direction: Literal["UP", "DOWN", "SIDEWAYS"]
    confidence_score: float  # 0.0 to 1.0

class Decision(BaseModel):
    token_address: str
    action: Literal["BUY", "SELL", "HOLD"]
    raw_score: float

class RiskReport(BaseModel):
    token_address: str
    action: Literal["BUY", "SELL", "HOLD"]
    is_approved: bool
    adjusted_confidence: float
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]

class Recommendation(BaseModel):
    token_address: str
    action: Literal["BUY", "SELL", "HOLD"]
    confidence: float
    risk_level: str
    reasons: List[str]
    timestamp: int
