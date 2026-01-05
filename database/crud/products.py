from typing import Sequence

from fastapi import status, HTTPException

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Product
from database.schemas import products as schema


async def get_products(db: AsyncSession) -> Sequence[Product]:
    result = await db.execute(select(Product))
    return result.scalars().all()


async def get_product_by_id(db: AsyncSession, id: int) -> Product | None:
    result = await db.execute(select(Product).where(Product.id == id))
    return result.scalar_one_or_none()


async def create_product(
    db: AsyncSession, product_data: schema.ProductCreate
) -> Product:
    product = Product(**product_data.model_dump())
    db.add(product)

    try:
        await db.commit()
        await db.refresh(product)
        return product
    except Exception:
        await db.rollback()
        raise


async def update_product(db: AsyncSession, product: schema.Product) -> Product:
    old_product = await get_product_by_id(db, product.id)
    if not old_product:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Owner is not found."
        )
    for key, value in product.model_dump().items():
        setattr(old_product, key, value)
    await db.commit()
    await db.refresh(old_product)

    return old_product


async def delete_product(db: AsyncSession, id: int):
    """Удалить продукт по ID. Возвращает результат операции."""
    product = await get_product_by_id(db, id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found."
        )

    # Удаление
    await db.delete(product)
    await db.commit()

    return {"message": "Product deleted successfully", "id": id}
