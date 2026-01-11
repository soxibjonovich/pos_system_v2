import httpx
from fastapi import HTTPException, status

from schemas import users as schema
from schemas.users import User, Users

from config import settings


class ServiceClient:
    def __init__(self):
        self.db_client = httpx.AsyncClient(
            base_url=settings.DATABASE_SERVICE_URL, timeout=10.0
        )
        self.auth_client = httpx.AsyncClient(
            base_url=settings.AUTH_SERVICE_URL, timeout=10.0
        )

    async def close(self):
        await self.db_client.aclose()
        await self.auth_client.aclose()


service_client = ServiceClient()


async def verify_token(token: str) -> dict | None:
    try:
        response = await service_client.auth_client.post(
            "/verify", headers={"Authorization": f"Bearer {token}"}
        )

        if response.status_code == 200:
            return response.json()

        return None

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service unavailable",
        )
    except Exception:
        return None


async def is_user_exists(username: str) -> bool:
    try:
        response = await service_client.db_client.get(f"/users/username/{username}")
        return response.status_code == 200
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return False


async def get_users() -> Users:
    try:
        response = await service_client.db_client.get("/users")

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch users",
            )

        return Users.model_validate_json(response.content)

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching users: {str(e)}",
        )


async def get_user_by_username(username: str) -> User | None:
    try:
        response = await service_client.db_client.get(f"/users/username/{username}")

        if response.status_code == 404:
            return None

        if response.status_code != 200:
            return None

        return User.model_validate_json(response.content)

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except HTTPException:
        raise
    except Exception:
        return None


async def get_user_by_credentials(username: str, pin: int) -> User | None:
    user = await get_user_by_username(username)

    if not user or user.pin != pin:
        return None

    return user


async def get_user_by_id(user_id: int) -> User | None:
    try:
        response = await service_client.db_client.get(f"/users/{user_id}")

        if response.status_code == 404:
            return None

        if response.status_code != 200:
            return None

        return User.model_validate_json(response.content)

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return None


async def create_user(user_in: schema.UserCreate, role: str = "cashier") -> User | None:
    """Create a new user with specified role (default: cashier)"""
    if await is_user_exists(user_in.username):
        return None

    try:
        # Add role to the user data
        user_data = user_in.model_dump()
        user_data["role"] = role

        response = await service_client.db_client.post("/users", json=user_data)

        if response.status_code == 201:
            return User.model_validate_json(response.content)

        return None

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return None


async def create_admin(user_in: schema.UserCreate) -> User | None:
    """Create a new administrator user"""
    return await create_user(user_in, role="admin")


async def update_user(user_id: int, user_in: schema.UserUpdate) -> User | None:
    """Update user details"""
    try:
        response = await service_client.db_client.put(
            f"/users/{user_id}", json=user_in.model_dump(exclude_unset=True)
        )

        if response.status_code == 404:
            return None

        if response.status_code == 200:
            return User.model_validate_json(response.content)

        return None

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return None


async def update_user_role(user_id: int, role: str) -> User | None:
    """Update only the user's role"""
    try:
        response = await service_client.db_client.put(
            f"/users/{user_id}", json={"role": role}
        )

        if response.status_code == 404:
            return None

        if response.status_code == 200:
            return User.model_validate_json(response.content)

        return None

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user role: {str(e)}",
        )


async def delete_user(user_id: int) -> bool:
    """Delete a user"""
    try:
        response = await service_client.db_client.delete(f"/users/{user_id}")
        return response.status_code == 204

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return False