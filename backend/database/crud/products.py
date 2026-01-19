from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Product
from schemas import products as schema
from rabbitmq_client import rabbitmq_client


async def get_products(db: AsyncSession) -> Sequence[Product]:
    """Get all products"""
    result = await db.execute(select(Product))
    return result.scalars().all()


async def get_product_by_id(db: AsyncSession, id: int) -> Product | None:
    """Get product by ID"""
    result = await db.execute(select(Product).where(Product.id == id))
    return result.scalar_one_or_none()


async def get_product_by_title(db: AsyncSession, title: str) -> Product | None:
    """Get product by title (for duplicate check)"""
    result = await db.execute(select(Product).where(Product.title == title))
    return result.scalar_one_or_none()


async def create_product(db: AsyncSession, product: schema.ProductCreate) -> Product:
    """Create a new product"""
    new_product = Product(**product.model_dump())
    db.add(new_product)

    try:
        await db.commit()
        await db.refresh(new_product)

        # Publish event to RabbitMQ
        try:
            await rabbitmq_client.publish(
                "product.created",
                {
                    "action": "created",
                    "product_id": new_product.id,
                    "title": new_product.title,
                    "category_id": new_product.category_id,
                    "price": float(new_product.price) if new_product.price else 0,
                    "cost": float(new_product.cost) if new_product.cost else None,
                    "quantity": new_product.quantity,
                    "is_active": new_product.is_active,
                },
            )
        except Exception as e:
            print(f"⚠️  Failed to publish product.created event: {e}")

        return new_product
    except Exception:
        await db.rollback()
        raise


async def update_product(
    db: AsyncSession, product_id: int, product: schema.ProductUpdate
) -> Product | None:
    """Update an existing product"""
    existing_product = await get_product_by_id(db, product_id)
    if not existing_product:
        return None

    # Store old values for event
    old_values = {
        "price": float(existing_product.price) if existing_product.price else 0,
        "quantity": existing_product.quantity,
        "is_active": existing_product.is_active,
        "category_id": existing_product.category_id,
    }

    # Update only provided fields
    for key, value in product.model_dump(exclude_unset=True).items():
        setattr(existing_product, key, value)

    try:
        await db.commit()
        await db.refresh(existing_product)

        # Publish event
        try:
            event_data = {
                "action": "updated",
                "product_id": existing_product.id,
                "title": existing_product.title,
                "category_id": existing_product.category_id,
                "price": float(existing_product.price) if existing_product.price else 0,
                "cost": float(existing_product.cost) if existing_product.cost else None,
                "quantity": existing_product.quantity,
                "is_active": existing_product.is_active,
            }

            # Add change flags
            if old_values["price"] != event_data["price"]:
                event_data["price_changed"] = True
                event_data["old_price"] = old_values["price"]
                event_data["new_price"] = event_data["price"]

            if old_values["quantity"] != event_data["quantity"]:
                event_data["quantity_changed"] = True
                event_data["old_quantity"] = old_values["quantity"]
                event_data["new_quantity"] = event_data["quantity"]

            if old_values["is_active"] != event_data["is_active"]:
                event_data["status_changed"] = True
                event_data["old_status"] = (
                    "active" if old_values["is_active"] else "inactive"
                )
                event_data["new_status"] = (
                    "active" if event_data["is_active"] else "inactive"
                )

            if old_values["category_id"] != event_data["category_id"]:
                event_data["category_changed"] = True
                event_data["old_category_id"] = old_values["category_id"]
                event_data["new_category_id"] = event_data["category_id"]

            await rabbitmq_client.publish("product.updated", event_data)
        except Exception as e:
            print(f"⚠️  Failed to publish product.updated event: {e}")

        return existing_product
    except Exception:
        await db.rollback()
        raise


async def delete_product(db: AsyncSession, product_id: int) -> bool:
    """Delete a product"""
    product = await get_product_by_id(db, product_id)
    if not product:
        return False

    # Store product info for event
    product_info = {
        "product_id": product.id,
        "title": product.title,
        "price": float(product.price) if product.price else 0,
        "category_id": product.category_id,
    }

    try:
        await db.delete(product)
        await db.commit()

        # Publish event
        try:
            await rabbitmq_client.publish(
                "product.deleted",
                {
                    "action": "deleted",
                    **product_info,
                },
            )
        except Exception as e:
            print(f"⚠️  Failed to publish product.deleted event: {e}")

        return True
    except Exception:
        await db.rollback()
        raise
