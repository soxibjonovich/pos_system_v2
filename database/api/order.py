from fastapi import APIRouter, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import get_db
from database.crud import order as crud
from database.schemas.order import OrderCreate, OrderUpdate, OrderResponse

order_router = APIRouter(prefix="", tags=["Orders"])


@order_router.get("", status_code=status.HTTP_200_OK)
async def get_orders(db: AsyncSession = Depends(get_db)):
    orders = await crud.get_orders(db)
    return {"orders": orders}


@order_router.get("/{id}", status_code=status.HTTP_200_OK, response_model=OrderResponse)
async def get_order(id: int, db: AsyncSession = Depends(get_db)):
    order = await crud.get_order_by_id(db, id)
    if not order:
        return {"detail": "Order not found"}
    return order


@order_router.post("", status_code=status.HTTP_201_CREATED)
async def create_order(
    order: OrderCreate, db: AsyncSession = Depends(get_db)
):
    created_order = await crud.create_order(db, order)
    return created_order


@order_router.put("/{id}", status_code=status.HTTP_200_OK, response_model=OrderResponse)
async def update_order(
    id: int, order: OrderUpdate, db: AsyncSession = Depends(get_db)
):
    updated_order = await crud.update_order(db, id, order)
    return updated_order


@order_router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_order(id: int, db: AsyncSession = Depends(get_db)):
    response = await crud.delete_order(db, id)
    return response
