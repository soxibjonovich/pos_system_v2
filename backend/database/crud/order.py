from datetime import datetime
from typing import Optional

from crud.table import update_table_status
from models import BusinessType, Order, OrderItem, OrderStatus, Product, TableStatus
from schemas.order import OrderCreate, OrderUpdate
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


async def get_orders(db: AsyncSession, status: Optional[OrderStatus] = None, user_id: Optional[int] = None):
    stmt = select(Order).options(
        selectinload(Order.items).selectinload(OrderItem.product),
        selectinload(Order.user),
        selectinload(Order.table)
    ).order_by(Order.created_at.desc())
    
    if status:
        stmt = stmt.where(Order.status == status)
    if user_id:
        stmt = stmt.where(Order.user_id == user_id)
    
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_order_by_id(db: AsyncSession, order_id: int):
    stmt = select(Order).options(
        selectinload(Order.items).selectinload(OrderItem.product),
        selectinload(Order.user),
        selectinload(Order.table)
    ).where(Order.id == order_id)
    
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_orders_by_table(db: AsyncSession, table_id: int):
    stmt = select(Order).options(
        selectinload(Order.items).selectinload(OrderItem.product),
        selectinload(Order.user)
    ).where(
        Order.table_id == table_id,
        Order.status.in_([OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY])
    ).order_by(Order.created_at.desc())
    
    result = await db.execute(stmt)
    return result.scalars().all()


async def create_order(db: AsyncSession, order: OrderCreate, user_id: int):
    if order.business_type == BusinessType.RESTAURANT and not order.table_id:
        raise ValueError("Table ID is required for restaurant orders")
    
    if order.business_type == BusinessType.MARKET and order.table_id:
        raise ValueError("Table ID should not be set for market orders")
    
    db_order = Order(
        user_id=user_id,
        table_id=order.table_id,
        status=OrderStatus.COMPLETED
    )
    
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
            subtotal=subtotal
        )
        db_order.items.append(order_item)
        
        if product.quantity != -1:
            product.quantity -= item.quantity
    
    db_order.total = total
    
    # if order.table_id:
    #     await update_table_status(db, order.table_id, TableStatus.OCCUPIED)
    
    db.add(db_order)
    await db.commit()
    await db.refresh(db_order)
    
    # Eagerly load relationships to avoid lazy loading issues
    stmt = select(Order).options(
        selectinload(Order.items).selectinload(OrderItem.product),
        selectinload(Order.user),
        selectinload(Order.table)
    ).where(Order.id == db_order.id)
    result = await db.execute(stmt)
    loaded_order = result.scalar_one()
    
    # Access the relationships to load them into memory
    _ = loaded_order.items
    _ = loaded_order.user
    if loaded_order.table:
        _ = loaded_order.table
    
    return loaded_order

async def update_order(db: AsyncSession, order_id: int, order: OrderUpdate):
    stmt = select(Order).where(Order.id == order_id)
    result = await db.execute(stmt)
    db_order = result.scalar_one_or_none()
    
    if not db_order:
        return None
    
    old_table_id = db_order.table_id
    
    update_data = order.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_order, field, value)
    
    if order.status == OrderStatus.COMPLETED:
        db_order.completed_at = datetime.utcnow()
        if db_order.table_id:
            await update_table_status(db, db_order.table_id, TableStatus.AVAILABLE)
    
    if order.table_id and order.table_id != old_table_id:
        if old_table_id:
            await update_table_status(db, old_table_id, TableStatus.AVAILABLE)
        await update_table_status(db, order.table_id, TableStatus.OCCUPIED)
    
    await db.commit()
    await db.refresh(db_order)
    
    stmt = select(Order).options(
        selectinload(Order.items).selectinload(OrderItem.product),
        selectinload(Order.user),
        selectinload(Order.table)
    ).where(Order.id == order_id)
    result = await db.execute(stmt)
    return result.scalar_one()


async def delete_order(db: AsyncSession, order_id: int):
    stmt = select(Order).where(Order.id == order_id)
    result = await db.execute(stmt)
    db_order = result.scalar_one_or_none()
    
    if not db_order:
        return False
    
    for item in db_order.items:
        stmt = select(Product).where(Product.id == item.product_id)
        result = await db.execute(stmt)
        product = result.scalar_one_or_none()
        
        if product and product.quantity != -1:
            product.quantity += item.quantity
    
    if db_order.table_id:
        await update_table_status(db, db_order.table_id, TableStatus.AVAILABLE)
    
    await db.delete(db_order)
    await db.commit()
    return True