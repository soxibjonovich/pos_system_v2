from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Product
from schemas import products as schema
from rabbitmq_client import rabbitmq_client


async def get_products(db: AsyncSession) -> Sequence[Product]:
    result = await db.execute(select(Product))
    return result.scalars().all()


async def get_product_by_id(db: AsyncSession, id: int) -> Product | None:
    result = await db.execute(select(Product).where(Product.id == id))
    return result.scalar_one_or_none()


async def create_product(db: AsyncSession, product: schema.ProductCreate) -> Product:
    new_product = Product(**product.model_dump())
    db.add(new_product)

    try:
        await db.commit()
        await db.refresh(new_product)

        # Publish event to RabbitMQ
        await rabbitmq_client.publish(
            "product.created",
            {
                "action": "created",
                "product_id": new_product.id,
                "title": new_product.title,
                "price": float(new_product.price),
                "quantity": new_product.quantity,
            },
        )

        return new_product
    except Exception:
        await db.rollback()
        raise


async def update_product(
    db: AsyncSession, product_id: int, product: schema.Product
) -> Product | None:
    existing_product = await get_product_by_id(db, product_id)

    if not existing_product:
        return None

    for key, value in product.model_dump(exclude_unset=True).items():
        setattr(existing_product, key, value)

    try:
        await db.commit()
        await db.refresh(existing_product)

        # Publish event
        await rabbitmq_client.publish(
            "product.updated",
            {
                "action": "updated",
                "product_id": existing_product.id,
                "title": existing_product.title,
                "price": float(existing_product.price),
                "quantity": existing_product.quantity,
            },
        )

        return existing_product
    except Exception:
        await db.rollback()
        raise


async def delete_product(db: AsyncSession, product_id: int) -> bool:
    product = await get_product_by_id(db, product_id)

    if not product:
        return False

    try:
        await db.delete(product)
        await db.commit()

        # Publish event
        await rabbitmq_client.publish(
            "product.deleted",
            {
                "action": "deleted",
                "product_id": product_id,
            },
        )

        return {"message": "Product deleted successfully", "id": id}
    except Exception:
        await db.rollback()
        raise
