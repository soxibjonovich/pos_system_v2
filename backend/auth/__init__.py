from contextlib import asynccontextmanager

import schemas as auth_schemas
from authx.exceptions import AuthXException, MissingTokenError, NoAuthorizationError
from config import auth, settings
from crud import (
    create_user_in_db,
    get_active_users,
    get_user_by_credentials,
    update_last_login,
)
from deps import get_current_user
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from redis_client import redis_client
from schemas import UserResponse as User


@asynccontextmanager
async def lifespan(app: FastAPI):
    await redis_client.connect()
    yield
    await redis_client.close()


auth_app = FastAPI(title="Auth Microservice", version="1.7", lifespan=lifespan)

auth_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@auth_app.get(
    "/users/login-options",
    response_model=auth_schemas.UserLoginOptionsResponse,
    tags=["Authentication"],
)
async def get_login_options():
    """Get list of active users for login selection"""
    users = await get_active_users()
    return auth_schemas.UserLoginOptionsResponse(users=users)


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
    user = await get_user_by_credentials(user_in.user_id, user_in.pin)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    from datetime import timedelta

    token = auth.create_access_token(
        uid=user.username, data={"role": user.role}, expiry=timedelta(days=7)
    )

    await redis_client.set_token(user.username, token)
    await update_last_login(user.id, user.username)
    return auth_schemas.TokenResponse(
        access_token=token, role=user.role, token_type="bearer", expires_at=7
    )


@auth_app.post(
    "/verify", tags=["Authentication"], summary="Verify token (for other microservices)"
)
async def verify_token(request: Request):
    authorization = request.headers.get("Authorization")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )

    token = authorization.replace("Bearer ", "")

    try:
        import jwt

        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        username = payload.get("sub")

        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            )

        token_exists = await redis_client.token_exists(username)

        if not token_exists:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token not found or expired",
            )

        return {"valid": True, "username": username, "role": payload.get("role")}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )


@auth_app.post("/logout", status_code=status.HTTP_200_OK, tags=["Authentication"])
async def logout(current_user: User = Depends(get_current_user)):
    await redis_client.delete_token(current_user.username)
    return {"status": "ok"}


@auth_app.get("/health", tags=["Health"])
async def health():
    redis_status = await redis_client.ping()
    return {
        "status": "ok",
        "service": "auth",
        "redis": "connected" if redis_status else "disconnected",
    }


# Exception handler for missing token
@auth_app.exception_handler(MissingTokenError)
async def missing_token_handler(request: Request, exc: MissingTokenError):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": "Access denied: Missing or invalid authentication token"},
        headers={"WWW-Authenticate": "Bearer"},
    )


# Exception handler for invalid token
@auth_app.exception_handler(AuthXException)
async def invalid_token_handler(request: Request, exc: AuthXException):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": "Access denied: Invalid or expired token"},
        headers={"WWW-Authenticate": "Bearer"},
    )


# Optional: Catch all other AuthX errors
@auth_app.exception_handler(NoAuthorizationError)
async def authx_error_handler(request: Request, exc: NoAuthorizationError):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": "Access denied: Authentication failed"},
        headers={"WWW-Authenticate": "Bearer"},
    )


def run_auth():
    import uvicorn

    uvicorn.run(
        "auth:auth_app", host="0.0.0.0", port=8003, log_level="error", reload=True
    )


if __name__ == "__main__":
    run_auth()
