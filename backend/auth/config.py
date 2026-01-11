from pydantic_settings import BaseSettings
from authx import AuthX, AuthXConfig
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "POS System"
    VERSION: str = "1.0.0"
    
    # Service URLs
    DATABASE_SERVICE_URL: str = os.getenv("DATABASE_SERVICE_URL", "http://localhost:8002")
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://localhost:8003")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./pos_system.db")
    
    # Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    TOKEN_EXPIRE_DAYS: int = int(os.getenv("TOKEN_EXPIRE_DAYS", "7"))
    
    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    
    # RabbitMQ
    RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

# Only create auth if SECRET_KEY is available
try:
    config = AuthXConfig(
        JWT_SECRET_KEY=settings.SECRET_KEY,
        JWT_ALGORITHM=settings.ALGORITHM,
        JWT_TOKEN_LOCATION=["headers"],
    )
    auth = AuthX(config=config)
except:
    auth = None