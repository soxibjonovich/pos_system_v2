from datetime import datetime, timedelta

import httpx
from fastapi import HTTPException, status

from schemas import UserCreate, UserLoginOption, UserResponse
from config import auth, settings


class DatabaseClient:
    def __init__(self):
        self.base_url = settings.DATABASE_SERVICE_URL
        self.timeout = 10.0
    
    def get_client(self):
        return httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout)


db_client = DatabaseClient()


def generate_token(username: str, role: str) -> str:
    return auth.create_access_token(
        uid=username,
        data={"role": role},
        expiry=timedelta(days=7)
    )

async def get_user_by_username(username: str) -> UserResponse | None:
    async with db_client.get_client() as client:
        try:
            response = await client.get(f"/users/username/{username}")
            print(response.content)
            if response.status_code != 200:
                return None
            return UserResponse.model_validate_json(response.content)
            
        except Exception as e:
            raise Exception(e)
	
async def get_active_users() -> list[UserLoginOption]:
    """Get list of active users for login selection"""
    async with db_client.get_client() as client:
        try:
            response = await client.get("/users?status=active")
            if response.status_code != 200:
                return []
            
            data = response.json()
            
            return [
                UserLoginOption.model_validate(user)
                for user in data
            ]
            
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service unavailable"
            )
        except Exception:
            return []


async def get_user_by_id(user_id: int) -> UserResponse | None:
    async with db_client.get_client() as client:
        try:
            response = await client.get(f"/users/{user_id}")
            
            if response.status_code == 404:
                return None
            
            if response.status_code != 200:
                return None
            
            return UserResponse.model_validate(response.json())
            
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service unavailable"
            )
        except Exception:
            return None


async def get_user_by_credentials(user_id: int, pin: int) -> UserResponse | None:
    user = await get_user_by_id(user_id)
    
    if not user or user.pin != pin:
        return None
    
    return user


async def create_user_in_db(user_in: UserCreate) -> UserResponse | None:
    async with db_client.get_client() as client:
        try:
            response = await client.post("/users", json=user_in.model_dump())
            
            if response.status_code == 201:
                return UserResponse.model_validate(response.json())
            
            return None
            
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service unavailable"
            )
        except Exception:
            return None
            
async def update_last_login(id: int, username: str) -> bool:
    async with db_client.get_client() as client:
        try:
            response = await client.put(f"/users/{id}", json={"id": id, "username": username, "last_login": datetime.utcnow().isoformat()})
            print(response.content)
            if response.status_code == 200:
                return True
            else:
                return False
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service unavailable"
            )
        except Exception as e:
            print(e)
            return False
	