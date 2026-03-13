from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class BusinessTypeUpdate(BaseModel):
    business_type: Literal["restaurant", "market"]


class ServiceFeeUpdate(BaseModel):
    service_fee_percent: float = Field(..., ge=0, le=100)


class SystemConfigResponse(BaseModel):
    key: str
    value: str
    model_config = ConfigDict(from_attributes=True)
