from datetime import datetime

from pydantic import BaseModel, Field


class PrinterBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    host: str = Field(..., min_length=1, max_length=255)
    port: int = Field(..., ge=1, le=65535)
    categories: list[str] = []
    is_active: bool = True


class PrinterCreate(PrinterBase):
    pass


class PrinterUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    host: str | None = Field(None, min_length=1, max_length=255)
    port: int | None = Field(None, ge=1, le=65535)
    categories: list[str] | None = None
    is_active: bool | None = None


class PrinterResponse(PrinterBase):
    id: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class PrintersResponse(BaseModel):
    printers: list[PrinterResponse] = []
    total: int = 0
