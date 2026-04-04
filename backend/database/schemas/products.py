from pydantic import BaseModel, Field
from datetime import datetime


class ProductBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=500)
    category_id: int | None = Field(None, description="Product category ID")
    quantity: int = Field(..., ge=-1, description="Stock quantity. -1 for unlimited")
    unit: str | None = Field(None, max_length=20, description="Unit of measurement (e.g. dona, kg, l, porsi)")
    capacity: float | None = Field(None, gt=0, description="Capacity/volume (e.g. 1.5 for 1.5L)")
    price: float = Field(..., gt=0, description="Selling price")
    is_active: bool = Field(True, description="Product availability status")
    image_url: str | None = None
    image_filename: str | None = None 


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    category_id: int | None = None
    quantity: int | None = Field(None, ge=-1)
    unit: str | None = Field(None, max_length=20)
    capacity: float | None = Field(None, gt=0)
    price: float | None = Field(None, gt=0)
    is_active: bool | None = None
    image_url: str | None = None
    image_filename: str | None = None


class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ProductsResponse(BaseModel):
    products: list[ProductResponse] = []
    total: int = 0