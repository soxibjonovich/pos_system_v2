from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    title: str = Field(...)
    description: str | None = Field()
    quantity: int = Field()
    price: float = Field()


class Product(ProductBase):
    pass


class Products(BaseModel):
    products: list[Product]
