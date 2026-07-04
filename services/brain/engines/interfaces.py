from abc import ABC, abstractmethod
from schemas.pipeline_state import FeatureVector, ForecastResult, Decision, RiskReport, Recommendation

class BaseForecastEngine(ABC):
    @abstractmethod
    def forecast(self, features: FeatureVector) -> ForecastResult:
        pass

class BaseDecisionEngine(ABC):
    @abstractmethod
    def decide(self, forecast: ForecastResult, features: FeatureVector) -> Decision:
        pass
