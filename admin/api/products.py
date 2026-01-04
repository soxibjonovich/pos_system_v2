# from fastapi import APIRouter, status, Depends

# from admin.api.deps import get_current_user, get_current_admin
# from admin.crud import products as crud
# from admin.schemas import products as schema
# from admin.schemas import users as user_schema

# product_router = APIRouter(prefix="/products", tags=["Products"])


# @product_router.get("", status_code=status.HTTP_200_OK)
# async def get_products(
#     current_user: user_schema.User = Depends(get_current_user), 
# ):
#     products = await crud.get_products()
#     return {"products": products}


# @product_router.get("/{id}", status_code=status.HTTP_200_OK)
# async def get_product(
#     id: int, _: user_schema.User = Depends(get_current_admin)
# ):
#     product = await crud.get_product_by_id(id)
#     return product


# @product_router.post("", status_code=status.HTTP_201_CREATED)
# async def create_product(
#     product: schema.ProductCreate,
#     current_user: User = Depends(get_current_admin),
# ):
#     product = await crud.create_product(product)
#     return product


# @product_router.put("/product", status_code=status.HTTP_200_OK)
# async def update_product(
#     product: schema.Product,
#     current_user: User = Depends(get_current_admin),
# ):
#     product = await crud.update_product(product)
#     return product


# @product_router.delete("/product")
# async def remove_product(
#     product_id: int,
#     current_user: User = Depends(get_current_admin),
# ):
#     await crud.delete_product(product_id)
#     return {"status": "ok"}
