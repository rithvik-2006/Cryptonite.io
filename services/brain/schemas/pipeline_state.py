from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import datetime

class MarketState(BaseModel):
    token_address: str
    prices: List[float]
    volumes: List[float]
    timestamps: List[int]

class FeatureVector(BaseModel):
    token_address: str
    rsi: float
    momentum: float
    volatility: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

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
