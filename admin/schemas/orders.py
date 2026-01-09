from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Literal


class OrderItemBase(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)


class OrderItem(OrderItemBase):
    id: int
    order_id: int
    price: float
    subtotal: float

    model_config = ConfigDict(from_attributes=True)


class OrderBase(BaseModel):
    user_id: int = Field(..., gt=0)


class OrderStatusUpdate(BaseModel):
    status: Literal["pending", "preparing", "ready", "completed", "cancelled"]


class OrderResponse(OrderBase):
    id: int
    total: float
    status: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    completed_at: datetime | None = None
    items: list[OrderItem] = []

    model_config = ConfigDict(from_attributes=True)


class OrdersResponse(BaseModel):
    orders: list[OrderResponse] = []
    total: int = 0
