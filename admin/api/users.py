from fastapi import APIRouter, Depends

from sqlalchemy.ext.asyncio.session import AsyncSession

from admin.api.deps import get_current_admin
from admin.crud import users as crud
from admin.schemas import users as schema
from admin.schemas.users import User


users_router = APIRouter(prefix="/users", tags=["Users"])


@users_router.get("/")
async def get_users(
    _: User = Depends(get_current_admin),
):
    users = await crud.get_users()
    return users


# @users_router.put("/user")
# async def update_user(
#     user: schema.UserUpdate,
#     _: User = Depends(get_current_admin),
# ):
#     user = await crud.update_user(db, user)
#     return user


# @users_router.delete("/user")
# async def remove_user(
#     id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)
# ):
#     await crud.delete_user(db, id)
#     return {"status": "ok"}
