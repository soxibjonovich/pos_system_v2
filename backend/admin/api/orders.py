from fastapi import APIRouter, Depends, HTTPException, status
from schemas import users as user_schema
from schemas import orders as order_schema
from api.deps import get_current_admin
from crud import orders as crud

orders_router = APIRouter(prefix="/orders", tags=["Orders"])


@orders_router.get(
    "", response_model=order_schema.OrdersResponse, status_code=status.HTTP_200_OK
)
async def get_orders(_: user_schema.User = Depends(get_current_admin)):
    return await crud.get_orders()


@orders_router.get(
    "/status/{order_status}", response_model=order_schema.OrdersResponse
)
async def get_orders_by_status(
    order_status: str, _: user_schema.User = Depends(get_current_admin)
):
    return await crud.get_orders_by_status(order_status)


@orders_router.get(
    "/user/{user_id}", response_model=order_schema.OrdersResponse
)
async def get_orders_by_user(
    user_id: int, _: user_schema.User = Depends(get_current_admin)
):
    return await crud.get_orders_by_user(user_id)


@orders_router.get(
    "/{order_id}",
    response_model=order_schema.OrderResponse,
    status_code=status.HTTP_200_OK,
)
async def get_order(order_id: int, _: user_schema.User = Depends(get_current_admin)):
    order = await crud.get_order_by_id(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    return order


@orders_router.patch("/{order_id}/status", response_model=order_schema.OrderResponse)
async def update_order_status(
    order_id: int,
    status_update: order_schema.OrderStatusUpdate,
    _: user_schema.User = Depends(get_current_admin),
):
    updated = await crud.update_order_status(order_id, status_update.status)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    return updated


@orders_router.put("/{order_id}", response_model=order_schema.OrderResponse)
async def update_order(
    order_id: int,
    order: order_schema.OrderUpdate,
    _: user_schema.User = Depends(get_current_admin),
):
    updated = await crud.update_order(order_id, order.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    return updated


@orders_router.put(
    "/{order_id}/items/{item_id}", response_model=order_schema.OrderResponse
)
async def update_order_item(
    order_id: int,
    item_id: int,
    item: order_schema.OrderItemUpdate,
    _: user_schema.User = Depends(get_current_admin),
):
    updated = await crud.update_order_item(
        order_id, item_id, item.model_dump(exclude_unset=True)
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order or item not found"
        )
    return updated


@orders_router.delete(
    "/{order_id}/items/{item_id}", response_model=order_schema.OrderResponse
)
async def remove_order_item(
    order_id: int,
    item_id: int,
    _: user_schema.User = Depends(get_current_admin),
):
    updated = await crud.remove_order_item(order_id, item_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order or item not found"
        )
    return updated


@orders_router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: int, _: user_schema.User = Depends(get_current_admin)
):
    deleted = await crud.delete_order(order_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
