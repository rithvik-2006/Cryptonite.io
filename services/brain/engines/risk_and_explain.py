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
            
        if features.sma_20 > features.sma_50:
            reasons.append("SMA-20 crossed above SMA-50 \u2014 bullish golden cross.")
        elif features.sma_20 < features.sma_50:
            reasons.append("SMA-20 crossed below SMA-50 \u2014 bearish death cross.")
            
        if risk.risk_level == "HIGH":
            reasons.append("Risk parameters adjusted due to anomalous historical pool volatility.")
        else:
            reasons.append("Asset volatility profile falls safely within baseline parameters.")

        # ── Microstructure Explanations ────────────────────────────────
        if features.order_book_imbalance > 0.3:
            reasons.append("Order book shows strong buy-side depth accumulation.")
        elif features.order_book_imbalance < -0.3:
            reasons.append("Sell-side order book pressure detected — thin buy support.")

        if features.volume_delta > 1.5:
            reasons.append("Aggressive taker buy flow significantly exceeds sells.")
        elif features.volume_delta < -1.5:
            reasons.append("Taker sell pressure dominates — distribution phase likely.")

        if abs(features.cvd_10) > 2.0:
            direction = "bullish" if features.cvd_10 > 0 else "bearish"
            reasons.append(f"Short-term CVD divergence signals {direction} order flow conviction.")

        if features.realized_volatility > 0.04:
            reasons.append("Realized volatility regime shift detected — elevated intraday variance.")

        return reasons
