from contextlib import asynccontextmanager
from datetime import timedelta

from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
from authx import TokenPayload
from fastapi import Depends, FastAPI, HTTPException, status

from auth import schemas as auth_schemas
from auth.crud import create_user_in_db, get_user_by_credentials
from auth.deps import get_current_user
from config import auth, settings
from database.models import User

redis_client = redis.from_url(
    f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}", decode_responses=True
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("✅ Auth Service started on port 8001")
    yield
    await redis_client.close()
    print("👋 Auth Service stopped")


auth_app = FastAPI(title="Auth Microservice", version="1.7", lifespan=lifespan)

auth_app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@auth_app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "auth"}


@auth_app.post(
    "/register",
    response_model=auth_schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Authentication"],
)
async def register(user_in: auth_schemas.UserCreate):
    user = await create_user_in_db(user_in)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    return user


@auth_app.post(
    "/login",
    response_model=auth_schemas.TokenResponse,
    status_code=status.HTTP_200_OK,
    tags=["Authentication"],
)
async def login(user_in: auth_schemas.UserLogin):
    user = await get_user_by_credentials(user_in.username, user_in.pin)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or pin"
        )

    token = auth.create_access_token(
        uid=user.username, data={"role": user.role}, expiry=timedelta(minutes=18060)
    )

    await redis_client.setex(f"token:{user.username}", 18060, token)

    return auth_schemas.TokenResponse(
        access_token=token, token_type="bearer", expires_at=7, role=user.role
    )


@auth_app.post(
    "/verify",
    tags=["Authentication"],
    summary="Verify token (microservice-to-microservice)",
)
async def verify_token(payload: TokenPayload = Depends(auth.access_token_required)):
    username = payload.sub

    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing subject (sub)",
        )

    token_exists = await redis_client.exists(f"token:{username}")

    if not token_exists:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked or session expired",
        )

    return {
        "valid": True,
        "username": username,
        "role": getattr(payload, "role", "user"),  # Safe access to custom claims
    }


@auth_app.post("/logout", status_code=status.HTTP_200_OK, tags=["Authentication"])
async def logout(current_user: User = Depends(get_current_user)):
    await redis_client.delete(f"token:{current_user.username}")
    return {"status": "ok"}

def run_auth():
    import uvicorn

    uvicorn.run("auth:auth_app", host="0.0.0.0", port=8003, log_level="error")


if __name__ == "__main__":
    run_auth()
