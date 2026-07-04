from engines.interfaces import BaseForecastEngine, BaseDecisionEngine
from schemas.pipeline_state import FeatureVector, ForecastResult, Decision

class HeuristicForecastEngine(BaseForecastEngine):
    def forecast(self, features: FeatureVector) -> ForecastResult:
        # MVP Rule-based mapping
        if features.rsi < 30 and features.momentum > 0:
            return ForecastResult(token_address=features.token_address, predicted_direction="UP", confidence_score=0.75)
        elif features.rsi > 70 and features.momentum < 0:
            return ForecastResult(token_address=features.token_address, predicted_direction="DOWN", confidence_score=0.80)
        return ForecastResult(token_address=features.token_address, predicted_direction="SIDEWAYS", confidence_score=0.50)

class HeuristicDecisionEngine(BaseDecisionEngine):
    def decide(self, forecast: ForecastResult, features: FeatureVector) -> Decision:
        if forecast.predicted_direction == "UP" and forecast.confidence_score > 0.7:
            return Decision(token_address=forecast.token_address, action="BUY", raw_score=forecast.confidence_score)
        elif forecast.predicted_direction == "DOWN" and forecast.confidence_score > 0.7:
            return Decision(token_address=forecast.token_address, action="SELL", raw_score=forecast.confidence_score)
        return Decision(token_address=forecast.token_address, action="HOLD", raw_score=0.5)
