from pydantic import BaseModel, Field, field_validator


class UserBase(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=100)
    pin: int = Field()


class UserCreate(UserBase):
    pin: int = Field(..., ge=1000, le=999999)

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v):
        pin_str = str(v)
        if len(pin_str) < 4 or len(pin_str) > 6:
            raise ValueError("PIN must be 4-6 digits")
        return v


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=100)
    pin: int | None = Field(None, ge=1000, le=999999)
    role: str | None = Field(None, description="Role (admin, staff)")

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v):
        if v is not None:
            pin_str = str(v)
            if len(pin_str) < 4 or len(pin_str) > 6:
                raise ValueError("PIN must be 4-6 digits")
        return v


class UserResponse(UserBase):
    id: int
    role: str
    status: str

    model_config = {"from_attributes": True}
