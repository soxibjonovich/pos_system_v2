from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    CASHIER = "cashier"
    WAITER = "waiter"
    COOK = "cook"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

# Request Schemas
class LoginUser(BaseModel):
    login: str
    password: str

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)
    role: UserRole = UserRole.CASHIER
    phone: Optional[str] = Field(None, pattern=r'^\+?[1-9]\d{1,14}$')
    pin: Optional[str] = Field(None, pattern=r'^\d{4,6}$')
    status: UserStatus = UserStatus.ACTIVE

    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must be alphanumeric (can include _ and -)')
        return v.lower()

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    password: Optional[str] = Field(None, min_length=6, max_length=100)
    role: Optional[UserRole] = None
    phone: Optional[str] = Field(None, pattern=r'^\+?[1-9]\d{1,14}$')
    pin: Optional[str] = Field(None, pattern=r'^\d{4,6}$')
    status: Optional[UserStatus] = None

# Response Schemas
class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    full_name: str
    role: UserRole
    phone: Optional[str] = None
    status: UserStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    success: bool = True
    data: List[UserResponse]
    total: int
    page: int = 1
    limit: int = 20

class UserDetailResponse(BaseModel):
    success: bool = True
    data: UserResponse

class LoginResponse(BaseModel):
    success: bool = True
    secret: str
    user: UserResponse
    expires_at: datetime

class DeleteResponse(BaseModel):
    success: bool = True
    message: str = "User deleted successfully"

# Permissions Schemas
class Permission(BaseModel):
    module: str
    can_view: bool = False
    can_create: bool = False
    can_edit: bool = False
    can_delete: bool = False

class UserPermissions(BaseModel):
    user_id: int
    role: UserRole
    permissions: List[Permission]

class UserPermissionsResponse(BaseModel):
    success: bool = True
    data: UserPermissions

# Error Response
class ErrorResponse(BaseModel):
    success: bool = False
    error: str