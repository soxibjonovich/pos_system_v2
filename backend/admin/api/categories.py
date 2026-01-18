from fastapi import APIRouter, HTTPException, status
from crud import categories as crud
from schemas import categories as schema

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=schema.CategoriesResponse)
async def get_categories():
    """Get all categories"""
    return await crud.get_categories()


@router.get("/{category_id}", response_model=schema.CategoryResponse)
async def get_category(category_id: int):
    """Get a specific category by ID"""
    category = await crud.get_category_by_id(category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with id {category_id} not found"
        )
    return category


@router.post("", response_model=schema.CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(category: schema.CategoryCreate):
    """Create a new category"""
    return await crud.create_category(category)


@router.put("/{category_id}", response_model=schema.CategoryResponse)
async def update_category(category_id: int, category: schema.CategoryUpdate):
    """Update a category"""
    updated = await crud.update_category(category_id, category)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with id {category_id} not found"
        )
    return updated


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: int):
    """Delete a category"""
    deleted = await crud.delete_category(category_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with id {category_id} not found"
        )