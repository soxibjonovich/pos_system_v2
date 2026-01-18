import httpx
from fastapi import HTTPException, status
from config import settings
from schemas import orders as schema


class ServiceClient:
    def __init__(self):
        self.client = httpx.AsyncClient(base_url=settings.DATABASE_SERVICE_URL, timeout=10.0)

    async def close(self):
        await self.client.aclose()


service_client = ServiceClient()


async def get_orders() -> schema.OrdersResponse:
    try:
        response = await service_client.client.get("/orders")

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch orders",
            )

        data = response.json()
        return schema.OrdersResponse(**data)

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
            detail=f"Error fetching orders: {str(e)}",
        )


async def get_order_by_id(order_id: int) -> schema.OrderResponse | None:
    try:
        response = await service_client.client.get(f"/orders/{order_id}")

        if response.status_code == 404:
            return None

        if response.status_code != 200:
            return None

        data = response.json()
        return schema.OrderResponse(**data)

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except HTTPException:
        raise
    except Exception:
        return None


async def get_orders_by_status(order_status: str) -> schema.OrdersResponse:
    try:
        response = await service_client.client.get(f"/orders/status/{order_status}")

        if response.status_code != 200:
            return schema.OrdersResponse(orders=[], total=0)

        data = response.json()
        return schema.OrdersResponse(**data)

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return schema.OrdersResponse(orders=[], total=0)


async def get_orders_by_user(user_id: int) -> schema.OrdersResponse:
    try:
        response = await service_client.client.get(f"/orders/user/{user_id}")

        if response.status_code != 200:
            return schema.OrdersResponse(orders=[], total=0)

        data = response.json()
        return schema.OrdersResponse(**data)

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return schema.OrdersResponse(orders=[], total=0)
