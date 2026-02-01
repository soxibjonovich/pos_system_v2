from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class ProductBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=500)
    quantity: int = Field(..., ge=-1)
    price: float = Field(..., gt=0)


class ProductCreate(ProductBase):
    is_active: bool = True


class ProductUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    quantity: int | None = Field(None, ge=-1)
    price: float | None = Field(None, gt=0)
    category_id: int | None = Field(None)
    is_active: bool | None = None


class ProductResponse(ProductBase):
    id: int
    is_active: bool
    category_id: int | None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ProductsResponse(BaseModel):
    products: list[ProductResponse] = []
    total: int = 0
