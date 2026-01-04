from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict, field_validator


class UserBase(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=100)

class User(BaseModel):
    username: str
    full_name: str
    pin: int
    role: str = "STAFF"
    status: str = "INACTIVE"
    last_login: datetime = datetime.now()
    work_status: str = "INACTIVE"

    model_config = ConfigDict(from_attributes=True)

class Users(BaseModel):
    users: list[User]

class UserLogin(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    pin: int = Field(...)

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v):
        pin_str = str(v)
        if len(pin_str) < 4 or len(pin_str) > 6:
            raise ValueError("PIN must be 4-6 digits")
        return v