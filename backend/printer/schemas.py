from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Literal


class PrintRequest(BaseModel):
    order_id: int = Field(..., gt=0)
    copies: int = Field(default=1, ge=1, le=5)


class PrintResponse(BaseModel):
    order_id: int
    printed_at: datetime
    copies: int
    status: Literal["success", "failed"]
    message: str


class ReceiptItem(BaseModel):
    product_name: str
    quantity: int
    price: float
    subtotal: float


class ReceiptResponse(BaseModel):
    order_id: int
    order_date: datetime
    items: list[ReceiptItem]
    subtotal: float
    tax: float
    total: float
    table_number: str | None = None
    server_name: str | None = None
    payment_method: str | None = None


class PrintHistoryItem(BaseModel):
    printed_at: datetime
    copies: int
    printed_by: str


class PrintHistoryResponse(BaseModel):
    order_id: int
    prints: list[PrintHistoryItem]


class User(BaseModel):
    id: int
    username: str
    full_name: str
    pin: int
    role: str
    status: str
    last_login: datetime | None = None

    model_config = ConfigDict(from_attributes=True)