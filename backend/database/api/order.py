from typing import Optional

from crud import order as crud
from crud import table as table_crud
from database import get_db
from fastapi import APIRouter, Depends, HTTPException, status
from models import BusinessType, OrderStatus
from schemas import order as schema
from sqlalchemy.ext.asyncio import AsyncSession

router=APIRouter(tags=["Orders"])

@router.get("",response_model=schema.OrdersResponse)
async def get_orders(status:Optional[OrderStatus]=None,user_id:Optional[int]=None,db:AsyncSession=Depends(get_db)):
    orders=await crud.get_orders(db,status,user_id)
    return {"orders":orders,"total":len(orders)}

@router.get("/table/{table_id}",response_model=schema.OrdersResponse)
async def get_orders_by_table(table_id:int,db:AsyncSession=Depends(get_db)):
    table=await table_crud.get_table_by_id(db,table_id)
    if not table:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail=f"Table with id {table_id} not found")
    orders=await crud.get_orders_by_table(db,table_id)
    return {"orders":orders,"total":len(orders)}

@router.get("/{order_id}",response_model=schema.OrderResponse)
async def get_order(order_id:int,db:AsyncSession=Depends(get_db)):
    order=await crud.get_order_by_id(db,order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail=f"Order with id {order_id} not found")
    return order

@router.post("",response_model=schema.OrderResponse,status_code=status.HTTP_201_CREATED)
async def create_order(order:schema.OrderCreate,user_id:int,db:AsyncSession=Depends(get_db)):
    if order.business_type==BusinessType.RESTAURANT:
        if not order.table_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Table ID is required for restaurant orders")
        table=await table_crud.get_table_by_id(db,order.table_id)
        if not table:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail=f"Table with id {order.table_id} not found")
        if not table.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Table is not active")
    
    if order.business_type==BusinessType.MARKET and order.table_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Table ID should not be set for market orders")
    
    try:
        return await crud.create_order(db,order,user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail=str(e))

@router.put("/{order_id}",response_model=schema.OrderResponse)
async def update_order(order_id:int,order:schema.OrderUpdate,db:AsyncSession=Depends(get_db)):
    if order.table_id:
        table=await table_crud.get_table_by_id(db,order.table_id)
        if not table:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail=f"Table with id {order.table_id} not found")
        if not table.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Table is not active")
    updated=await crud.update_order(db,order_id,order)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail=f"Order with id {order_id} not found")
    return updated

@router.patch("/{order_id}/status",response_model=schema.OrderResponse)
async def update_order_status(order_id:int,status_:OrderStatus,db:AsyncSession=Depends(get_db)):
    order_update=schema.OrderUpdate(status=status_)
    updated=await crud.update_order(db,order_id,order_update)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail=f"Order with id {order_id} not found")
    return updated

@router.delete("/{order_id}",status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(order_id:int,db:AsyncSession=Depends(get_db)):
    deleted=await crud.delete_order(db,order_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail=f"Order with id {order_id} not found")