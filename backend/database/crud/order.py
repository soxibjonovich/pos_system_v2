from typing import Sequence
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from models import Order, OrderItem, Product, User, OrderStatus
from schemas import order as schema


async def get_orders(db: AsyncSession) -> Sequence[Order]:
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .options(selectinload(Order.user))
        .order_by(Order.created_at.desc())
    )
    return result.scalars().all()


async def get_order_by_id(db: AsyncSession, order_id: int) -> Order | None:
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .options(selectinload(Order.user))
    )
    return result.scalar_one_or_none()


async def get_orders_by_status(db: AsyncSession, order_status: str) -> Sequence[Order]:
    result = await db.execute(
        select(Order)
        .where(Order.status == order_status)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .order_by(Order.created_at.desc())
    )
    return result.scalars().all()


async def get_orders_by_user(db: AsyncSession, user_id: int) -> Sequence[Order]:
    result = await db.execute(
        select(Order)
        .where(Order.user_id == user_id)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .order_by(Order.created_at.desc())
    )
    return result.scalars().all()


async def create_order(db: AsyncSession, order_data: schema.OrderCreate) -> Order:
    user = await db.get(User, order_data.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if not order_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must have at least one item",
        )

    order = Order(user_id=order_data.user_id, status=OrderStatus.PENDING, total=0.0)
    db.add(order)

    try:
        await db.flush()

        total = 0.0
        for item_data in order_data.items:
            product = await db.get(Product, item_data.product_id)

            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product {item_data.product_id} not found",
                )

            if not product.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product {product.title} is not available",
                )

            if product.quantity != -1 and product.quantity < item_data.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for {product.title}",
                )

            subtotal = float(product.price) * item_data.quantity

            order_item = OrderItem(
                order_id=order.id,
                product_id=item_data.product_id,
                quantity=item_data.quantity,
                price=float(product.price),
                subtotal=subtotal,
            )
            db.add(order_item)
            total += subtotal

            if product.quantity != -1:
                product.quantity -= item_data.quantity

        order.total = total
        await db.commit()
        await db.refresh(order)

        return order

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create order: {str(e)}",
        )


async def update_order(
    db: AsyncSession, order_id: int, order_data: schema.OrderUpdate
) -> Order | None:
    order = await get_order_by_id(db, order_id)

    if not order:
        return None

    if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update {order.status.value} order",
        )

    try:
        for key, value in order_data.model_dump(exclude_unset=True).items():
            setattr(order, key, value)

        await db.commit()
        await db.refresh(order)
        return order

    except Exception:
        await db.rollback()
        raise


async def update_order_status(
    db: AsyncSession, order_id: int, new_status: str
) -> Order | None:
    order = await get_order_by_id(db, order_id)

    if not order:
        return None

    try:
        order.status = OrderStatus(new_status)

        if new_status == OrderStatus.COMPLETED.value:
            from datetime import datetime

            order.completed_at = datetime.now()

        await db.commit()
        await db.refresh(order)
        return order

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {new_status}",
        )
    except Exception:
        await db.rollback()
        raise


async def add_order_item(
    db: AsyncSession, order_id: int, item_data: schema.OrderItemCreate
) -> Order | None:
    order = await get_order_by_id(db, order_id)

    if not order:
        return None

    if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot modify {order.status.value} order",
        )

    product = await db.get(Product, item_data.product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    if not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product {product.title} is not available",
        )

    try:
        subtotal = float(product.price) * item_data.quantity

        order_item = OrderItem(
            order_id=order.id,
            product_id=item_data.product_id,
            quantity=item_data.quantity,
            price=float(product.price),
            subtotal=subtotal,
        )
        db.add(order_item)

        order.total += subtotal

        if product.quantity != -1:
            product.quantity -= item_data.quantity

        await db.commit()
        await db.refresh(order)
        return order

    except Exception:
        await db.rollback()
        raise


async def update_order_item(
    db: AsyncSession, order_id: int, item_id: int, item_data: schema.OrderItemUpdate
) -> Order | None:
    order = await get_order_by_id(db, order_id)

    if not order:
        return None

    if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot modify {order.status.value} order",
        )

    result = await db.execute(
        select(OrderItem).where(OrderItem.id == item_id, OrderItem.order_id == order_id)
    )
    order_item = result.scalar_one_or_none()

    if not order_item:
        return None

    try:
        old_subtotal = order_item.subtotal

        if item_data.quantity is not None:
            order_item.quantity = item_data.quantity

        if item_data.price is not None:
            order_item.price = item_data.price

        order_item.subtotal = order_item.price * order_item.quantity

        order.total = order.total - old_subtotal + order_item.subtotal

        await db.commit()
        await db.refresh(order)
        return order

    except Exception:
        await db.rollback()
        raise


async def remove_order_item(
    db: AsyncSession, order_id: int, item_id: int
) -> Order | None:
    order = await get_order_by_id(db, order_id)

    if not order:
        return None

    if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot modify {order.status.value} order",
        )

    result = await db.execute(
        select(OrderItem).where(OrderItem.id == item_id, OrderItem.order_id == order_id)
    )
    order_item = result.scalar_one_or_none()

    if not order_item:
        return None

    if len(order.items) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove last item. Delete order instead",
        )

    try:
        product = await db.get(Product, order_item.product_id)
        if product and product.quantity != -1:
            product.quantity += order_item.quantity

        order.total -= order_item.subtotal

        await db.delete(order_item)
        await db.commit()
        await db.refresh(order)
        return order

    except Exception:
        await db.rollback()
        raise


async def delete_order(db: AsyncSession, order_id: int) -> bool:
    order = await get_order_by_id(db, order_id)

    if not order:
        return False

    try:
        for item in order.items:
            product = await db.get(Product, item.product_id)
            if product and product.quantity != -1:
                product.quantity += item.quantity

        await db.delete(order)
        await db.commit()
        return True

    except Exception:
        await db.rollback()
        raise
