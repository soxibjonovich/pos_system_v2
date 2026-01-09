import redis.asyncio as redis
from typing import Optional
from config import settings


class RedisClient:
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self.host = settings.REDIS_HOST
        self.port = settings.REDIS_PORT

    async def connect(self):
        self.redis = await redis.from_url(
            f"redis://{self.host}:{self.port}", encoding="utf-8", decode_responses=True
        )

    async def close(self):
        if self.redis:
            await self.redis.close()

    async def set_token(self, username: str, token: str, expire_seconds: int = None):
        if expire_seconds is None:
            expire_seconds = settings.TOKEN_EXPIRE_DAYS * 24 * 60 * 60

        await self.redis.setex(f"token:{username}", expire_seconds, token)

    async def get_token(self, username: str) -> str | None:
        return await self.redis.get(f"token:{username}")

    async def delete_token(self, username: str) -> bool:
        result = await self.redis.delete(f"token:{username}")
        return result > 0

    async def token_exists(self, username: str) -> bool:
        return await self.redis.exists(f"token:{username}") > 0

    async def set_value(self, key: str, value: str, expire_seconds: int = None):
        if expire_seconds:
            await self.redis.setex(key, expire_seconds, value)
        else:
            await self.redis.set(key, value)

    async def get_value(self, key: str) -> str | None:
        return await self.redis.get(key)

    async def delete_value(self, key: str) -> bool:
        result = await self.redis.delete(key)
        return result > 0

    async def exists(self, key: str) -> bool:
        return await self.redis.exists(key) > 0

    async def set_hash(self, name: str, mapping: dict):
        await self.redis.hset(name, mapping=mapping)

    async def get_hash(self, name: str) -> dict:
        return await self.redis.hgetall(name)

    async def delete_hash(self, name: str) -> bool:
        result = await self.redis.delete(name)
        return result > 0

    async def ping(self) -> bool:
        try:
            return await self.redis.ping()
        except Exception:
            return False


redis_client = RedisClient()
