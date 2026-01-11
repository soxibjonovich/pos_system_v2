from fastapi import APIRouter, Depends, HTTPException, status
from .deps import get_current_admin
from crud import products as product_crud
from schemas import products as product_schema
from schemas import users as user_schema

product_router = APIRouter(prefix="/products", tags=["Products"])


@product_router.get(
    "", response_model=product_schema.ProductsResponse, status_code=status.HTTP_200_OK
)
async def get_products(_: user_schema.User = Depends(get_current_admin)):
    return await product_crud.get_products()


@product_router.get(
    "/{product_id}",
    response_model=product_schema.ProductResponse,
    status_code=status.HTTP_200_OK,
)
async def get_product(
    product_id: int, _: user_schema.User = Depends(get_current_admin)
):
    product = await product_crud.get_product_by_id(product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    return product


@product_router.post(
    "",
    response_model=product_schema.ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_product(
    product: product_schema.ProductCreate,
    _: user_schema.User = Depends(get_current_admin),
):
    created_product = await product_crud.create_product(product)

    if not created_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create product"
        )

    return created_product


@product_router.put(
    "/{product_id}",
    response_model=product_schema.ProductResponse,
    status_code=status.HTTP_200_OK,
)
async def update_product(
    product_id: int,
    product: product_schema.ProductUpdate,
    _: user_schema.User = Depends(get_current_admin),
):
    updated_product = await product_crud.update_product(product_id, product)

    if not updated_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    return updated_product


@product_router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    _: user_schema.User = Depends(get_current_admin),
):
    deleted = await product_crud.delete_product(product_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )
