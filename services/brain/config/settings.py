from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379/0"
    config_path: str = "config/brain_config.yaml"
    log_level: str = "INFO"

    class Config:
        env_prefix = "BRAIN_"

settings = Settings()
