from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Category
from schemas import categories as schema


async def get_categories(db: AsyncSession) -> Sequence[Category]:
    result = await db.execute(select(Category))
    return result.scalars().all()


async def get_category_by_id(db: AsyncSession, id: int) -> Category | None:
    result = await db.execute(select(Category).where(Category.id == id))
    return result.scalar_one_or_none()


async def get_category_by_name(db: AsyncSession, name: str) -> Category | None:
    result = await db.execute(select(Category).where(Category.name == name))
    return result.scalar_one_or_none()


async def create_category(
    db: AsyncSession, category: schema.CategoryCreate
) -> Category:
    new_category = Category(**category.model_dump())
    db.add(new_category)

    try:
        await db.commit()
        await db.refresh(new_category)
        return new_category
    except Exception:
        await db.rollback()
        raise


async def update_category(
    db: AsyncSession, id: int, category: schema.CategoryUpdate
) -> Category | None:
    existing_category = await get_category_by_id(db, id)
    if not existing_category:
        return None

    for key, value in category.model_dump(exclude_unset=True).items():
        setattr(existing_category, key, value)

    try:
        await db.commit()
        await db.refresh(existing_category)
        return existing_category
    except Exception:
        await db.rollback()
        raise


async def delete_category(db: AsyncSession, id: int) -> bool:
    category = await get_category_by_id(db, id)
    if not category:
        return False

    try:
        await db.delete(category)
        await db.commit()
        return True
    except Exception:
        await db.rollback()
        raise
