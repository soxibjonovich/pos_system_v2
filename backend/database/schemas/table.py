from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from models import TableStatus


class TableBase(BaseModel):
    number: str = Field(..., min_length=1, max_length=20)
    capacity: Optional[int] = Field(None, gt=0)
    is_active: bool = True


class TableCreate(TableBase):
    pass


class TableUpdate(BaseModel):
    number: Optional[str] = Field(None, min_length=1, max_length=20)
    capacity: Optional[int] = Field(None, gt=0)
    status: Optional[TableStatus] = None
    is_active: Optional[bool] = None


class TableResponse(TableBase):
    id: int
    status: TableStatus
    created_at: datetime
    # updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class TablesResponse(BaseModel):
    tables: list[TableResponse]
    total: int