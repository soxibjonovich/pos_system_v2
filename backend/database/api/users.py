from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import get_db
from database.crud import users as users_crud
from database.schemas import users as users_schema

user_router = APIRouter()


@user_router.get("", response_model=list[users_schema.UserResponse])
async def get_users(db: AsyncSession = Depends(get_db)):
    return await users_crud.get_users(db)

@user_router.get("")
async def get_usernames(status: str, db: AsyncSession = Depends(get_db)):
    usernames = await users_crud.get_usernames(db, status)
    return usernames
	 
@user_router.get("/username/{username}", response_model=users_schema.UserResponse)
async def get_user_by_username(username: str, db: AsyncSession = Depends(get_db)):
    user = await users_crud.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@user_router.get("/{id}", response_model=users_schema.UserResponse)
async def get_user_by_id(id: int, db: AsyncSession = Depends(get_db)):
    user = await users_crud.get_user_by_id(db, id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@user_router.post(
    "", response_model=users_schema.UserResponse, status_code=status.HTTP_201_CREATED
)
async def create_user(
    user: users_schema.UserCreate, db: AsyncSession = Depends(get_db)
):
    return await users_crud.create_user(db, user)


@user_router.put("/{id}", response_model=users_schema.UserResponse)
async def update_user(
    id: int,
    user: users_schema.UserUpdate,
    db: AsyncSession = Depends(get_db),
):
    updated_user = await users_crud.update_user(db, id, user)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user


@user_router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user(id: int, db: AsyncSession = Depends(get_db)):
    deleted = await users_crud.delete_user(db, id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
