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


# ==================== Orders ====================


@router.post("/orders")
async def create_order(info: schemas.StaffOrderCreate):
    """
        Create a new order from staff POS

        Example request body:
    ```json
        {
            "user_id": 1,
            "items": [
                {"product_id": 1, "quantity": 2, "price": 10.50},
                {"product_id": 3, "quantity": 1, "price": 5.00}
            ]
        }
    ```
    """
    if not info.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one item",
        )

    return await crud.create_staff_order(user_id=info.user_id, items=info.items)


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


@router.delete("/orders/{order_id}/cancel")
async def cancel_order(order_id: int, user_id: int):
    """
    Cancel an order (staff can only cancel their own pending/preparing orders)
    """
    return await crud.cancel_order(order_id=order_id, user_id=user_id)

