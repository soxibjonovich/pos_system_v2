from datetime import date, datetime
from typing import Any, Dict, List, Optional

from models import Order, OrderItem, OrderStatus, Product, User
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession


async def get_orders_for_report(
    db: AsyncSession, start_date: Optional[date] = None, end_date: Optional[date] = None
) -> List[Order]:
    """Get orders for reporting (excluding cancelled orders)"""

    # Build conditions list
    conditions = [Order.status != OrderStatus.CANCELLED]

    if start_date:
        conditions.append(Order.created_at >= start_date)

    if end_date:
        # Include the entire end date (until end of day)
        conditions.append(
            Order.created_at < datetime.combine(end_date, datetime.max.time())
        )

    # Use and_() to combine conditions
    stmt = select(Order).where(and_(*conditions)).order_by(Order.created_at.desc())

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_sales_summary(
    db: AsyncSession, start_date: Optional[date] = None, end_date: Optional[date] = None
) -> Dict[str, Any]:
    """Get sales summary statistics"""

    # Build conditions
    conditions = [Order.status != OrderStatus.CANCELLED]

    if start_date:
        conditions.append(Order.created_at >= start_date)

    if end_date:
        conditions.append(
            Order.created_at < datetime.combine(end_date, datetime.max.time())
        )

    # Main summary query
    stmt = select(
        func.count(Order.id).label("total_orders"),
        func.sum(Order.total).label("total_sales"),
    ).where(and_(*conditions))

    result = await db.execute(stmt)
    summary = result.first()

    # Items sold query
    items_stmt = (
        select(func.sum(OrderItem.quantity))
        .select_from(OrderItem)
        .join(Order)
        .where(and_(*conditions))
    )

    items_result = await db.execute(items_stmt)
    items_sold = items_result.scalar() or 0

    total_orders = summary.total_orders or 0
    total_sales = float(summary.total_sales or 0)

    return {
        "total_sales": total_sales,
        "total_orders": total_orders,
        "items_sold": int(items_sold),
        "average_order_value": total_sales / total_orders if total_orders > 0 else 0,
    }


async def get_top_products(
    db: AsyncSession,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """Get top selling products by revenue"""

    # Build conditions
    conditions = [Order.status != OrderStatus.CANCELLED]

    if start_date:
        conditions.append(Order.created_at >= start_date)

    if end_date:
        conditions.append(
            Order.created_at < datetime.combine(end_date, datetime.max.time())
        )

    # Top products query
    stmt = (
        select(
            Product.id,
            Product.title,
            func.sum(OrderItem.quantity).label("quantity_sold"),
            func.sum(OrderItem.price * OrderItem.quantity).label("revenue"),
        )
        .select_from(OrderItem)
        .join(Product, OrderItem.product_id == Product.id)
        .join(Order, OrderItem.order_id == Order.id)
        .where(and_(*conditions))
        .group_by(Product.id, Product.title)
        .order_by(func.sum(OrderItem.price * OrderItem.quantity).desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "product_id": row.id,
            "product_name": row.title,
            "quantity_sold": int(row.quantity_sold),
            "revenue": float(row.revenue),
        }
        for row in rows
    ]


async def get_sales_by_day(
    db: AsyncSession, start_date: Optional[date] = None, end_date: Optional[date] = None
) -> List[Dict[str, Any]]:
    """Get daily sales totals"""

    # Build conditions
    conditions = [Order.status != OrderStatus.CANCELLED]

    if start_date:
        conditions.append(Order.created_at >= start_date)

    if end_date:
        conditions.append(
            Order.created_at < datetime.combine(end_date, datetime.max.time())
        )

    # Daily sales query
    stmt = (
        select(
            func.date(Order.created_at).label("date"),
            func.count(Order.id).label("orders"),
            func.sum(Order.total).label("sales"),
        )
        .where(and_(*conditions))
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "date": row.date.format() if row.date else None,
            "orders": int(row.orders),
            "sales": float(row.sales or 0),
        }
        for row in rows
    ]


async def get_sales_by_hour(
    db: AsyncSession, start_date: Optional[date] = None, end_date: Optional[date] = None
) -> List[Dict[str, Any]]:
    """Get hourly sales distribution"""

    # Build conditions
    conditions = [Order.status != OrderStatus.CANCELLED]

    if start_date:
        conditions.append(Order.created_at >= start_date)

    if end_date:
        conditions.append(
            Order.created_at < datetime.combine(end_date, datetime.max.time())
        )

    # Use strftime for SQLite compatibility
    stmt = (
        select(
            func.strftime("%H", Order.created_at).label("hour"),
            func.count(Order.id).label("orders"),
            func.sum(Order.total).label("sales"),
        )
        .where(and_(*conditions))
        .group_by(func.strftime("%H", Order.created_at))
        .order_by(func.strftime("%H", Order.created_at))
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "hour": int(row.hour) if row.hour else 0,
            "orders": int(row.orders),
            "sales": float(row.sales or 0),
        }
        for row in rows
    ]


async def get_inventory_report(db: AsyncSession) -> Dict[str, Any]:
    """Get inventory status report with totals + products list"""

    stmt = (
        select(Product)
        .where(Product.is_active == True)
        .order_by(Product.quantity.asc())
    )

    result = await db.execute(stmt)
    products = result.scalars().all()

    report: List[Dict[str, Any]] = []
    low_stock_count = 0
    out_of_stock_count = 0
    total_value = 0.0

    for product in products:
        # Determine stock status
        if product.quantity == -1:
            status = "unlimited"
        elif product.quantity == 0:
            status = "out_of_stock"
            out_of_stock_count += 1
        elif product.quantity < 10:
            status = "low_stock"
            low_stock_count += 1
        else:
            status = "in_stock"

        value = float(product.price * product.quantity) if product.quantity > 0 else 0.0
        total_value += value

        report.append(
            {
                "product_id": product.id,
                "product_name": product.title,
                "quantity": product.quantity,
                "price": float(product.price),
                "status": status,
                "value": value,
            }
        )

    return {
        "total_products": len(products),
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "total_value": total_value,
        "products": report,
    }


async def get_user_sales(
    db: AsyncSession, start_date: Optional[date] = None, end_date: Optional[date] = None
) -> List[Dict[str, Any]]:
    """Get sales by user (cashier performance)"""

    # Build conditions
    conditions = [Order.status != OrderStatus.CANCELLED]

    if start_date:
        conditions.append(Order.created_at >= start_date)

    if end_date:
        conditions.append(
            Order.created_at < datetime.combine(end_date, datetime.max.time())
        )

    # User sales query
    stmt = (
        select(
            User.id,
            User.full_name,
            func.count(Order.id).label("orders"),
            func.sum(Order.total).label("sales"),
        )
        .select_from(Order)
        .join(User, Order.user_id == User.id)
        .where(and_(*conditions))
        .group_by(User.id, User.full_name)
        .order_by(func.sum(Order.total).desc())
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "user_id": row.id,
            "user_name": row.full_name,
            "orders": int(row.orders),
            "sales": float(row.sales or 0),
        }
        for row in rows
    ]
