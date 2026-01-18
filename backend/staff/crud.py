import httpx
from config import settings
from fastapi import HTTPException, status

class StaffServiceClient:
    def __init__(self):
        self.db_client = httpx.AsyncClient(base_url=settings.DATABASE_SERVICE_URL, timeout=10.0)
        self.order_client = httpx.AsyncClient(base_url=settings.ORDER_SERVICE_URL, timeout=10.0)
    
    async def close(self):
        await self.db_client.aclose()
        await self.order_client.aclose()


staff_client = StaffServiceClient()


# ==================== Products ====================

async def get_active_products():
    """Get all active products for staff POS"""
    try:
        response = await staff_client.db_client.get("/products")
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch products",
            )
        data = response.json()
        # Filter only active products
        all_products = data.get("products", [])
        active_products = [p for p in all_products if p.get("is_active", False)]
        return {"products": active_products, "total": len(active_products)}
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


async def search_products(query: str | None, category_id: int | None):
    """Search products for staff POS"""
    try:
        response = await staff_client.db_client.get("/products")
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch products",
            )
        data = response.json()
        products = data.get("products", [])
        
        # Filter active products
        products = [p for p in products if p.get("is_active", False)]
        
        # Apply search filter
        if query:
            query_lower = query.lower()
            products = [
                p for p in products
                if query_lower in p.get("title", "").lower() or
                   query_lower in p.get("description", "").lower()
            ]
        
        # Apply category filter
        if category_id is not None:
            products = [p for p in products if p.get("category_id") == category_id]
        
        return {"products": products, "total": len(products)}
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
            detail=f"Error searching products: {str(e)}",
        )


async def get_product_by_id(product_id: int):
    """Get a single product by ID"""
    try:
        response = await staff_client.db_client.get(f"/products/{product_id}")
        if response.status_code == 404:
            return None
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch product",
            )
        return response.json()
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except HTTPException:
        raise
    except Exception:
        return None


# ==================== Categories ====================

async def get_active_categories():
    """Get all active categories for staff POS"""
    try:
        response = await staff_client.db_client.get("/categories")
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch categories",
            )
        data = response.json()
        # Filter only active categories
        all_categories = data.get("categories", [])
        active_categories = [c for c in all_categories if c.get("is_active", False)]
        return {"categories": active_categories, "total": len(active_categories)}
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
            detail=f"Error fetching categories: {str(e)}",
        )


# ==================== Orders ====================

async def create_staff_order(user_id: int, items: list[dict]):
    """Create a new order from staff POS"""
    try:
        order_data = {
            "user_id": user_id,
            "items": items
        }
        
        response = await staff_client.order_client.post(
            "/orders",
            json=order_data
        )
        
        if response.status_code == 400:
            error_data = response.json()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_data.get("detail", "Invalid order data"),
            )
        
        if response.status_code != 201:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create order",
            )
        
        return response.json()
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Order service unavailable",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating order: {str(e)}",
        )


async def get_staff_orders(user_id: int, limit: int = 50):
    """Get recent orders for a staff member"""
    try:
        response = await staff_client.order_client.get(f"/orders/user/{user_id}")
        
        if response.status_code != 200:
            return {"orders": [], "total": 0}
        
        data = response.json()
        orders = data.get("orders", [])
        
        # Limit results
        orders = orders[:limit]
        
        return {"orders": orders, "total": len(orders)}
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Order service unavailable",
        )
    except Exception:
        return {"orders": [], "total": 0}


async def get_order_by_id(order_id: int):
    """Get a specific order by ID"""
    try:
        response = await staff_client.order_client.get(f"/orders/{order_id}")
        
        if response.status_code == 404:
            return None
        if response.status_code != 200:
            return None
        
        return response.json()
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Order service unavailable",
        )
    except Exception:
        return None


async def get_today_orders(user_id: int):
    """Get today's orders for a staff member"""
    try:
        from datetime import datetime
        
        response = await staff_client.order_client.get(f"/orders/user/{user_id}")
        
        if response.status_code != 200:
            return {"orders": [], "total": 0}
        
        data = response.json()
        all_orders = data.get("orders", [])
        
        # Filter today's orders
        today = datetime.now().date()
        today_orders = [
            order for order in all_orders
            if datetime.fromisoformat(order["created_at"].replace("Z", "+00:00")).date() == today
        ]
        
        return {"orders": today_orders, "total": len(today_orders)}
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Order service unavailable",
        )
    except Exception:
        return {"orders": [], "total": 0}


async def cancel_order(order_id: int, user_id: int):
    """Cancel an order (staff can only cancel their own pending orders)"""
    try:
        # Get order details first
        order = await get_order_by_id(order_id)
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Verify ownership
        if order.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own orders"
            )
        
        # Check if order can be cancelled (only pending orders)
        if order.get("status") not in ["pending", "preparing"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel order with status: {order.get('status')}"
            )
        
        # Update order status to cancelled
        response = await staff_client.order_client.patch(
            f"/orders/{order_id}/status",
            json={"status": "cancelled"}
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cancel order"
            )
        
        return response.json()
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Order service unavailable"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cancelling order: {str(e)}"
        )