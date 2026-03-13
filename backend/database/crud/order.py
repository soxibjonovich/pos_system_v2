from datetime import datetime
from typing import Optional

from crud.table import update_table_status
from models import (
    BusinessType,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    Table,
    TableStatus,
)
from rabbitmq_client import rabbitmq_client
from schemas.order import OrderCreate, OrderUpdate
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


def _order_status_value(status: OrderStatus | str) -> str:
    return status.value if isinstance(status, OrderStatus) else str(status)


def _build_order_event_payload(order: Order) -> dict:
    return {
        "order_id": order.id,
        "user_id": order.user_id,
        "table_id": order.table_id,
        "table_number": order.table.number if order.table else None,
        "status": _order_status_value(order.status),
        "subtotal_amount": float(order.subtotal_amount),
        "fee_percent": float(order.fee_percent),
        "fee_amount": float(order.fee_amount),
        "total": float(order.total),
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "items": [
            {
                "item_id": item.id,
                "product_id": item.product_id,
                "title": item.product.title if item.product else None,
                "quantity": item.quantity,
                "price": float(item.price),
                "subtotal": float(item.subtotal),
            }
            for item in order.items
        ],
    }


async def get_orders(
    db: AsyncSession,
    status: Optional[OrderStatus] = None,
    user_id: Optional[int] = None,
):
    stmt = (
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.user),
            selectinload(Order.table),
        )
        .order_by(Order.created_at.desc())
    )

    if status:
        stmt = stmt.where(Order.status == status)
    if user_id:
        stmt = stmt.where(Order.user_id == user_id)

    result = await db.execute(stmt)
    return result.unique().scalars().all()


async def get_order_by_id(db: AsyncSession, order_id: int):
    stmt = (
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.user),
            selectinload(Order.table),
        )
        .where(Order.id == order_id)
    )

    result = await db.execute(stmt)
    return result.unique().scalar_one_or_none()


async def get_orders_by_table(db: AsyncSession, table_id: int):
    stmt = (
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.user),
        )
        .where(
            Order.table_id == table_id,
            Order.status.in_(
                [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY]
            ),
        )
        .order_by(Order.created_at.desc())
    )

    result = await db.execute(stmt)
    return result.unique().scalars().all()


async def create_order(db: AsyncSession, order: OrderCreate, user_id: int):
    if order.business_type == BusinessType.RESTAURANT and not order.table_id:
        raise ValueError("Table ID is required for restaurant orders")

    if order.business_type == BusinessType.MARKET and order.table_id:
        raise ValueError("Table ID should not be set for market orders")

    if order.table_id:
        table_stmt = select(Table).where(Table.id == order.table_id)
        table_result = await db.execute(table_stmt)
        table = table_result.scalar_one_or_none()

        if not table:
            raise ValueError(f"Table with id {order.table_id} not found")
        if not table.is_active:
            raise ValueError(f"Table {table.number} is not active")
        if table.status != TableStatus.AVAILABLE:
            raise ValueError(f"Table {table.number} is not available")

    db_order = Order(
        user_id=user_id,
        table_id=order.table_id,
        status=OrderStatus.PENDING,
    )
    db_order.fee_percent = order.fee_percent

    total = 0.0
    for item in order.items:
        stmt = select(Product).where(Product.id == item.product_id)
        result = await db.execute(stmt)
        product = result.scalar_one_or_none()

        if not product:
            raise ValueError(f"Product with id {item.product_id} not found")

        if not product.is_active:
            raise ValueError(f"Product {product.title} is not active")

        if product.quantity != -1 and product.quantity < item.quantity:
            raise ValueError(f"Insufficient quantity for {product.title}")

        subtotal = float(product.price) * item.quantity
        total += subtotal

        order_item = OrderItem(
            product_id=product.id,
            quantity=item.quantity,
            price=float(product.price),
            subtotal=subtotal,
        )
        db_order.items.append(order_item)

        if product.quantity != -1:
            product.quantity -= item.quantity

    db_order.calculate_total()

    if order.table_id:
        await update_table_status(
            db, order.table_id, TableStatus.OCCUPIED, auto_commit=False
        )

    db.add(db_order)
    await db.commit()
    await db.refresh(db_order)

    # Eagerly load relationships to avoid lazy loading issues
    stmt = (
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.user),
            selectinload(Order.table),
        )
        .where(Order.id == db_order.id)
    )
    result = await db.execute(stmt)
    loaded_order = result.unique().scalar_one()

    # Access the relationships to load them into memory
    _ = loaded_order.items
    _ = loaded_order.user
    if loaded_order.table:
        _ = loaded_order.table

    try:
        event_data = _build_order_event_payload(loaded_order)
        await rabbitmq_client.publish(
            "order.created",
            {"action": "created", **event_data},
        )
        await rabbitmq_client.publish(
            "kitchen.new_order",
            {"action": "start_cooking", **event_data},
        )
    except Exception as e:
        print(f"⚠️  Failed to publish order.created/kitchen.new_order event: {e}")

    return loaded_order


