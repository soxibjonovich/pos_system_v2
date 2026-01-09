import httpx
from typing import Callable, Any
from functools import wraps
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


def handle_service_errors(func: Callable) -> Callable:
    @wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            return await func(*args, **kwargs)
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service unavailable",
            )
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Database service timeout",
            )
        except HTTPException:
            raise
        except Exception as e:
            print(f"Unexpected error in {func.__name__}: {e}")
            return None

    return wrapper


@handle_service_errors
async def get_orders() -> list[schemas.OrderResponse]:
    response = await service_client.db_client.get("/orders")

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch orders",
        )

    data = response.json()
    orders = data.get("orders", [])

    return [schemas.OrderResponse.model_validate(order) for order in orders]


@handle_service_errors
async def get_order_by_id(order_id: int) -> schemas.OrderResponse | None:
    response = await service_client.db_client.get(f"/orders/{order_id}")

    if response.status_code == 404:
        return None

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch order",
        )

    return schemas.OrderResponse.model_validate(response.json())


@handle_service_errors
async def get_user_by_username(username: str) -> schemas.User | None:
    response = await service_client.db_client.get(f"/users/username/{username}")

    if response.status_code == 404:
        return None

    if response.status_code != 200:
        return None

    return schemas.User.model_validate_json(response.content)


@handle_service_errors
async def create_order(order: schemas.OrderCreate) -> schemas.OrderResponse | None:
    response = await service_client.db_client.post("/orders", json=order.model_dump())

    if response.status_code == 201:
        return schemas.OrderResponse.model_validate(response.json())

    if response.status_code == 400:
        error_detail = response.json().get("detail", "Bad request")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=error_detail
        )

    return None


@handle_service_errors
async def update_order(
    order_id: int, order: schemas.OrderUpdate
) -> schemas.OrderResponse | None:
    response = await service_client.db_client.put(
        f"/orders/{order_id}", json=order.model_dump(exclude_unset=True)
    )

    if response.status_code == 404:
        return None

    if response.status_code == 200:
        return schemas.OrderResponse.model_validate(response.json())

    return None


@handle_service_errors
async def update_order_status(
    order_id: int, new_status: str
) -> schemas.OrderResponse | None:
    response = await service_client.db_client.patch(
        f"/orders/{order_id}/status", json={"status": new_status}
    )

    if response.status_code == 404:
        return None

    if response.status_code == 400:
        error_detail = response.json().get("detail", "Invalid status")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=error_detail
        )

    if response.status_code == 200:
        return schemas.OrderResponse.model_validate(response.json())

    return None


@handle_service_errors
async def add_order_item(
    order_id: int, item: schemas.OrderItemCreate
) -> schemas.OrderResponse | None:
    response = await service_client.db_client.post(
        f"/orders/{order_id}/items", json=item.model_dump()
    )

    if response.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    if response.status_code == 400:
        error_detail = response.json().get("detail", "Invalid item data")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=error_detail
        )

    if response.status_code in [200, 201]:
        return schemas.OrderResponse.model_validate(response.json())

    return None


@handle_service_errors
async def update_order_item(
    order_id: int, item_id: int, item: schemas.OrderItemUpdate
) -> schemas.OrderResponse | None:
    response = await service_client.db_client.put(
        f"/orders/{order_id}/items/{item_id}", json=item.model_dump(exclude_unset=True)
    )

    if response.status_code == 404:
        return None

    if response.status_code == 200:
        return schemas.OrderResponse.model_validate(response.json())

    return None


@handle_service_errors
async def remove_order_item(
    order_id: int, item_id: int
) -> schemas.OrderResponse | None:
    response = await service_client.db_client.delete(
        f"/orders/{order_id}/items/{item_id}"
    )

    if response.status_code == 404:
        return None

    if response.status_code == 200:
        return schemas.OrderResponse.model_validate(response.json())

    return None


@handle_service_errors
async def delete_order(order_id: int) -> bool:
    response = await service_client.db_client.delete(f"/orders/{order_id}")

    if response.status_code == 404:
        return False

    return response.status_code == 204


@handle_service_errors
async def get_orders_by_status(order_status: str) -> list[schemas.OrderResponse]:
    response = await service_client.db_client.get(f"/orders/status/{order_status}")

    if response.status_code != 200:
        return []

    data = response.json()
    orders = data.get("orders", [])

    return [schemas.OrderResponse.model_validate(order) for order in orders]


@handle_service_errors
async def get_orders_by_user(user_id: int) -> list[schemas.OrderResponse]:
    response = await service_client.db_client.get(f"/orders/user/{user_id}")

    if response.status_code != 200:
        return []

    data = response.json()
    orders = data.get("orders", [])

    return [schemas.OrderResponse.model_validate(order) for order in orders]


@handle_service_errors
async def calculate_order_total(order_id: int) -> float:
    response = await service_client.db_client.get(f"/orders/{order_id}/total")

    if response.status_code != 200:
        return 0.0

    data = response.json()
    return data.get("total", 0.0)
