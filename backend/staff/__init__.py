import crud
import schemas
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

router = FastAPI(tags=["Staff POS"], root_path="/api/staff")

router.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Products ====================
@router.get("/products")
async def get_products():
    """
    Get all active products for staff POS terminal
    """
    return await crud.get_active_products()


@router.get("/products/search")
async def search_products(
    q: str = Query(None, description="Search query"),
    category_id: int = Query(None, description="Filter by category"),
):
    """
    Search products by name/description and filter by category
    """
    return await crud.search_products(query=q, category_id=category_id)


@router.get("/products/{product_id}")
async def get_product(product_id: int):
    """
    Get a single product by ID
    """
    product = await crud.get_product_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found",
        )
    return product


# ==================== Categories ====================
@router.get("/categories")
async def get_categories():
    """
    Get all active categories for staff POS terminal
    """
    return await crud.get_active_categories()


# ==================== Printers ====================
@router.get("/printers")
async def get_printers(
    active_only: bool = Query(True, description="Only active printers"),
):
    """
    Get printers for routing products to IP printers
    """
    return await crud.get_printers(active_only=active_only)


# ==================== Tables ====================
@router.get("/tables")
async def get_tables(
    active_only: bool = Query(True, description="Only show active tables"),
):
    """
    Get all tables for staff POS terminal
    """
    return await crud.get_tables(active_only)


@router.get("/tables/available")
async def get_available_tables():
    """
    Get only available tables for order assignment
    """
    return await crud.get_available_tables()


@router.get("/tables/{table_id}")
async def get_table(table_id: int):
    """
    Get a single table by ID
    """
    table = await crud.get_table_by_id(table_id)
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table {table_id} not found",
        )
    return table


@router.patch("/tables/{table_id}/status")
async def update_table_status(table_id: int, status_data: schemas.TableStatusUpdate):
    """
        Update table status (available/occupied/reserved)
        Example request body:
    ```json
        {
            "status": "occupied"
        }
    ```
    """
    table = await crud.get_table_by_id(table_id)
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Table {table_id} not found"
        )

    return await crud.update_table_status(table_id, status_data.status)


# ==================== Orders ====================
@router.post("/orders", status_code=status.HTTP_201_CREATED)
async def create_order(info: schemas.StaffOrderCreate):
    """
        Create a new order from staff POS
        Example request body:
    ```json
        {
            "user_id": 1,
            "table_id": 5,
            "business_type": "restaurant",
            "items": [
                {"product_id": 1, "quantity": 2},
                {"product_id": 3, "quantity": 1}
            ]
        }
    ```
    """
    if not info.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one item",
        )

    if info.business_type == "restaurant" and not info.table_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Table ID is required for restaurant orders",
        )

    if info.table_id:
        table = await crud.get_table_by_id(info.table_id)
        if not table:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Table {info.table_id} not found",
            )

        if table.get("status") != "available":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Table {table.get('number')} is not available",
            )

    return await crud.create_staff_order(
        user_id=info.user_id,
        table_id=info.table_id,
        business_type=info.business_type,
        customer_name=info.customer_name,
        items=info.items,
    )


@router.get("/orders/user/{user_id}")
async def get_user_orders(
    user_id: int,
    limit: int = Query(
        50, ge=1, le=100, description="Maximum number of orders to return"
    ),
):
    """
    Get recent orders for a staff member
    """
    return await crud.get_staff_orders(user_id=user_id, limit=limit)


@router.get("/orders/today/{user_id}")
async def get_today_orders(user_id: int):
    """
    Get today's orders for a staff member
    """
    return await crud.get_today_orders(user_id=user_id)


@router.get("/orders/table/{table_id}")
async def get_table_orders(table_id: int):
    """
    Get active orders for a specific table
    """
    table = await crud.get_table_by_id(table_id)
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Table {table_id} not found"
        )

    return await crud.get_orders_by_table(table_id)


@router.get("/orders/{order_id}")
async def get_order(order_id: int):
    """
    Get a specific order by ID
    """
    order = await crud.get_order_by_id(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Order {order_id} not found"
        )
    return order


@router.put("/orders/{order_id}")
async def update_order(order_id: int, info: schemas.StaffOrderUpdate):
    """
        Update an order (staff can only update their own orders)
        Example request body:
    ```json
        {
            "user_id": 1,
            "table_id": 3,
            "items": [
                {"product_id": 1, "quantity": 3}
            ]
        }
    ```
    """
    order = await crud.get_order_by_id(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Order {order_id} not found"
        )

    if order.get("status") in ["completed", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update {order.get('status')} order",
        )

    if info.table_id and info.table_id != order.get("table_id"):
        old_table_id = order.get("table_id")
        new_table = await crud.get_table_by_id(info.table_id)

        if not new_table:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Table {info.table_id} not found",
            )

        if new_table.get("status") != "available":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Table {new_table.get('number')} is not available",
            )

    return await crud.update_staff_order(
        order_id=order_id,
        user_id=info.user_id,
        table_id=info.table_id,
        items=info.items,
    )


@router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: int, info: schemas.OrderStatusUpdate):
    """
        Update order status
        Example request body:
    ```json
        {
            "status": "completed"
        }
    ```
    """
    order = await crud.get_order_by_id(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Order {order_id} not found"
        )

    if info.status == "completed" and order.get("status") != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only ready orders can be marked as completed",
        )

    return await crud.update_order_status(order_id, info.status)


@router.put("/orders/{order_id}/items/{item_id}")
async def update_order_item(order_id: int, item_id: int, info: schemas.OrderItemUpdate):
    """
        Update an order item quantity/price
        Example request body:
    ```json
        {
            "quantity": 5,
            "price": 12.00
        }
    ```
    """
    order = await crud.get_order_by_id(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Order {order_id} not found"
        )

    if order.get("status") in ["completed", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot modify {order.get('status')} order",
        )

    return await crud.update_order_item(
        order_id=order_id, item_id=item_id, quantity=info.quantity, price=info.price
    )


@router.delete("/orders/{order_id}/items/{item_id}")
async def remove_order_item(order_id: int, item_id: int, user_id: int = Query(...)):
    """
    Remove an item from an order
    """
    order = await crud.get_order_by_id(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Order {order_id} not found"
        )

    if order.get("status") in ["completed", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot modify {order.get('status')} order",
        )

    return await crud.remove_order_item(
        order_id=order_id, item_id=item_id, user_id=user_id
    )


@router.delete("/orders/{order_id}/cancel")
async def cancel_order(order_id: int, user_id: int = Query(...)):
    """
    Cancel an order (staff can only cancel their own pending/preparing orders)
    """
    return await crud.cancel_order(order_id=order_id, user_id=user_id)


@router.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "auth"}
