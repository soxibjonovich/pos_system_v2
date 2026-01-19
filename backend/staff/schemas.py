from pydantic import BaseModel, Field


class StaffOrderCreate(BaseModel):
    user_id: int = Field(..., description="Staff user ID")
    items: list[dict] = Field(..., description="Order items")


class StaffProductSearch(BaseModel):
    query: str | None = None
    category_id: int | None = None
    is_active: bool = True


class StaffOrderResponse(BaseModel):
    id: int
    user_id: int
    total: float
    status: str
    items: list[dict]
    created_at: str

    model_config = {"from_attributes": True}


class StaffOrdersResponse(BaseModel):
    orders: list[StaffOrderResponse] = []
    total: int = 0
