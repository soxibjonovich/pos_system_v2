from fastapi import APIRouter, Depends, HTTPException, status
from admin.schemas import users as user_schema
from admin.schemas import orders as order_schema
from admin.api.deps import get_current_admin
from admin.crud import orders as crud

orders_router = APIRouter(prefix="/orders", tags=["Orders"])


@orders_router.get(
    "", response_model=order_schema.OrdersResponse, status_code=status.HTTP_200_OK
)
async def get_orders(_: user_schema.User = Depends(get_current_admin)):
    return await crud.get_orders()


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


@orders_router.get("/status/{order_status}", response_model=order_schema.OrdersResponse)
async def get_orders_by_status(
    order_status: str, _: user_schema.User = Depends(get_current_admin)
):
    return await crud.get_orders_by_status(order_status)


@orders_router.get("/user/{user_id}", response_model=order_schema.OrdersResponse)
async def get_orders_by_user(
    user_id: int, _: user_schema.User = Depends(get_current_admin)
):
    return await crud.get_orders_by_user(user_id)
