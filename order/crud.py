import httpx
from fastapi import HTTPException, status
from order import schemas


class ServiceClient:
    def __init__(self) -> None:
        self.db_client = httpx.AsyncClient(
            base_url="http://127.0.0.1:8002", timeout=10.0
        )
        self.auth_client = httpx.AsyncClient(
            base_url="http://127.0.0.1:8003", timeout=10.0
        )

    async def close(self):
        await self.db_client.aclose()
        await self.auth_client.aclose()


service_client = ServiceClient()


async def get_orders() -> list[schemas.OrderResponse]:
    try:
        response = await service_client.db_client.get("/orders")

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch orders",
            )

        data = response.json()
        orders = data.get("orders", [])

        return [
            schemas.OrderResponse.model_validate(order)
            for order in orders
        ]

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )

async def get_user_by_username(username: str) -> schemas.User | None:
    try:
        response = await service_client.db_client.get(f"/users/username/{username}")
        if response.status_code == 404:
            return None

        if response.status_code != 200:
            return None

        return schemas.User.model_validate_json(response.content)

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except HTTPException:
        raise
    except Exception:
        return None

async def get_order_by_id(order_id: int) -> schemas.OrderResponse | None:
    try:
        response = await service_client.db_client.get(f"/orders/{order_id}")

        if response.status_code == 404:
            return None

        if response.status_code != 200:
            return None

        return schemas.OrderResponse.model_validate(response.json())

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except HTTPException:
        raise
    except Exception:
        return None


async def create_order(order: schemas.OrderCreate) -> schemas.OrderResponse | None:
    try:
        response = await service_client.db_client.post(
            "/orders", json=order.model_dump()
        )

        if response.status_code == 201:
            return schemas.OrderResponse.model_validate(response.json())

        return None

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return None


async def update_order(
    order_id: int, order: schemas.OrderUpdate
) -> schemas.OrderResponse | None:
    try:
        response = await service_client.db_client.put(
            f"/orders/{order_id}", json=order.model_dump(exclude_unset=True)
        )

        if response.status_code == 404:
            return None

        if response.status_code == 200:
            return schemas.OrderResponse.model_validate(response.json())

        return None

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return None


async def update_order_status(
    order_id: int, status: str
) -> schemas.OrderResponse | None:
    try:
        response = await service_client.db_client.patch(
            f"/orders/{order_id}/status", json={"status": status}
        )

        if response.status_code == 404:
            return None

        if response.status_code == 200:
            return schemas.OrderResponse.model_validate(response.json())

        return None

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return None


async def add_order_item(
    order_id: int, item: schemas.OrderItemCreate
) -> schemas.OrderResponse | None:
    try:
        response = await service_client.db_client.post(
            f"/orders/{order_id}/items", json=item.model_dump()
        )

        if response.status_code in [200, 201]:
            return schemas.OrderResponse.model_validate(response.json())

        return None

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return None


async def remove_order_item(
    order_id: int, item_id: int
) -> schemas.OrderResponse | None:
    try:
        response = await service_client.db_client.delete(
            f"/orders/{order_id}/items/{item_id}"
        )

        if response.status_code == 200:
            return schemas.OrderResponse.model_validate(response.json())

        return None

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return None


async def delete_order(order_id: int) -> bool:
    try:
        response = await service_client.db_client.delete(f"/orders/{order_id}")
        return response.status_code == 204

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return False
