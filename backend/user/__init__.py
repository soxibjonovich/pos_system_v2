from fastapi import FastAPI, HTTPException, Query, Path, status
from typing import Optional
from .schemas import (
    UserCreate,
    UserUpdate,
    UserListResponse,
    UserDetailResponse,
    DeleteResponse,
    UserPermissionsResponse,
    UserRole,
    UserStatus,
    ErrorResponse
)

user = FastAPI(
    title="User Service",
    version="1.0.0",
    description="User service",
    docs_url="/docs",
    redoc_url="/redoc",
)

# GET /users - List all users
@user.get("/users", response_model=UserListResponse, tags=["Users"])
async def get_users(
    secret: str = Query(..., description="User secret token"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    role: Optional[UserRole] = Query(None, description="Filter by role"),
    status: Optional[UserStatus] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by username or full name")
):
    """
    Get list of all users with pagination and filters
    """
    return {"status": "success"}
    # todo()!


# GET /users/{id} - Get user details
@user.get("/users/{id}", response_model=UserDetailResponse, tags=["Users"])
async def get_user_by_id(
    id: int = Path(..., ge=1, description="User ID"),
    secret: str = Query(..., description="User secret token")
):
    """
    Get specific user details by ID
    """
    return {"status": "success"}
    # todo()!

# POST /users - Create new user
@user.post(
    "/users", 
    response_model=UserDetailResponse, 
    status_code=status.HTTP_201_CREATED,
    tags=["Users"]
)
async def create_new_user(
    user_data: UserCreate,
    secret: str = Query(..., description="User secret token")
):
    """
    Create a new user
    
    Required fields:
    - username: 3-50 characters, alphanumeric
    - full_name: 2-100 characters
    - password: minimum 6 characters
    
    Optional fields:
    - email: valid email address
    - role: admin, manager, cashier, waiter, cook (default: cashier)
    - phone: valid phone number
    - pin: 4-6 digits for quick POS login
    - status: active, inactive, suspended (default: active)
    """
    return {"status": "success"}
    # todo()!

# PUT /users/{id} - Update user
@user.put("/users/{id}", response_model=UserDetailResponse, tags=["Users"])
async def update_user(
    id: int = Path(..., ge=1, description="User ID"),
    user_data: UserUpdate = ...,
    secret: str = Query(..., description="User secret token")
):
    """
    Update user information
    
    All fields are optional. Only provided fields will be updated.
    """
    return {"status": "success"}
    # todo()!

# DELETE /users/{id} - Delete user
@user.delete("/users/{id}", response_model=DeleteResponse, tags=["Users"])
async def delete_user(
    id: int = Path(..., ge=1, description="User ID"),
    secret: str = Query(..., description="User secret token")
):
    """
    Delete a user
    
    Note: Cannot delete the last admin user
    """
    return {"status": "success"}
    # todo()!

# GET /users/{id}/permissions - Get user permissions
@user.get("/users/{id}/permissions", response_model=UserPermissionsResponse, tags=["Users", "Permissions"])
async def get_user_permissions(
    id: int = Path(..., ge=1, description="User ID"),
    secret: str = Query(..., description="User secret token")
):
    """
    Get user permissions based on their role
    
    Returns list of modules and CRUD permissions for each
    """
    return {"status": "success"}
    # todo()!

# Error handlers
@user.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return ErrorResponse(error=exc.detail)

@user.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return ErrorResponse(error="Internal server error")