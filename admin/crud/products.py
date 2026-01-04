import httpx

from fastapi import HTTPException, status
from admin.schemas import products as schema


client = httpx.AsyncClient(base_url="http://127.0.0.1:8003")

async def get_products():
    try:
        response = await client.get("/products")
        return schema.Products.model_validate_json(response.content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e
        )
	
async def get_product_by_id(id: int):
    try:
        response = await client.get(f"/products/{id}")
        return schema.Product.model_validate_json(response.content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=e
        )