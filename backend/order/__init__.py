from contextlib import asynccontextmanager

from authx.exceptions import AuthXException, MissingTokenError, NoAuthorizationError
from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import crud
import schemas
from deps import get_current_staff
from websocket_manager import ws_manager
from rabbitmq_client import rabbitmq_client


async def handle_product_event(data: dict):
    # Broadcast to all connected WebSocket clients
    await ws_manager.broadcast({"type": "product_update", "data": data})


async def handle_user_event(data: dict):
    await ws_manager.broadcast({"type": "user_update", "data": data})


async def handle_order_event(data: dict):
    await ws_manager.broadcast({"type": "order_update", "data": data})


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await rabbitmq_client.connect()

    # Subscribe to events
    await rabbitmq_client.subscribe("product.*", handle_product_event)
    await rabbitmq_client.subscribe("user.*", handle_user_event)
    await rabbitmq_client.subscribe("order.*", handle_order_event)

    yield

    # Shutdown
    await rabbitmq_client.close()
    await crud.service_client.close()


mapp = FastAPI(title="Order Microservice", version="1.0", lifespan=lifespan)

mapp.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@mapp.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "order"}


@mapp.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)

    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()

            # Echo back (optional)
            await websocket.send_json({"type": "ping", "message": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


app = APIRouter(prefix="/orders", tags=["Orders"])


@app.get("", response_model=schemas.OrdersResponse, status_code=status.HTTP_200_OK)
async def get_orders(_: schemas.User = Depends(get_current_staff)):
    orders = await crud.get_orders()
    return schemas.OrdersResponse(orders=orders, total=len(orders))


@app.get(
    "/{order_id}", response_model=schemas.OrderResponse, status_code=status.HTTP_200_OK
)
async def get_order(order_id: int, _: schemas.User = Depends(get_current_staff)):
    order = await crud.get_order_by_id(order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    return order


@app.get("/status/{order_status}", response_model=schemas.OrdersResponse)
async def get_orders_by_status(
    order_status: str, _: schemas.User = Depends(get_current_staff)
):
    orders = await crud.get_orders_by_status(order_status)
    return schemas.OrdersResponse(orders=orders, total=len(orders))


@app.get("/user/{user_id}", response_model=schemas.OrdersResponse)
async def get_orders_by_user(
    user_id: int, _: schemas.User = Depends(get_current_staff)
):
    orders = await crud.get_orders_by_user(user_id)
    return schemas.OrdersResponse(orders=orders, total=len(orders))


@app.post("", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order: schemas.OrderCreate, _: schemas.User = Depends(get_current_staff)
):
    created_order = await crud.create_order(order)

    if not created_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create order"
        )

    return created_order


@app.put("/{order_id}", response_model=schemas.OrderResponse)
async def update_order(
    order_id: int,
    order: schemas.OrderUpdate,
    _: schemas.User = Depends(get_current_staff),
):
    updated_order = await crud.update_order(order_id, order)

    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    return updated_order


@app.patch("/{order_id}/status", response_model=schemas.OrderResponse)
async def update_order_status(
    order_id: int,
    status_update: schemas.OrderStatusUpdate,
    _: schemas.User = Depends(get_current_staff),
):
    updated_order = await crud.update_order_status(order_id, status_update.status)

    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    return updated_order


@app.post("/{order_id}/items", response_model=schemas.OrderResponse)
async def add_order_item(
    order_id: int,
    item: schemas.OrderItemCreate,
    _: schemas.User = Depends(get_current_staff),
):
    updated_order = await crud.add_order_item(order_id, item)

    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    return updated_order


@app.put("/{order_id}/items/{item_id}", response_model=schemas.OrderResponse)
async def update_order_item(
    order_id: int,
    item_id: int,
    item: schemas.OrderItemUpdate,
    _: schemas.User = Depends(get_current_staff),
):
    updated_order = await crud.update_order_item(order_id, item_id, item)

    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order or item not found"
        )

    return updated_order


@app.delete("/{order_id}/items/{item_id}", response_model=schemas.OrderResponse)
async def remove_order_item(
    order_id: int, item_id: int, _: schemas.User = Depends(get_current_staff)
):
    updated_order = await crud.remove_order_item(order_id, item_id)

    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order or item not found"
        )

    return updated_order


@app.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(order_id: int, _: schemas.User = Depends(get_current_staff)):
    deleted = await crud.delete_order(order_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )


@app.get("/{order_id}/total", response_model=schemas.OrderTotalResponse)
async def get_order_total(order_id: int, _: schemas.User = Depends(get_current_staff)):
    order = await crud.get_order_by_id(order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    return schemas.OrderTotalResponse(
        order_id=order.id, total=order.total, items_count=len(order.items)
    )


mapp.include_router(app)


@mapp.exception_handler(MissingTokenError)
async def missing_token_handler(request: Request, exc: MissingTokenError):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": "Missing authentication token"},
        headers={"WWW-Authenticate": "Bearer"},
    )


@mapp.exception_handler(AuthXException)
async def authx_exception_handler(request: Request, exc: AuthXException):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": "Invalid or expired token"},
        headers={"WWW-Authenticate": "Bearer"},
    )


@mapp.exception_handler(NoAuthorizationError)
async def no_authorization_handler(request: Request, exc: NoAuthorizationError):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": "Authentication required"},
        headers={"WWW-Authenticate": "Bearer"},
    )


def run_order():
    import uvicorn

    uvicorn.run("order:mapp", host="0.0.0.0", port=8004, log_level="error", reload=True)


if __name__ == "__main__":
    run_order()
