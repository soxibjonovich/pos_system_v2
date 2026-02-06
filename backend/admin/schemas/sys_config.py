from typing import Literal

from pydantic import BaseModel, ConfigDict


class BusinessTypeUpdate(BaseModel):
    business_type:Literal["restaurant","market"]

class SystemConfigResponse(BaseModel):
    key:str
    value:str
    model_config=ConfigDict(from_attributes=True)