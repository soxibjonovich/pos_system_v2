from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class UserBase(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=100)
    pin: int = Field()


class UserCreate(UserBase):
    pin: int = Field(..., ge=1000, le=999999)
    role: str = Field("staff", description="Role (admin, staff, chef)")

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v):
        pin_str = str(v)
        if len(pin_str) < 4 or len(pin_str) > 6:
            raise ValueError("PIN must be 4-6 digits")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        valid_roles = ["admin", "staff", "chef"]
        if v not in valid_roles:
            raise ValueError(f"Role must be one of: {', '.join(valid_roles)}")
        return v


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=100)
    pin: int | None = Field(None, ge=1000, le=999999)
    role: str | None = Field(None, description="Role (admin, staff, chef)")
    status: str | None = Field(None, description="Status (active, inactive)")
    last_login: datetime | None = Field(None, description="Last Login")

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v):
        if v is not None:
            pin_str = str(v)
            if len(pin_str) < 4 or len(pin_str) > 6:
                raise ValueError("PIN must be 4-6 digits")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v is not None:
            valid_roles = ["admin", "staff", "chef"]
            if v not in valid_roles:
                raise ValueError(f"Role must be one of: {', '.join(valid_roles)}")
        return v


class UserResponse(UserBase):
    id: int
    role: str
    status: str
    last_login: datetime | None

    class Config:
        from_attributes = True


class UsersResponse(BaseModel):
    users: list[UserResponse]
