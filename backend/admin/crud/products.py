import httpx
from fastapi import HTTPException, status
from schemas import products as schema


class ServiceClient:
    def __init__(self):
        self.client = httpx.AsyncClient(base_url="http://127.0.0.1:8002", timeout=10.0)

    async def close(self):
        await self.client.aclose()


service_client = ServiceClient()


async def get_products() -> schema.ProductsResponse:
    try:
        response = await service_client.client.get("/products")
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch products",
            )

        data = response.json()
        return schema.ProductsResponse.model_validate(data)

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching products: {str(e)}",
        )


async def get_product_by_id(product_id: int) -> schema.ProductResponse | None:
    try:
        response = await service_client.client.get(f"/products/{product_id}")

        if response.status_code == 404:
            return None

        if response.status_code != 200:
            return None

        data = response.json()
        return schema.ProductResponse(**data)

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except HTTPException:
        raise
    except Exception:
        return None


async def create_product(
    product: schema.ProductCreate,
) -> schema.ProductResponse | None:
    try:
        response = await service_client.client.post(
            "/products", json=product.model_dump()
        )

        if response.status_code == 201:
            data = response.json()
            return schema.ProductResponse(**data)

        return None

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return None


async def update_product(
    product_id: int, product: schema.ProductUpdate
) -> schema.ProductResponse | None:
    try:
        response = await service_client.client.put(
            f"/products/{product_id}", json=product.model_dump(exclude_unset=True)
        )

        if response.status_code == 404:
            return None

        if response.status_code == 200:
            data = response.json()
            return schema.ProductResponse(**data)

        return None

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return None


async def delete_product(product_id: int) -> bool:
    try:
        response = await service_client.client.delete(f"/products/{product_id}")
        return response.status_code == 204

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return False
