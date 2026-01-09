from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, Literal


class UserBase(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=100)


class UserCreate(UserBase):
    pin: int = Field(..., ge=1000, le=999999)

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v: int) -> int:
        pin_str = str(v)
        if len(pin_str) not in (4, 5, 6):
            raise ValueError("PIN must be 4-6 digits")
        return v


class UserResponse(UserBase):
    id: int
    pin: int              # Consider hiding in production response!
    role: str
    status: str
    last_login: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,           # for SQLAlchemy ORM
        populate_by_name=True,          # very useful with aliases
        json_encoders={datetime: lambda v: v.isoformat()}
    )


class UserLogin(BaseModel):
    user_id: int = Field(..., gt=0, description="Selected user ID")
    pin: int = Field(..., ge=1000, le=999999, description="User PIN")

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v: int) -> int:
        pin_str = str(v)
        if len(pin_str) not in (4, 5, 6):
            raise ValueError("PIN must be 4-6 digits")
        return v


class UserLoginOption(BaseModel):
    id: int
    username: str
    full_name: str
    role: str

    # Very useful if your API returns snake_case
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        # If needed — add aliases:
        # full_name: str = Field(..., alias="full_name")
    )


class UserLoginOptionsResponse(BaseModel):
    users: list[UserLoginOption] = Field(default_factory=list)
    # count: int = Field(default=0)  # optional - convenient


class TokenResponse(BaseModel):
    access_token: str
    role: str
    token_type: str = "bearer"
    expires_at: int  # unix timestamp usually

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_at": 1736438400
            }
        }
    )