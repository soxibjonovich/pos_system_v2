from api.deps import get_current_admin
from crud import users as crud
from fastapi import APIRouter, Depends, HTTPException, status
from schemas import users as schema
from schemas.users import User

users_router = APIRouter(prefix="/users", tags=["Users"])


@users_router.get("", response_model=schema.Users)
async def get_users(
    _: User = Depends(get_current_admin),
):
    """Get all users"""
    return await crud.get_users()


@users_router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: int,
    _: User = Depends(get_current_admin),
):
    """Get a specific user by ID"""
    user = await crud.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@users_router.post("", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: schema.UserCreate,
    _: User = Depends(get_current_admin),
):
    """Create a new user (cashier/manager)"""
    user = await crud.create_user(user_in)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists"
        )
    return user


@users_router.post("/admin", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_admin(
    user_in: schema.UserCreate,
    _: User = Depends(get_current_admin),
):
    """Create a new administrator account"""
    user = await crud.create_admin(user_in)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists"
        )
    return user


@users_router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: int,
    user_in: schema.UserUpdate,
    _: User = Depends(get_current_admin),
):
    """Update user details"""
    user = await crud.update_user(user_id, user_in)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@users_router.patch("/{user_id}/role", response_model=User)
async def update_user_role(
    user_id: int,
    role_data: schema.UserRoleUpdate,
    # current_admin: User = Depends(get_current_admin),
):
    """Update user role (admin, manager, cashier)"""
    try:
        # # Prevent self-demotion
        # if user_id == current_admin.id and role_data.role != "admin":
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail="Cannot change your own admin role"
        #     )

        # Check if user exists
        user = await crud.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        # Validate role
        valid_roles = ["admin", "manager", "cashier"]
        if role_data.role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}",
            )

        # Update the role
        updated_user = await crud.update_user_role(user_id, role_data.role)
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user role",
            )

        return updated_user

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user role: {str(e)}",
        )


@users_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user(user_id: int, current_admin: User = Depends(get_current_admin)):
    """Delete a user"""
    # Prevent self-deletion
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete your own account",
        )

    deleted = await crud.delete_user(user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
