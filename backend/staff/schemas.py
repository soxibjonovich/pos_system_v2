from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Literal

# ==================== Product Schemas ====================
class OrderItem(BaseModel):
    """Individual item in an order"""
    product_id: int = Field(..., description="Product ID", gt=0)
    quantity: int = Field(..., description="Quantity", gt=0)

class ProductResponse(BaseModel):
    """Product response model"""
    id: int
    name: str
    description: str | None = None
    price: float
    category_id: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None
    
    model_config = ConfigDict(from_attributes=True)

class ProductsResponse(BaseModel):
    """List of products"""
    products: list[ProductResponse] = []
    total: int = 0

# ==================== Category Schemas ====================
class CategoryResponse(BaseModel):
    """Category response model"""
    id: int
    name: str
    description: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None
    
    model_config = ConfigDict(from_attributes=True)

class CategoriesResponse(BaseModel):
    """List of categories"""
    categories: list[CategoryResponse] = []
    total: int = 0

# ==================== Table Schemas ====================
class TableBase(BaseModel):
    """Base table model"""
    number: str = Field(..., min_length=1, max_length=20)
    capacity: int | None = Field(None, gt=0)

class Table(TableBase):
    """Table model with all fields"""
    id: int
    status: Literal["available", "occupied", "reserved"]
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None
    
    model_config = ConfigDict(from_attributes=True)

class Tables(BaseModel):
    """List of tables"""
    tables: list[Table] = []
    total: int = 0

class TableStatusUpdate(BaseModel):
    """Update table status"""
    status: Literal["available", "occupied", "reserved"] = Field(
        ..., 
        description="Table status"
    )

# ==================== Order Schemas ====================
class StaffOrderCreate(BaseModel):
    """Create a new order from staff POS"""
    user_id: int = Field(..., description="Staff user ID", gt=0)
    table_id: int | None = Field(None, description="Table ID (required for restaurant)", gt=0)
    business_type: Literal["restaurant", "retail"] = Field(..., description="Business type")
    customer_name: str | None = Field(None, description="Customer name", max_length=100)
    items: list[OrderItem] = Field(..., description="Order items", min_length=1)

class StaffOrderUpdate(BaseModel):
    """Update an existing order"""
    user_id: int = Field(..., description="Staff user ID", gt=0)
    table_id: int | None = Field(None, description="New table ID", gt=0)
    items: list[OrderItem] = Field(..., description="Updated order items", min_length=1)

class OrderStatusUpdate(BaseModel):
    """Update order status"""
    status: Literal["pending", "preparing", "ready", "completed", "cancelled"] = Field(
        ..., 
        description="Order status"
    )

class OrderItemUpdate(BaseModel):
    """Update order item quantity or price"""
    quantity: int | None = Field(None, description="Item quantity", gt=0)
    price: float | None = Field(None, description="Item price", gt=0)

class OrderItemResponse(BaseModel):
    """Order item response model"""
    id: int
    product_id: int
    product_name: str
    quantity: int
    price: float
    subtotal: float
    
    model_config = ConfigDict(from_attributes=True)

class StaffOrderResponse(BaseModel):
    """Staff order response model"""
    id: int
    user_id: int
    table_id: int | None = None
    business_type: str
    customer_name: str | None = None
    total: float
    status: Literal["pending", "preparing", "ready", "completed", "cancelled"]
    items: list[OrderItemResponse]
    created_at: datetime
    updated_at: datetime | None = None
    
    model_config = ConfigDict(from_attributes=True)

class StaffOrdersResponse(BaseModel):
    """List of staff orders"""
    orders: list[StaffOrderResponse] = []
    total: int = 0

# ==================== Search Schemas ====================
class StaffProductSearch(BaseModel):
    """Product search parameters"""
    query: str | None = Field(None, description="Search query", max_length=200)
    category_id: int | None = Field(None, description="Filter by category", gt=0)
    is_active: bool = Field(True, description="Filter by active status")