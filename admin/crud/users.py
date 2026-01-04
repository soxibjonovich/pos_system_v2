import httpx
from fastapi import HTTPException, status

from admin.schemas.users import User, Users

client = httpx.AsyncClient(base_url="http://127.0.0.1:8003")

async def verify_token(token: str) -> bool:
    try:
        tempclient = httpx.AsyncClient(base_url="http://127.0.0.1:8001")
        response = await tempclient.post("/verify", headers={"Authorization": f"Bearer {token}"})
    except:
        ...
	

async def is_user_exists(username: str) -> bool:
    try:
        response = await client.get(f"/users/user/{username}")
        if not response.status_code == 200:
            return False
        return True
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

async def get_users():
    try:
        response = await client.get("/users")
        return Users.model_validate_json(response.content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e
        )
	

async def get_user(username: str, pin: int) -> User:
    user = await get_user_by_username(username)
    if not user.pin == pin:
        raise HTTPException(status_code=404, detail="User not found")
    return user


async def get_user_by_username(username: str) -> User | None:
    try:
        response = await client.get(f"/users/username/{username}")
        return User.model_validate_json(response.content)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
