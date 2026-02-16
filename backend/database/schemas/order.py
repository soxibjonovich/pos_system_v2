from datetime import datetime
from typing import Optional, Any
from models import BusinessType, OrderStatus
from pydantic import BaseModel, Field, field_serializer


class OrderItemBase(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)


class OrderItemCreate(OrderItemBase):
    price: float = Field(..., gt=0)


class OrderItemResponse(OrderItemBase):
    id: int
    order_id: int  # ADD THIS LINE (it was missing!)
    price: float
    subtotal: float
    product: Optional[Any] = None

    @field_serializer('product')
    def serialize_product(self, product: Any, _info):
        if product is None:
            return None
        if hasattr(product, '__dict__'):
            return {
                'id': product.id,
                'title': product.title,
                'price': float(product.price),
                'is_active': product.is_active
            }
        return product

    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    table_id: Optional[int] = None


class OrderCreate(OrderBase):
    business_type: BusinessType = BusinessType.MARKET
    items: list[OrderItemCreate] = Field(..., min_length=1)


class OrderUpdate(BaseModel):
    table_id: Optional[int] = None
    status: Optional[OrderStatus] = None


class OrderResponse(OrderBase):
    id: int
    user_id: int
    total: float
    status: OrderStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: list[OrderItemResponse]
    user: Optional[Any] = None
    table: Optional[Any] = None

    @field_serializer('user')
    def serialize_user(self, user: Any, _info):
        if user is None:
            return None
        if hasattr(user, '__dict__'):
            return {
                'id': user.id,
                'username': user.username,
                'full_name': user.full_name,
                'role': user.role
            }
        return user

    @field_serializer('table')
    def serialize_table(self, table: Any, _info):
        if table is None:
            return None
        if hasattr(table, '__dict__'):
            return {
                'id': table.id,
                'number': table.number,
                'capacity': table.capacity,
                'status': table.status
            }
        return table

    class Config:
        from_attributes = True


class OrdersResponse(BaseModel):
    orders: list[OrderResponse]
    total: int = 0