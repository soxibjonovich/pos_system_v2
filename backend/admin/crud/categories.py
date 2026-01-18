import httpx
from fastapi import HTTPException, status
from config import settings
from schemas import categories as schema


class ServiceClient:
    def __init__(self):
        self.client = httpx.AsyncClient(base_url=settings.DATABASE_SERVICE_URL, timeout=10.0)
    
    async def close(self):
        await self.client.aclose()


service_client = ServiceClient()


async def get_categories() -> schema.CategoriesResponse:
    """Get all categories from database service"""
    try:
        response = await service_client.client.get("/categories")
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch categories",
            )
        data = response.json()
        return schema.CategoriesResponse(**data)
    except httpx.ConnectError as e:
        print(e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching categories: {str(e)}",
        )


async def get_category_by_id(category_id: int) -> schema.CategoryResponse | None:
    """Get a category by ID from database service"""
    try:
        response = await service_client.client.get(f"/categories/{category_id}")
        if response.status_code == 404:
            return None
        if response.status_code != 200:
            return None
        data = response.json()
        return schema.CategoryResponse(**data)
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except HTTPException:
        raise
    except Exception:
        return None


async def create_category(category: schema.CategoryCreate) -> schema.CategoryResponse:
    """Create a new category via database service"""
    try:
        response = await service_client.client.post(
            "/categories",
            json=category.model_dump()
        )
        if response.status_code == 400:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists",
            )
        if response.status_code != 201:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create category",
            )
        data = response.json()
        return schema.CategoryResponse(**data)
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
            detail=f"Error creating category: {str(e)}",
        )


async def update_category(category_id: int, category: schema.CategoryUpdate) -> schema.CategoryResponse | None:
    """Update a category via database service"""
    try:
        response = await service_client.client.put(
            f"/categories/{category_id}",
            json=category.model_dump(exclude_unset=True)
        )
        if response.status_code == 404:
            return None
        if response.status_code == 400:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists",
            )
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update category",
            )
        data = response.json()
        return schema.CategoryResponse(**data)
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
            detail=f"Error updating category: {str(e)}",
        )


async def delete_category(category_id: int) -> bool:
    """Delete a category via database service"""
    try:
        response = await service_client.client.delete(f"/categories/{category_id}")
        if response.status_code == 404:
            return False
        if response.status_code != 204:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete category",
            )
        return True
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
            detail=f"Error deleting category: {str(e)}",
        )