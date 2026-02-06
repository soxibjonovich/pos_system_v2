from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator


class TableBase(BaseModel):
    number: str = Field(..., min_length=1, max_length=20)
    capacity: int | None = Field(None, gt=0)


class TableCreate(TableBase):
    pass


class Table(TableBase):
    id: int
    status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None
    
    model_config = ConfigDict(from_attributes=True)


class Tables(BaseModel):
    tables: list[Table] = []


class TableUpdate(BaseModel):
    number: str | None = Field(None, min_length=1, max_length=20)
    capacity: int | None = Field(None, gt=0)
    status: str | None = None
    is_active: bool | None = None
    
    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = ["available", "occupied", "reserved"]
            if v not in valid_statuses:
                raise ValueError(f"Status must be one of: {', '.join(valid_statuses)}")
        return v


class TableStatusUpdate(BaseModel):
    status: str = Field(..., description="Table status: available, occupied, or reserved")
    
    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        valid_statuses = ["available", "occupied", "reserved"]
        if v not in valid_statuses:
            raise ValueError(f"Status must be one of: {', '.join(valid_statuses)}")
        return v