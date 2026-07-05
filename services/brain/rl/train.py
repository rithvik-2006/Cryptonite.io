import os
import polars as pl
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv
from rl.env import CryptoniteTradingEnv

def train_agent(parquet_or_db_path: str, model_output_path: str = "models/ppo_solana_v2"):
    # 1. Load historical training data
    df = pl.read_parquet(parquet_or_db_path)
    
    # 2. Instantiate Vectorized Gym Environment
    env = DummyVecEnv([lambda: CryptoniteTradingEnv(df)])
    
    # Ensure models directory exists
    os.makedirs(os.path.dirname(model_output_path), exist_ok=True)
    
    # 3. Initialize PPO Agent with MLP architecture
    model = PPO(
        policy="MlpPolicy",
        env=env,
        learning_rate=3e-4,
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.01,
        verbose=1
    )
    
    # 4. Train Model
    print("Beginning offline RL training on Solana tick history...")
    model.learn(total_timesteps=250_000)
    
    # 5. Save serialized weights
    model.save(model_output_path)
    print(f"Model saved successfully to {model_output_path}.zip")

if __name__ == "__main__":
    train_agent("data/historical_solana_features.parquet")
