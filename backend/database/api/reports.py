# backend/database/api/reports.py
from fastapi import APIRouter, Depends, Query
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from crud import reports as crud

router = APIRouter()


@router.get("/sales/summary")
async def get_sales_summary(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get sales summary statistics"""
    return await crud.get_sales_summary(db, start_date, end_date)


@router.get("/sales/top-products")
async def get_top_products(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get top selling products"""
    return await crud.get_top_products(db, start_date, end_date, limit)


@router.get("/sales/by-day")
async def get_sales_by_day(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get daily sales totals"""
    return await crud.get_sales_by_day(db, start_date, end_date)


@router.get("/sales/by-hour")
async def get_sales_by_hour(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get hourly sales distribution"""
    return await crud.get_sales_by_hour(db, start_date, end_date)


@router.get("/inventory")
async def get_inventory_report(db: AsyncSession = Depends(get_db)):
    """Get inventory status report"""
    return await crud.get_inventory_report(db)


@router.get("/orders")
async def get_orders_for_report(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get all orders for reporting with full details"""
    orders = await crud.get_orders_for_report(db, start_date, end_date)
    
    # Convert to dict for JSON response
    result = []
    for order in orders:
        order_dict = {
            'id': order.id,
            'user_id': order.user_id,
            'table_id': order.table_id,
            'total': float(order.total),
            'status': order.status.value,
            'created_at': order.created_at.isoformat(),
            'updated_at': order.updated_at.isoformat() if order.updated_at else None,
            'items': [
                {
                    'id': item.id,
                    'product_id': item.product_id,
                    'quantity': item.quantity,
                    'price': float(item.price),
                    'subtotal': float(item.subtotal),
                    'product': {
                        'id': item.product.id,
                        'title': item.product.title,
                        'price': float(item.product.price)
                    } if item.product else None
                }
                for item in order.items
            ],
            'user': {
                'id': order.user.id,
                'full_name': order.user.full_name,
                'role': order.user.role
            } if order.user else None,
            'table': {
                'id': order.table.id,
                'number': order.table.number
            } if order.table else None
        }
        result.append(order_dict)
    
    return {'orders': result, 'total': len(result)}