async def update_order(db: AsyncSession, order_id: int, order: OrderUpdate):
    stmt = select(Order).where(Order.id == order_id)
    result = await db.execute(stmt)
    db_order = result.unique().scalar_one_or_none()

    if not db_order:
        return None

    old_status = db_order.status
    old_table_id = db_order.table_id

    if order.status is not None:
        if (
            old_status == OrderStatus.COMPLETED
            and order.status != OrderStatus.COMPLETED
        ):
            raise ValueError("Completed orders cannot be reopened")
        if order.status == OrderStatus.COMPLETED and old_status not in [
            OrderStatus.PENDING,
            OrderStatus.READY,
        ]:
            raise ValueError("Only pending or ready orders can be marked as completed")

    update_data = order.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_order, field, value)

    if "fee_percent" in update_data:
        db_order.fee_percent = update_data["fee_percent"]

    db_order.calculate_total()

    if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
        db_order.completed_at = datetime.utcnow()
        if db_order.table_id:
            await update_table_status(
                db, db_order.table_id, TableStatus.AVAILABLE, auto_commit=False
            )

    if order.table_id and order.table_id != old_table_id:
        if old_table_id:
            await update_table_status(
                db, old_table_id, TableStatus.AVAILABLE, auto_commit=False
            )
        await update_table_status(
            db, order.table_id, TableStatus.OCCUPIED, auto_commit=False
        )

    await db.commit()
    await db.refresh(db_order)

    stmt = (
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.user),
            selectinload(Order.table),
        )
        .where(Order.id == order_id)
    )
    result = await db.execute(stmt)
    loaded_order = result.unique().scalar_one()

    if order.status is not None and old_status != loaded_order.status:
        try:
            event_data = _build_order_event_payload(loaded_order)
            await rabbitmq_client.publish(
                "order.status_updated",
                {
                    "action": "status_updated",
                    "old_status": _order_status_value(old_status),
                    "new_status": _order_status_value(loaded_order.status),
                    **event_data,
                },
            )
        except Exception as e:
            print(f"⚠️  Failed to publish order.status_updated event: {e}")

    return loaded_order


async def add_order_item(db: AsyncSession, order_id: int, item):
    stmt = (
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.user),
            selectinload(Order.table),
        )
        .where(Order.id == order_id)
    )
    result = await db.execute(stmt)
    db_order = result.unique().scalar_one_or_none()
    if not db_order:
        return None

    if db_order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
        raise ValueError("Cannot modify completed or cancelled orders")

    product_stmt = select(Product).where(Product.id == item.product_id)
    product_result = await db.execute(product_stmt)
    product = product_result.scalar_one_or_none()
    if not product:
        raise ValueError(f"Product with id {item.product_id} not found")
    if not product.is_active:
        raise ValueError(f"Product {product.title} is not active")
    if product.quantity != -1 and product.quantity < item.quantity:
        raise ValueError(f"Insufficient quantity for {product.title}")

    db_item = OrderItem(
        order_id=order_id,
        product_id=item.product_id,
        quantity=item.quantity,
        price=float(item.price),
        subtotal=float(item.price) * item.quantity,
    )
    db.add(db_item)
    db_order.items.append(db_item)

    if product.quantity != -1:
        product.quantity -= item.quantity

    db_order.calculate_total()
    await db.commit()

    result = await db.execute(stmt)
    return result.unique().scalar_one()


