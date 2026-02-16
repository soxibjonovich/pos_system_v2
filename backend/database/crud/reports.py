from datetime import datetime
from typing import List, Optional

from models import Order, OrderItem, OrderStatus, Product
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


async def get_orders_for_report(
    db: AsyncSession,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get all orders with items for reporting"""
    stmt = select(Order).options(
        selectinload(Order.items).selectinload(OrderItem.product),
        selectinload(Order.user),
        selectinload(Order.table)
    ).order_by(Order.created_at.desc())
    
    # Apply date filters
    if start_date:
        stmt = stmt.where(Order.created_at >= start_date)
    if end_date:
        stmt = stmt.where(Order.created_at <= end_date)
    
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_sales_summary(
    db: AsyncSession,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get sales summary statistics"""
    # Build WHERE conditions
    conditions = [Order.status != OrderStatus.CANCELLED]
    
    if start_date:
        conditions.append(Order.created_at >= start_date)
    if end_date:
        conditions.append(Order.created_at <= end_date)
    
    # Main summary query
    stmt = select(
        func.count(Order.id).label('total_orders'),
        func.coalesce(func.sum(Order.total), 0).label('total_sales'),
        func.coalesce(func.avg(Order.total), 0).label('average_order_value')
    ).where(and_(*conditions))
    
    result = await db.execute(stmt)
    row = result.one()
    
    # Get total items sold
    items_stmt = select(
        func.coalesce(func.sum(OrderItem.quantity), 0)
    ).select_from(OrderItem).join(Order).where(and_(*conditions))
    
    items_result = await db.execute(items_stmt)
    total_items = items_result.scalar() or 0
    
    return {
        'total_orders': int(row.total_orders or 0),
        'total_sales': float(row.total_sales or 0),
        'average_order_value': float(row.average_order_value or 0),
        'total_items': int(total_items)
    }


async def get_top_products(
    db: AsyncSession,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 10
):
    """Get top selling products by revenue"""
    # Build WHERE conditions
    conditions = [Order.status != OrderStatus.CANCELLED]
    
    if start_date:
        conditions.append(Order.created_at >= start_date)
    if end_date:
        conditions.append(Order.created_at <= end_date)
    
    stmt = select(
        Product.id,
        Product.title,
        func.sum(OrderItem.quantity).label('total_quantity'),
        func.sum(OrderItem.subtotal).label('total_revenue')
    ).select_from(Product).join(OrderItem).join(Order).where(
        and_(*conditions)
    ).group_by(
        Product.id, Product.title
    ).order_by(
        func.sum(OrderItem.subtotal).desc()
    ).limit(limit)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {
            'product_id': row.id,
            'product_name': row.title,
            'quantity': int(row.total_quantity or 0),
            'revenue': float(row.total_revenue or 0)
        }
        for row in rows
    ]


async def get_sales_by_day(
    db: AsyncSession,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get daily sales totals"""
    # Build WHERE conditions
    conditions = [Order.status != OrderStatus.CANCELLED]
    
    if start_date:
        conditions.append(Order.created_at >= start_date)
    if end_date:
        conditions.append(Order.created_at <= end_date)
    
    stmt = select(
        func.date(Order.created_at).label('date'),
        func.sum(Order.total).label('total')
    ).where(
        and_(*conditions)
    ).group_by(
        func.date(Order.created_at)
    ).order_by(
        func.date(Order.created_at)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {
            'date': str(row.date),
            'total': float(row.total or 0)
        }
        for row in rows
    ]


async def get_sales_by_hour(
    db: AsyncSession,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get hourly sales distribution"""
    # Build WHERE conditions
    conditions = [Order.status != OrderStatus.CANCELLED]
    
    if start_date:
        conditions.append(Order.created_at >= start_date)
    if end_date:
        conditions.append(Order.created_at <= end_date)
    
    # SQLite uses strftime for hour extraction
    hour_expr = func.cast(func.strftime('%H', Order.created_at), int)
    
    stmt = select(
        hour_expr.label('hour'),
        func.sum(Order.total).label('total')
    ).where(
        and_(*conditions)
    ).group_by(
        func.strftime('%H', Order.created_at)
    ).order_by(
        func.strftime('%H', Order.created_at)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {
            'hour': int(row.hour or 0),
            'total': float(row.total or 0)
        }
        for row in rows
    ]


async def get_inventory_report(db: AsyncSession):
    """Get inventory status for all products"""
    stmt = select(Product).where(Product.is_active == True)
    result = await db.execute(stmt)
    products = result.scalars().all()
    
    total_products = len(products)
    low_stock_count = 0
    out_of_stock_count = 0
    total_value = 0.0
    
    inventory_items = []
    
    for product in products:
        quantity = product.quantity
        price = float(product.price)
        value = quantity * price if quantity != -1 else 0.0
        
        # Determine status
        if quantity == 0:
            status = 'out_of_stock'
            out_of_stock_count += 1
        elif quantity < 10 and quantity != -1:
            status = 'low_stock'
            low_stock_count += 1
        elif quantity == -1:
            status = 'unlimited'
        else:
            status = 'in_stock'
        
        if quantity != -1:
            total_value += value
        
        inventory_items.append({
            'product_id': product.id,
            'product_name': product.title,
            'quantity': quantity,
            'price': price,
            'value': value,
            'status': status,
            'category_id': product.category_id
        })
    
    return {
        'total_products': total_products,
        'low_stock_count': low_stock_count,
        'out_of_stock_count': out_of_stock_count,
        'total_value': total_value,
        'products': inventory_items
    }