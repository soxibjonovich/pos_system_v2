from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class OrderItemBase(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)


class OrderItem(OrderItemBase):
    id: int
    order_id: int
    price: float
    subtotal: float

    model_config = ConfigDict(from_attributes=True)


class OrderItemUpdate(BaseModel):
    quantity: Optional[int] = Field(None, gt=0)
    price: Optional[float] = Field(None, gt=0)


class OrderBase(BaseModel):
    user_id: int = Field(..., gt=0)


class OrderStatusUpdate(BaseModel):
    status: Literal["pending", "preparing", "ready", "completed", "cancelled"]


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    payment_method: Optional[str] = None
    order_type: Optional[str] = None
    notes: Optional[str] = None


class OrderResponse(OrderBase):
    id: int
    subtotal_amount: float = 0
    fee_percent: float = 0
    fee_amount: float = 0
    qqs_percent: float = 0
    qqs_amount: float = 0
    total: float
    status: str
    payment_method: Optional[str] = None
    order_type: Optional[str] = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    completed_at: datetime | None = None
    items: list[OrderItem] = []

    model_config = ConfigDict(from_attributes=True)


class OrdersResponse(BaseModel):
    orders: list[OrderResponse] = []
    total: int = 0
