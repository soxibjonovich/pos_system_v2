from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from crud import products as crud
from schemas import products as schema

router = APIRouter(tags=["Products"])


@router.get("", response_model=schema.ProductsResponse)
async def get_products(db: AsyncSession = Depends(get_db)):
    """Get all products"""
    products = await crud.get_products(db)
    return {"products": products, "total": len(products)}


@router.get("/{product_id}", response_model=schema.ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific product by ID"""
    product = await crud.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )
    return product


@router.post(
    "", response_model=schema.ProductResponse, status_code=status.HTTP_201_CREATED
)
async def create_product(
    product: schema.ProductCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new product"""
    # Check if product with same title exists
    existing = await crud.get_product_by_title(db, product.title)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product with this title already exists",
        )

    # Validate category if provided
    if product.category_id:
        from crud import categories as cat_crud

        category = await cat_crud.get_category_by_id(db, product.category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category with id {product.category_id} not found",
            )

    return await crud.create_product(db, product)


@router.put("/{product_id}", response_model=schema.ProductResponse)
async def update_product(
    product_id: int,
    product: schema.ProductUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a product"""
    # Check if product title is being changed and if new title exists
    if product.title:
        existing = await crud.get_product_by_title(db, product.title)
        if existing and existing.id != product_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product with this title already exists",
            )

    # Validate category if being updated
    if product.category_id:
        from crud import categories as cat_crud

        category = await cat_crud.get_category_by_id(db, product.category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category with id {product.category_id} not found",
            )

    updated = await crud.update_product(db, product_id, product)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )
    return updated


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a product"""
    deleted = await crud.delete_product(db, product_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )
