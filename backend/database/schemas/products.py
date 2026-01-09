from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    title: str = Field(title="Product title", examples=["Shashlik"], max_length=250)
    description: str | None = Field(
        None,
        title="Product description",
        description="Ingredients of product, ex: Qora non, baliq ...",
        max_length=256,
    )
    quantity: int = Field(
        -1,
        title="Quantity",
        description="If you wanna set quantity infinity skip this field, default -1 (infinity)",
        ge=-1,
    )
    price: float = Field(title="Price", gt=0)


class ProductCreate(ProductBase):
    pass


class Product(ProductBase):
    id: int

    class Config:
        from_attributes = True
