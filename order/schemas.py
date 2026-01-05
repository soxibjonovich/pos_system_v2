# order/schemas.py
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class OrderItemBase(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)


class OrderItemCreate(OrderItemBase):
    pass


class OrderItem(OrderItemBase):
    id: int
    order_id: int
    subtotal: float

    model_config = ConfigDict(from_attributes=True)


class OrderBase(BaseModel):
    user_id: int


class OrderCreate(OrderBase):
    items: list[OrderItemCreate] = []


class OrderUpdate(BaseModel):
    status: str | None = None


class OrderResponse(OrderBase):
    id: int
    total: float
    status: str
    created_at: datetime
    updated_at: datetime | None = None
    items: list[OrderItem] = []

    model_config = ConfigDict(from_attributes=True)


class User(BaseModel):
    id: int
    username: str
    full_name: str
    pin: int
    role: str
    status: str
    last_login: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
