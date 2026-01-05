from typing import Sequence
from fastapi import status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models import Order, OrderItem, Product, User
from database.schemas import order as schema


# Get all orders
async def get_orders(db: AsyncSession) -> Sequence[Order]:
    result = await db.execute(select(Order))
    return result.scalars().all()


# Get a single order by its ID
async def get_order_by_id(db: AsyncSession, id: int) -> Order | None:
    result = await db.execute(select(Order).where(Order.id == id))
    return result.scalar_one_or_none()


# Create a new order
async def create_order(
    db: AsyncSession, order_data: schema.OrderCreate
) -> Order:
    user = await db.get(User, order_data.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    order = Order(user_id=order_data.user_id, total=order_data.total, status=order_data.status)
    db.add(order)

    try:
        await db.commit()
        await db.refresh(order)

        # Add order items
        for item in order_data.items:
            product = await db.get(Product, item.product_id)
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item.product_id} not found"
                )

            order_item = OrderItem(
                order_id=order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                price=product.price,
                subtotal=item.subtotal
            )
            db.add(order_item)

        await db.commit()
        return order
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# Update an order
async def update_order(db: AsyncSession, order_id: int, order_data: schema.OrderUpdate) -> Order:
    order = await get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    # Update the order details
    for key, value in order_data.dict().items():
        setattr(order, key, value)

    await db.commit()
    await db.refresh(order)
    return order


# Delete an order
async def delete_order(db: AsyncSession, order_id: int):
    order = await get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    await db.delete(order)
    await db.commit()

    return {"message": "Order deleted successfully", "id": order_id}
