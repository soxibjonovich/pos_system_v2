from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PrinterBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    host: str = Field(..., min_length=1, max_length=255)
    port: int = Field(..., ge=1, le=65535)
    categories: list[str] = Field(default_factory=list)
    is_active: bool = True


class PrinterCreate(PrinterBase):
    pass


class PrinterUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    host: Optional[str] = Field(None, min_length=1, max_length=255)
    port: Optional[int] = Field(None, ge=1, le=65535)
    categories: Optional[list[str]] = None
    is_active: Optional[bool] = None


class PrinterResponse(PrinterBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PrintersResponse(BaseModel):
    printers: list[PrinterResponse]
    total: int
