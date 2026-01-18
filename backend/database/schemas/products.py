from pydantic import BaseModel, Field
from datetime import datetime


class ProductBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=500)
    category_id: int | None = Field(None, description="Product category ID")
    quantity: int = Field(..., ge=-1, description="Stock quantity. -1 for unlimited")
    price: float = Field(..., gt=0, description="Selling price")
    cost: float | None = Field(None, ge=0, description="Cost price (optional)")
    is_active: bool = Field(True, description="Product availability status")


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    category_id: int | None = None
    quantity: int | None = Field(None, ge=-1)
    price: float | None = Field(None, gt=0)
    cost: float | None = Field(None, ge=0)
    is_active: bool | None = None


class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime | None = None
    
    model_config = {"from_attributes": True}


class ProductsResponse(BaseModel):
    products: list[ProductResponse] = []
    total: int = 0