import httpx
from fastapi import UploadFile
from fastapi import HTTPException, status
from config import settings
from schemas import products as schema


class ServiceClient:
    def __init__(self):
        self.client = httpx.AsyncClient(
            base_url=settings.DATABASE_SERVICE_URL, timeout=10.0
        )

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
    title: str,
    price: float,
    quantity: int,
    is_active: bool,
    description: str | None = None,
    category_id: int | None = None,
    image: UploadFile | None = None,
) -> schema.ProductResponse | None:
    try:
        data: dict[str, str] = {
            "title": str(title),
            "price": str(price),
            "quantity": str(quantity),
            "is_active": str(is_active).lower(),
        }

        if description is not None:
            data["description"] = description
        if category_id is not None:
            data["category_id"] = str(category_id)

        files = None
        if image and image.filename:
            image.file.seek(0)
            files = {
                "image": (
                    image.filename,
                    image.file,
                    image.content_type or "application/octet-stream",
                )
            }

        response = await service_client.client.post("/products", data=data, files=files)

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
    product_id: int,
    title: str | None = None,
    description: str | None = None,
    price: float | None = None,
    quantity: int | None = None,
    category_id: int | None = None,
    is_active: bool | None = None,
    image: UploadFile | None = None,
    remove_image: bool = False,
) -> schema.ProductResponse | None:
    try:
        data: dict[str, str] = {}
        if title is not None:
            data["title"] = title
        if description is not None:
            data["description"] = description
        if price is not None:
            data["price"] = str(price)
        if quantity is not None:
            data["quantity"] = str(quantity)
        if category_id is not None:
            data["category_id"] = str(category_id)
        if is_active is not None:
            data["is_active"] = str(is_active).lower()
        if remove_image:
            data["remove_image"] = "true"

        files = None
        if image and image.filename:
            image.file.seek(0)
            files = {
                "image": (
                    image.filename,
                    image.file,
                    image.content_type or "application/octet-stream",
                )
            }

        response = await service_client.client.put(
            f"/products/{product_id}", data=data, files=files
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
