from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator


class UserBase(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=100)


class UserCreate(UserBase):
    pin: int = Field(...)

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v):
        pin_str = str(v)
        if len(pin_str) < 4 or len(pin_str) > 6:
            raise ValueError("PIN must be 4-6 digits")
        return v


class UserResponse(UserBase):
    id: int
    pin: int
    role: str
    status: str
    last_login: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


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


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: int
    role: str


class TokenVerifyRequest(BaseModel):
    token: str


class TokenVerifyResponse(BaseModel):
    valid: bool
    username: str | None = None
    role: str | None = None
