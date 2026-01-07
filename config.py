from pydantic_settings import BaseSettings
from authx import AuthX, AuthXConfig


class Settings(BaseSettings):
    PROJECT_NAME: str = "POS System"
    VERSION: str = "1.3"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "sqlite+aiosqlite:///db.sqlite3"
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"
    SECRET_KEY: str = "something"
    ALGORITHM: str = "HS256"
    WHITE_LIST: dict[str, str] = {}  # deprecated

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379


settings = Settings()

config = AuthXConfig(
    JWT_SECRET_KEY=settings.SECRET_KEY,
    JWT_ALGORITHM=settings.ALGORITHM,
    JWT_TOKEN_LOCATION=["headers"],
)

auth = AuthX(config=config)
