import numpy as np
import logging
import os
from stable_baselines3 import PPO
from engines.interfaces import BaseDecisionEngine
from schemas.pipeline_state import ForecastResult, FeatureVector, Decision

logger = logging.getLogger(__name__)

class ReinforcementLearningDecisionEngine(BaseDecisionEngine):
    def __init__(self, model_path: str = "models/ppo_solana_v2"):
        # Load serialized PPO model weights into memory on startup
        self.model_path = model_path
        self.model = None
        self.positions = {} 
        
        if os.path.exists(model_path + ".zip"):
            self.model = PPO.load(model_path)
            logger.info(f"Loaded RL model from {model_path}.zip")
        else:
            logger.warning(f"RL model not found at {model_path}.zip")

    def decide(self, forecast: ForecastResult, features: FeatureVector) -> Decision:
        if self.model is None:
            return Decision(token_address=features.token_address, action="HOLD", raw_score=0.5)

        token = features.token_address
        current_pos = self.positions.get(token, 0.0)
        
        # 1. Format live Polars feature vector into RL observation tensor
        obs = np.array(features.to_rl_state(current_position=current_pos), dtype=np.float32)
        
        # 2. Predict deterministic action and extract probability distribution
        action, _states = self.model.predict(obs, deterministic=True)
        
        # Extract underlying action network logits/probabilities for confidence score
        obs_tensor = self.model.policy.obs_to_tensor(obs)[0]
        dis = self.model.policy.get_distribution(obs_tensor)
        probs = dis.distribution.probs.detach().cpu().numpy()[0]
        confidence = float(probs[action])

        # 3. Map action integer back to strict Pydantic literal contract
        if action == 1:
            action_str = "BUY"
            self.positions[token] = 1.0
        elif action == 2:
            action_str = "SELL"
            self.positions[token] = 0.0
        else:
            action_str = "HOLD"

        return Decision(
            token_address=token,
            action=action_str,
            raw_score=confidence
        )
