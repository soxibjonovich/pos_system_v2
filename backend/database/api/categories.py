from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from crud import categories as crud
from schemas import categories as schema

router = APIRouter(prefix="", tags=["Categories"])


@router.get("", response_model=schema.CategoriesResponse)
async def get_categories(db: AsyncSession = Depends(get_db)):
    categories = await crud.get_categories(db)
    return {"categories": categories, "total": len(categories)}


@router.get("/{category_id}", response_model=schema.CategoryResponse)
async def get_category(category_id: int, db: AsyncSession = Depends(get_db)):
    category = await crud.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("", response_model=schema.CategoryResponse, status_code=201)
async def create_category(
    category: schema.CategoryCreate, db: AsyncSession = Depends(get_db)
):
    existing = await crud.get_category_by_name(db, category.name)
    if existing:
        raise HTTPException(status_code=400, detail="Category name already exists")
    
    return await crud.create_category(db, category)


@router.put("/{category_id}", response_model=schema.CategoryResponse)
async def update_category(
    category_id: int,
    category: schema.CategoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    updated = await crud.update_category(db, category_id, category)
    if not updated:
        raise HTTPException(status_code=404, detail="Category not found")
    return updated


@router.delete("/{category_id}", status_code=204)
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await crud.delete_category(db, category_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Category not found")