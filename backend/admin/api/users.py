from fastapi import APIRouter, Depends, HTTPException, status

from admin.api.deps import get_current_admin
from admin.crud import users as crud
from admin.schemas import users as schema
from admin.schemas.users import User

users_router = APIRouter(prefix="/users", tags=["Users"])


@users_router.get("", response_model=schema.Users)
async def get_users(
    _: User = Depends(get_current_admin),
):
    return await crud.get_users()


@users_router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: int,
    _: User = Depends(get_current_admin),
):
    user = await crud.get_user_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return user


@users_router.post("", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: schema.UserCreate,
    _: User = Depends(get_current_admin),
):
    user = await crud.create_user(user_in)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists"
        )

    return user


@users_router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: int,
    user_in: schema.UserUpdate,
    _: User = Depends(get_current_admin),
):
    user = await crud.update_user(user_id, user_in)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return user


@users_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user(user_id: int, _: User = Depends(get_current_admin)):
    deleted = await crud.delete_user(user_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
