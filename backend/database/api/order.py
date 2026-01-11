from fastapi import APIRouter, status, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from crud import order as crud
from schemas.order import (
    OrderCreate,
    OrderUpdate,
    OrderResponse,
    OrdersResponse,
    OrderItemCreate,
    OrderItemUpdate,
    OrderStatusUpdate,
)

order_router = APIRouter(prefix="", tags=["Orders"])


@order_router.get("", response_model=OrdersResponse, status_code=status.HTTP_200_OK)
async def get_orders(db: AsyncSession = Depends(get_db)):
    orders = await crud.get_orders(db)
    return OrdersResponse(orders=orders, total=len(orders))


@order_router.get("/status/{order_status}", response_model=OrdersResponse)
async def get_orders_by_status(order_status: str, db: AsyncSession = Depends(get_db)):
    orders = await crud.get_orders_by_status(db, order_status)
    return OrdersResponse(orders=orders, total=len(orders))


@order_router.get("/user/{user_id}", response_model=OrdersResponse)
async def get_orders_by_user(user_id: int, db: AsyncSession = Depends(get_db)):
    orders = await crud.get_orders_by_user(db, user_id)
    return OrdersResponse(orders=orders, total=len(orders))


@order_router.get(
    "/{order_id}", response_model=OrderResponse, status_code=status.HTTP_200_OK
)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db)):
    order = await crud.get_order_by_id(db, order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    return order


@order_router.post(
    "", response_model=OrderResponse, status_code=status.HTTP_201_CREATED
)
async def create_order(order: OrderCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_order(db, order)


@order_router.put(
    "/{order_id}", response_model=OrderResponse, status_code=status.HTTP_200_OK
)
async def update_order(
    order_id: int, order: OrderUpdate, db: AsyncSession = Depends(get_db)
):
    updated_order = await crud.update_order(db, order_id, order)

    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    return updated_order


@order_router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int, status_update: OrderStatusUpdate, db: AsyncSession = Depends(get_db)
):
    updated_order = await crud.update_order_status(db, order_id, status_update.status)

    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    return updated_order


@order_router.post("/{order_id}/items", response_model=OrderResponse)
async def add_order_item(
    order_id: int, item: OrderItemCreate, db: AsyncSession = Depends(get_db)
):
    updated_order = await crud.add_order_item(db, order_id, item)

    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    return updated_order


@order_router.put("/{order_id}/items/{item_id}", response_model=OrderResponse)
async def update_order_item(
    order_id: int,
    item_id: int,
    item: OrderItemUpdate,
    db: AsyncSession = Depends(get_db),
):
    updated_order = await crud.update_order_item(db, order_id, item_id, item)

    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order or item not found"
        )

    return updated_order


@order_router.delete("/{order_id}/items/{item_id}", response_model=OrderResponse)
async def remove_order_item(
    order_id: int, item_id: int, db: AsyncSession = Depends(get_db)
):
    updated_order = await crud.remove_order_item(db, order_id, item_id)

    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order or item not found"
        )

    return updated_order


@order_router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(order_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await crud.delete_order(db, order_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
