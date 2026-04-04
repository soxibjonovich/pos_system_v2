from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
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


@product_router.get("/export", status_code=status.HTTP_200_OK)
async def export_products(_: user_schema.User = Depends(get_current_admin)):
    result = await product_crud.get_products()
    export_data = {
        "products": [
            {
                "title": p.title,
                "description": p.description,
                "price": p.price,
                "quantity": p.quantity,
                "unit": p.unit,
                "capacity": p.capacity,
                "category_id": p.category_id,
                "is_active": p.is_active,
            }
            for p in result.products
        ]
    }
    return JSONResponse(
        content=export_data,
        headers={"Content-Disposition": "attachment; filename=products.json"},
    )


@product_router.post(
    "/import",
    response_model=product_schema.ProductImportResult,
    status_code=status.HTTP_200_OK,
)
async def import_products(
    data: product_schema.ProductImportRequest,
    _: user_schema.User = Depends(get_current_admin),
):
    existing = await product_crud.get_products()
    existing_by_title = {p.title: p.id for p in existing.products}

    created = updated = failed = 0
    errors: list[str] = []

    for item in data.products:
        try:
            if item.title in existing_by_title:
                result = await product_crud.update_product(
                    product_id=existing_by_title[item.title],
                    title=item.title,
                    description=item.description,
                    price=item.price,
                    quantity=item.quantity,
                    unit=item.unit,
                    capacity=item.capacity,
                    category_id=item.category_id,
                    is_active=item.is_active,
                )
                if result:
                    updated += 1
                else:
                    failed += 1
                    errors.append(f"Failed to update: {item.title}")
            else:
                result = await product_crud.create_product(
                    title=item.title,
                    description=item.description,
                    price=item.price,
                    quantity=item.quantity,
                    unit=item.unit,
                    capacity=item.capacity,
                    category_id=item.category_id,
                    is_active=item.is_active,
                )
                if result:
                    created += 1
                else:
                    failed += 1
                    errors.append(f"Failed to create: {item.title}")
        except Exception as e:
            failed += 1
            errors.append(f"{item.title}: {str(e)}")

    return {"created": created, "updated": updated, "failed": failed, "errors": errors}


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
    unit: Optional[str] = Form(None),
    capacity: Optional[float] = Form(None),
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
        unit=unit,
        capacity=capacity,
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
    unit: Optional[str] = Form(None),
    capacity: Optional[float] = Form(None),
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
        unit=unit,
        capacity=capacity,
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
