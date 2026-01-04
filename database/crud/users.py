from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database.models import User, UserRole, UserStatus
from database.schemas import users as schema


async def get_users(db: AsyncSession) -> Sequence[User]:
    result = await db.execute(select(User))
    return result.scalars().all()


async def get_user_by_id(db: AsyncSession, id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == id))
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, user: schema.UserCreate) -> User:
    new_user = User(**user.model_dump())
    db.add(new_user)
    
    try:
        await db.commit()
        await db.refresh(new_user)
        return new_user
    except Exception:
        await db.rollback()
        raise


async def update_user(db: AsyncSession, id: int, user: schema.UserUpdate) -> User | None:
    existing_user = await get_user_by_id(db, id)
    
    if not existing_user:
        return None
    
    for key, value in user.model_dump(exclude_unset=True).items():
        setattr(existing_user, key, value)
    
    try:
        await db.commit()
        await db.refresh(existing_user)
        return existing_user
    except Exception:
        await db.rollback()
        raise


async def delete_user(db: AsyncSession, id: int) -> bool:
    user = await get_user_by_id(db, id)
    
    if not user:
        return False
    
    try:
        await db.delete(user)
        await db.commit()
        return True
    except Exception:
        await db.rollback()
        raise


async def update_role(db: AsyncSession, id: int, role: UserRole) -> User | None:
    user = await get_user_by_id(db, id)
    
    if not user:
        return None
    
    user.role = role
    
    try:
        await db.commit()
        await db.refresh(user)
        return user
    except Exception:
        await db.rollback()
        raise


async def update_status(db: AsyncSession, id: int, status: UserStatus) -> User | None:
    user = await get_user_by_id(db, id)
    
    if not user:
        return None
    
    user.status = status
    
    try:
        await db.commit()
        await db.refresh(user)
        return user
    except Exception:
        await db.rollback()
        raise