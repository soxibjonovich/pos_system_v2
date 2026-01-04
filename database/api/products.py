from fastapi import APIRouter, status, Depends

from sqlalchemy.ext.asyncio import AsyncSession

from database.database import get_db
from database.crud import products as crud
from database.schemas import products as schema

product_router = APIRouter(prefix="/products", tags=["Products"])


@product_router.get("", status_code=status.HTTP_200_OK)
async def get_products(db: AsyncSession = Depends(get_db)):
    products = await crud.get_products(db)
    return {"products": products}


@product_router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_product(id: int, db: AsyncSession = Depends(get_db)):
    product = await crud.get_product_by_id(db, id)
    return product


@product_router.post("", status_code=status.HTTP_201_CREATED)
async def create_product(
    product: schema.ProductCreate,
    db: AsyncSession = Depends(get_db),
):
    product = await crud.create_product(db, product)
    return product


@product_router.put("/product", status_code=status.HTTP_200_OK)
async def update_product(
    product: schema.Product,
    db: AsyncSession = Depends(get_db),
):
    product = await crud.update_product(db, product)
    return product


@product_router.delete("/product")
async def remove_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
):
    await crud.delete_product(db, product_id)
    return {"status": "ok"}