async def update_order_item(db: AsyncSession, order_id: int, item_id: int, item):
    order_stmt = (
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.user),
            selectinload(Order.table),
        )
        .where(Order.id == order_id)
    )
    order_result = await db.execute(order_stmt)
    db_order = order_result.unique().scalar_one_or_none()
    if not db_order:
        return None

    if db_order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
        raise ValueError("Cannot modify completed or cancelled orders")

    item_stmt = select(OrderItem).where(
        and_(OrderItem.id == item_id, OrderItem.order_id == order_id)
    )
    item_result = await db.execute(item_stmt)
    db_item = item_result.scalar_one_or_none()
    if not db_item:
        return None

    product_stmt = select(Product).where(Product.id == db_item.product_id)
    product_result = await db.execute(product_stmt)
    product = product_result.scalar_one_or_none()

    new_quantity = item.quantity if item.quantity is not None else db_item.quantity
    new_price = float(item.price) if item.price is not None else float(db_item.price)

    qty_diff = new_quantity - db_item.quantity
    if qty_diff > 0 and product and product.quantity != -1:
        if product.quantity < qty_diff:
            raise ValueError(f"Insufficient quantity for {product.title}")
        product.quantity -= qty_diff
    elif qty_diff < 0 and product and product.quantity != -1:
        product.quantity += abs(qty_diff)

    db_item.quantity = new_quantity
    db_item.price = new_price
    db_item.subtotal = new_quantity * new_price

    db_order.calculate_total()
    await db.commit()

    order_result = await db.execute(order_stmt)
    return order_result.unique().scalar_one()


async def remove_order_item(db: AsyncSession, order_id: int, item_id: int):
    order_stmt = (
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.user),
            selectinload(Order.table),
        )
        .where(Order.id == order_id)
    )
    order_result = await db.execute(order_stmt)
    db_order = order_result.unique().scalar_one_or_none()
    if not db_order:
        return None

    if db_order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
        raise ValueError("Cannot modify completed or cancelled orders")

    item_stmt = select(OrderItem).where(
        and_(OrderItem.id == item_id, OrderItem.order_id == order_id)
    )
    item_result = await db.execute(item_stmt)
    db_item = item_result.scalar_one_or_none()
    if not db_item:
        return None

    product_stmt = select(Product).where(Product.id == db_item.product_id)
    product_result = await db.execute(product_stmt)
    product = product_result.scalar_one_or_none()
    if product and product.quantity != -1:
        product.quantity += db_item.quantity

    await db.delete(db_item)
    await db.flush()
    db_order.calculate_total()
    await db.commit()

    order_result = await db.execute(order_stmt)
    return order_result.unique().scalar_one()


async def delete_order(db: AsyncSession, order_id: int):
    stmt = select(Order).where(Order.id == order_id)
    result = await db.execute(stmt)
    db_order = result.unique().scalar_one_or_none()

    if not db_order:
        return False

    if db_order.status != OrderStatus.COMPLETED:
        for item in db_order.items:
            stmt = select(Product).where(Product.id == item.product_id)
            result = await db.execute(stmt)
            product = result.scalar_one_or_none()

            if product and product.quantity != -1:
                product.quantity += item.quantity

    if db_order.table_id:
        await update_table_status(
            db, db_order.table_id, TableStatus.AVAILABLE, auto_commit=False
        )

    await db.delete(db_order)
    await db.commit()
    return True
