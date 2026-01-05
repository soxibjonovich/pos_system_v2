from authx import TokenPayload
from fastapi import Depends, HTTPException, status
from order import crud
from order.schemas import User
from config import auth
from enum import Enum


class UserRole(Enum):
    ADMIN = "admin"
    STAFF = "staff"


async def get_current_user(
    token: TokenPayload = Depends(auth.access_token_required),
) -> User:
    try:
        username: str = token.sub
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = await crud.get_user_by_username(username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or not authorized",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return user

    except HTTPException:
        raise
    except Exception as e:
        print(
            f"Auth error: {e}"
        )  # Log it for debugging (but make sure to sanitize any sensitive info)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def has_role(current_user: User, required_roles: list[UserRole]):
    if current_user.role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )
    return current_user


async def get_current_staff(current_user: User = Depends(get_current_user)) -> User:
    return await has_role(current_user, [UserRole.STAFF.value])
