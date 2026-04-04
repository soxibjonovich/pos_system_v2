from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class ProductBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=500)
    quantity: int = Field(..., ge=-1)
    unit: str | None = Field(None, max_length=20)
    capacity: float | None = Field(None, gt=0)
    price: float = Field(..., gt=0)


class ProductCreate(ProductBase):
    is_active: bool = True


class ProductUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    quantity: int | None = Field(None, ge=-1)
    unit: str | None = Field(None, max_length=20)
    capacity: float | None = Field(None, gt=0)
    price: float | None = Field(None, gt=0)
    category_id: int | None = Field(None)
    is_active: bool | None = None


class ProductResponse(ProductBase):
    id: int
    is_active: bool
    category_id: int | None
    image_url: str | None = None
    image_filename: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ProductsResponse(BaseModel):
    products: list[ProductResponse] = []
    total: int = 0


class ProductImportItem(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=500)
    price: float = Field(..., gt=0)
    quantity: int = Field(-1, ge=-1)
    unit: str | None = Field(None, max_length=20)
    capacity: float | None = Field(None, gt=0)
    category_id: int | None = None
    is_active: bool = True


class ProductImportRequest(BaseModel):
    products: list[ProductImportItem]


class ProductImportResult(BaseModel):
    created: int
    updated: int
    failed: int
    errors: list[str]
