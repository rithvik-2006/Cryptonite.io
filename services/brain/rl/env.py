import gymnasium as gym
from gymnasium import spaces
import numpy as np
import polars as pl

class CryptoniteTradingEnv(gym.Env):
    metadata = {'render_modes': ['human']}

    def __init__(self, historical_features: pl.DataFrame, initial_balance: float = 10000.0):
        super().__init__()
        self.df = historical_features
        self.initial_balance = initial_balance
        
        # Actions: 0 = HOLD, 1 = BUY, 2 = SELL
        self.action_space = spaces.Discrete(3)
        
        # State: [RSI, Momentum, Volatility, SMA_20, SMA_50,
        #         OBI, Volume_Delta, CVD_10, CVD_50, Realized_Vol,
        #         Current_Position]
        self.observation_space = spaces.Box(
            low=-np.inf, high=np.inf, shape=(11,), dtype=np.float32
        )
        
        self.reset()

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.current_step = 0
        self.balance = self.initial_balance
        self.position = 0.0  # 0.0 = Flat, 1.0 = Holding Asset
        self.entry_price = 0.0
        return self._get_obs(), {}

    def _get_obs(self):
        row = self.df.row(self.current_step, named=True)
        return np.array([
            row["rsi"] / 100.0,
            row["momentum"],
            row["volatility"],
            row["sma_20"],
            row["sma_50"],
            row.get("order_book_imbalance", 0.0),
            row.get("volume_delta", 0.0),
            row.get("cvd_10", 0.0),
            row.get("cvd_50", 0.0),
            row.get("realized_volatility", 0.0),
            self.position
        ], dtype=np.float32)

    def step(self, action):
        row = self.df.row(self.current_step, named=True)
        current_price = row["price"]
        reward = 0.0
        fee_penalty = 0.003 # 30bps DEX slippage assumption

        # Execute Action Logic
        if action == 1 and self.position == 0.0:  # BUY
            self.position = 1.0
            self.entry_price = current_price
            reward -= fee_penalty
            
        elif action == 2 and self.position == 1.0:  # SELL
            pnl = (current_price - self.entry_price) / self.entry_price
            reward += pnl - fee_penalty
            self.position = 0.0
            
        elif self.position == 1.0:  # HOLDING LONG
            # Unrealized step return penalized by volatility
            step_return = row["momentum"]
            reward += step_return - (0.5 * row["volatility"])

        self.current_step += 1
        terminated = self.current_step >= len(self.df) - 1
        truncated = False
        
        return self._get_obs(), float(reward), terminated, truncated, {}
