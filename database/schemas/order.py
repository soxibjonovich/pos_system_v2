from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class OrderItemBase(BaseModel):
    product_id: int
    quantity: int
    subtotal: float

    class Config:
        orm_mode = True


class OrderBase(BaseModel):
    user_id: int
    total: float
    status: str  # For example: 'pending', 'preparing', 'ready', etc.
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class OrderCreate(OrderBase):
    items: List[OrderItemBase]  # List of items to be included in the order


class OrderUpdate(BaseModel):
    status: Optional[str] = None  # Status like 'pending', 'completed', etc.
    total: Optional[float] = None  # Total amount for the order

    class Config:
        orm_mode = True


class OrderResponse(OrderBase):
    id: int  # Order ID that will be returned in the response