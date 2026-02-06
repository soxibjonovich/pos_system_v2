from datetime import datetime
from typing import Optional

from models import BusinessType, OrderStatus
from pydantic import BaseModel, Field


class OrderItemBase(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemResponse(OrderItemBase):
    id: int
    price: float
    subtotal: float
    product: Optional[dict] = None

    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    business_type: BusinessType = BusinessType.RESTAURANT
    table_id: Optional[int] = None
    customer_name: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


class OrderCreate(OrderBase):
    items: list[OrderItemCreate] = Field(..., min_length=1)


class OrderUpdate(BaseModel):
    table_id: Optional[int] = None
    customer_name: Optional[str] = Field(None, max_length=100)
    status: Optional[OrderStatus] = None
    notes: Optional[str] = None


class OrderResponse(OrderBase):
    id: int
    user_id: int
    total: float
    status: OrderStatus
    created_at: datetime
    updated_at: Optional[datetime]
    completed_at: Optional[datetime]
    items: list[OrderItemResponse]
    user: Optional[dict] = None
    table: Optional[dict] = None

    class Config:
        from_attributes = True


class OrdersResponse(BaseModel):
    orders: list[OrderResponse]
    total: int