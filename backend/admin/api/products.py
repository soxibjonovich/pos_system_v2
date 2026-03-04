from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
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
    title: str = Form(...),
    description: Optional[str] = Form(None),
    price: float = Form(...),
    quantity: int = Form(-1),
    category_id: Optional[int] = Form(None),
    is_active: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    _: user_schema.User = Depends(get_current_admin),
):
    created_product = await product_crud.create_product(
        title=title,
        description=description,
        price=price,
        quantity=quantity,
        category_id=category_id,
        is_active=is_active,
        image=image,
    )

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
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    quantity: Optional[int] = Form(None),
    category_id: Optional[int] = Form(None),
    is_active: Optional[bool] = Form(None),
    image: Optional[UploadFile] = File(None),
    remove_image: bool = Form(False),
    _: user_schema.User = Depends(get_current_admin),
):
    updated_product = await product_crud.update_product(
        product_id=product_id,
        title=title,
        description=description,
        price=price,
        quantity=quantity,
        category_id=category_id,
        is_active=is_active,
        image=image,
        remove_image=remove_image,
    )

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
