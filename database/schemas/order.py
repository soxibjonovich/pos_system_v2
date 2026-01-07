from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Literal


class OrderItemBase(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemUpdate(BaseModel):
    quantity: int | None = Field(None, gt=0)
    price: float | None = Field(None, gt=0)


class OrderItem(OrderItemBase):
    id: int
    order_id: int
    price: float
    subtotal: float
    
    model_config = ConfigDict(from_attributes=True)


class OrderBase(BaseModel):
    user_id: int = Field(..., gt=0)


class OrderCreate(OrderBase):
    items: list[OrderItemCreate] = Field(..., min_length=1)


class OrderUpdate(BaseModel):
    status: Literal["pending", "preparing", "ready", "completed", "cancelled"] | None = None


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