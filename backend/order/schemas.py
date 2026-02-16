from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime
from typing import Literal


class OrderItemBase(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemUpdate(BaseModel):
    quantity: int | None = Field(None, gt=0)
    price: float | None = Field(None, gt=0)


class OrderItem(OrderItemBase):
    id: int
    order_id: int
    subtotal: float
    product: dict | None = None  # ADD THIS LINE

    model_config = ConfigDict(from_attributes=True)


class OrderBase(BaseModel):
    user_id: int = Field(..., gt=0)
    table_id: int | None = None  # ADD THIS LINE


class OrderCreate(OrderBase):
    items: list[OrderItemCreate] = Field(default_factory=list)

    @field_validator("items")
    @classmethod
    def validate_items(cls, v):
        if not v:
            raise ValueError("Order must have at least one item")
        return v


class OrderUpdate(BaseModel):
    status: (
        Literal["pending", "preparing", "ready", "completed", "cancelled"] | None
    ) = None


class OrderResponse(OrderBase):
    id: int
    total: float
    status: str
    created_at: datetime
    updated_at: datetime | None = None
    items: list[OrderItem] = Field(default_factory=list)
    user: dict | None = None  # ADD THIS LINE
    table: dict | None = None  # ADD THIS LINE

    model_config = ConfigDict(from_attributes=True)


class OrdersResponse(BaseModel):
    orders: list[OrderResponse] = Field(default_factory=list)
    total: int = 0


class User(BaseModel):
    id: int
    username: str
    full_name: str
    pin: int
    role: str
    status: str
    last_login: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class OrderStatusUpdate(BaseModel):
    status: Literal["pending", "preparing", "ready", "completed", "cancelled"]


class OrderTotalResponse(BaseModel):
    order_id: int
    total: float
    items_count: int


class TableResponse(BaseModel):
    id: int
    number: str
    capacity: int = 4
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TablesResponse(BaseModel):
    tables: list[TableResponse] = Field(default_factory=list)
    total: int = 0


class SystemConfigResponse(BaseModel):
    business_type: Literal["restaurant", "market"]