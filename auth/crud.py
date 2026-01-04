from datetime import timedelta
import httpx
from fastapi import HTTPException, status
from config import settings, auth
from auth.schemas import UserCreate, UserResponse


class DatabaseClient:
    def __init__(self):
        self.base_url = "http://0.0.0.0:8003"
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=10.0)
    
    async def close(self):
        await self.client.aclose()


db_client = DatabaseClient()


def generate_token(username: str, role: str) -> str:
    return auth.create_access_token(
        uid=username,
        data={"role": role},
        expiry=timedelta(days=7)
    )


async def is_user_exists(username: str) -> bool:
    try:
        response = await db_client.client.get(f"/users/username/{username}")
        return response.status_code == 200
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable"
        )


async def get_user_by_username(username: str) -> UserResponse | None:
    try:
        response = await db_client.client.get(f"/users/username/{username}")
        print(response.content)
        if response.status_code == 404:
            return None
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch user"
            )
        
        return UserResponse.model_validate_json(response.content)
        
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable"
        )


async def get_user_by_credentials(username: str, pin: int) -> UserResponse | None:
    user = await get_user_by_username(username)
    
    if not user or user.pin != pin:
        return None
    
    return user


async def create_user_in_db(user_in: UserCreate) -> UserResponse | None:
    if await is_user_exists(user_in.username):
        return None
    
    try:
        response = await db_client.client.post(
            "/users",
            json=user_in.model_dump()
        )
        
        if response.status_code == 201:
            return UserResponse.model_validate_json(response.content)
        
        return None
        
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable"
        )