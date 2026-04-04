import httpx
from fastapi import HTTPException, status
from config import settings
from schemas import orders as schema


class ServiceClient:
    def __init__(self):
        self.client = httpx.AsyncClient(
            base_url=settings.DATABASE_SERVICE_URL, timeout=10.0
        )

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


async def update_order_status(order_id: int, new_status: str) -> schema.OrderResponse | None:
    try:
        response = await service_client.client.patch(
            f"/orders/{order_id}/status",
            json={"status": new_status},
        )
        if response.status_code == 422:
            response = await service_client.client.patch(
                f"/orders/{order_id}/status",
                params={"status_": new_status},
            )
        if response.status_code == 404:
            return None
        if response.status_code in (400, 422):
            error_detail = response.json().get("detail", "Invalid status") if response.content else "Invalid status"
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_detail)
        if response.status_code == 200:
            return schema.OrderResponse(**response.json())
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to update order status")
    except httpx.ConnectError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


async def update_order(order_id: int, data: dict) -> schema.OrderResponse | None:
    try:
        response = await service_client.client.put(f"/orders/{order_id}", json=data)
        if response.status_code == 404:
            return None
        if response.status_code == 200:
            return schema.OrderResponse(**response.json())
        return None
    except httpx.ConnectError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable")
    except HTTPException:
        raise
    except Exception:
        return None


async def update_order_item(order_id: int, item_id: int, data: dict) -> schema.OrderResponse | None:
    try:
        response = await service_client.client.put(f"/orders/{order_id}/items/{item_id}", json=data)
        if response.status_code == 404:
            return None
        if response.status_code in (400, 422):
            error_detail = response.json().get("detail", "Invalid item data") if response.content else "Invalid item data"
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_detail)
        if response.status_code == 200:
            return schema.OrderResponse(**response.json())
        return None
    except httpx.ConnectError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable")
    except HTTPException:
        raise
    except Exception:
        return None


async def remove_order_item(order_id: int, item_id: int) -> schema.OrderResponse | None:
    try:
        response = await service_client.client.delete(f"/orders/{order_id}/items/{item_id}")
        if response.status_code == 404:
            return None
        if response.status_code in (400, 422):
            error_detail = response.json().get("detail", "Invalid item") if response.content else "Invalid item"
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_detail)
        if response.status_code == 200:
            return schema.OrderResponse(**response.json())
        return None
    except httpx.ConnectError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable")
    except HTTPException:
        raise
    except Exception:
        return None


async def delete_order(order_id: int) -> bool:
    try:
        response = await service_client.client.delete(f"/orders/{order_id}")
        if response.status_code == 404:
            return False
        return response.status_code == 204
    except httpx.ConnectError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable")
    except HTTPException:
        raise
    except Exception:
        return False
