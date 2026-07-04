import time
from schemas.pipeline_state import Decision, FeatureVector, RiskReport, Recommendation

class RiskEngine:
    def evaluate(self, decision: Decision, features: FeatureVector) -> RiskReport:
        # Volatility check filter
        risk_level = "LOW"
        is_approved = True
        adjusted_confidence = decision.raw_score

        if features.volatility > 0.05: # High intra-period volatility threshold
            risk_level = "HIGH"
            if decision.action == "BUY":
                adjusted_confidence *= 0.8  # Haircut confidence for high risk assets
        elif features.volatility > 0.02:
            risk_level = "MEDIUM"

        return RiskReport(
            token_address=decision.token_address,
            action=decision.action,
            is_approved=is_approved,
            adjusted_confidence=adjusted_confidence,
            risk_level=risk_level
        )

class ExplainabilityEngine:
    @staticmethod
    def generate_reasons(features: FeatureVector, risk: RiskReport) -> list[str]:
        reasons = []
        if features.rsi < 35:
            reasons.append("Asset is currently oversold on relative strength indicators.")
        elif features.rsi > 65:
            reasons.append("Asset shows overbought characteristics.")
            
        if features.momentum > 0:
            reasons.append("Positive short-term directional acceleration detected.")
            
        if risk.risk_level == "HIGH":
            reasons.append("Risk parameters adjusted due to anomalous historical pool volatility.")
        else:
            reasons.append("Asset volatility profile falls safely within baseline parameters.")
            
        return reasons
