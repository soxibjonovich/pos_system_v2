from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator


class UserBase(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=100)


class UserCreate(UserBase):
    pin: int = Field(..., ge=1000, le=999999)

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v):
        pin_str = str(v)
        if len(pin_str) < 4 or len(pin_str) > 6:
            raise ValueError("PIN must be 4-6 digits")
        return v


class User(UserBase):
    id: int
    username: str
    full_name: str
    pin: int
    role: str
    status: str
    last_login: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class Users(BaseModel):
    users: list[User] = []


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=100)
    pin: int | None = Field(None, ge=1000, le=999999)
    role: str | None = None
    status: str | None = None

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v):
        if v is not None:
            pin_str = str(v)
            if len(pin_str) < 4 or len(pin_str) > 6:
                raise ValueError("PIN must be 4-6 digits")
        return v


class UserLogin(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    pin: int = Field(..., ge=1000, le=999999)

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v):
        pin_str = str(v)
        if len(pin_str) < 4 or len(pin_str) > 6:
            raise ValueError("PIN must be 4-6 digits")
        return v
