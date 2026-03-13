import asyncio
import socket
from datetime import datetime
from types import SimpleNamespace
from typing import Any
from zoneinfo import ZoneInfo

import httpx
import schemas
from config import settings
from fastapi import HTTPException, status

UZBEKISTAN_TZ = ZoneInfo("Asia/Samarkand")


class StaffServiceClient:
    def __init__(self):
        self.db_client = httpx.AsyncClient(
            base_url=settings.DATABASE_SERVICE_URL, timeout=10.0
        )
        self.order_client = httpx.AsyncClient(
            base_url=settings.ORDER_SERVICE_URL, timeout=10.0
        )

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

        products = [p for p in products if p.get("is_active", False)]

        if query:
            query_lower = query.lower()
            products = [
                p
                for p in products
                if query_lower in p.get("title", "").lower()
                or query_lower in p.get("description", "").lower()
            ]

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


# ==================== Printers ====================


async def get_printers(active_only: bool = True):
    """Get printers for staff routing"""
    try:
        response = await staff_client.db_client.get(
            "/printers", params={"active_only": str(active_only).lower()}
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch printers",
            )
        return response.json()
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
            detail=f"Error fetching printers: {str(e)}",
        )


def _safe_tspl_text(value: str | None) -> str:
    text = str(value or "").replace('"', "'").replace("\n", " ").strip()
    return text[:42]


def _normalize_printer_key(value: str | None) -> str:
    return str(value or "").strip().lower()


def _format_uzbekistan_time(value: str | None) -> str:
    if not value:
        return datetime.now(UZBEKISTAN_TZ).strftime("%H:%M %d.%m.%Y")

    raw = str(value).strip()
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return raw

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UZBEKISTAN_TZ)
    else:
        parsed = parsed.astimezone(UZBEKISTAN_TZ)
    return parsed.strftime("%H:%M %d.%m.%Y")


def _get_printer_routing_keys(printer: dict[str, Any]) -> list[str]:
    names = [
        _normalize_printer_key(part)
        for part in str(printer.get("name", "")).split(";")
        if _normalize_printer_key(part)
    ]
    categories = [
        _normalize_printer_key(category)
        for category in (printer.get("categories") or [])
        if _normalize_printer_key(category)
    ]
    return list(dict.fromkeys([*names, *categories]))


def _build_escpos_ticket(payload: schemas.PrinterDispatchRequest) -> bytes:
    created_text = _format_uzbekistan_time(payload.created_at)
    printed_text = datetime.now(UZBEKISTAN_TZ).strftime("%H:%M %d.%m.%Y")
    raw_table_text = payload.table_number or (
        str(payload.table_id) if payload.table_id else "-"
    )
    table_text = (
        f"{_safe_tspl_text(payload.table_location)}/{_safe_tspl_text(raw_table_text)}"
        if payload.table_location
        else _safe_tspl_text(raw_table_text)
    )

    init = b"\x1b\x40"
    charset = b"\x1b\x74\x11"  # PC866
    bold_on = b"\x1b\x45\x01"
    bold_off = b"\x1b\x45\x00"
    center = b"\x1b\x61\x01"
    left = b"\x1b\x61\x00"
    big = b"\x1d\x21\x11"
    normal = b"\x1d\x21\x00"
    medium = b"\x1d\x21\x01"
    feed = b"\x1b\x64\x03"
    cut = b"\x1d\x56\x41\x03"
    line_width = 24
    separator = "-" * line_width

    lines = [
        f"CHECK No: #{payload.order_id}",
        f"WAITER: {_safe_tspl_text(payload.staff_name)}",
        # f"OPENED: {_safe_tspl_text(created_text)}",
        f"PRINTED: {_safe_tspl_text(printed_text)}",
        f"TABLE: {table_text}",
        separator,
    ]

    def _item_title_line(title: str) -> str:
        return f"- {title[:20]}"

    for item in payload.items:
        qty = max(1, int(item.quantity))
        title = _safe_tspl_text(item.title)
        lines.append(_item_title_line(title))
        lines.append(f"  x{qty}")

    lines.append(separator)

    payload_bytes = init + charset
    payload_bytes += center + big + bold_on
    payload_bytes += b"KITCHEN\n"
    payload_bytes += medium + bold_off + left
    payload_bytes += "\n".join(lines).encode("cp866", errors="ignore")
    payload_bytes += b"\n\n" + feed + cut
    return payload_bytes


def _send_escpos_over_tcp(
    host: str, port: int, payload: bytes, timeout_sec: int = 5
) -> None:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(timeout_sec)
        sock.connect((host, port))
        sock.sendall(payload)


async def dispatch_printer_job(payload: schemas.PrinterDispatchRequest):
    try:
        printers_data = await get_printers(active_only=True)
        printers = (
            printers_data.get("printers", []) if isinstance(printers_data, dict) else []
        )

        if not printers:
            return {
                "ok": False,
                "order_id": payload.order_id,
                "sent_printers": 0,
                "sent_items": 0,
                "errors": [{"detail": "No active printers configured"}],
            }

        payload_by_printer: dict[str, dict[str, Any]] = {}
        for item in payload.items:
            category_name = _normalize_printer_key(item.category)
            for printer in printers:
                routing_keys = _get_printer_routing_keys(printer)
                if not routing_keys:
                    continue

                is_default_route = "all" in routing_keys or "default" in routing_keys
                if category_name:
                    matches = category_name in routing_keys or is_default_route
                else:
                    matches = is_default_route
                if not matches:
                    continue

                printer_key = str(printer.get("id"))
                current = payload_by_printer.get(printer_key)
                if not current:
                    current = {"printer": printer, "items": []}
                    payload_by_printer[printer_key] = current
                current["items"].append(item)

        if not payload_by_printer:
            return {
                "ok": False,
                "order_id": payload.order_id,
                "sent_printers": 0,
                "sent_items": 0,
                "errors": [{"detail": "No printer matched order items"}],
            }

        results = []
        errors = []
        for current in payload_by_printer.values():
            printer = current["printer"]
            printer_payload = SimpleNamespace(
                order_id=payload.order_id,
                staff_name=payload.staff_name,
                staff_id=payload.staff_id,
                table_id=payload.table_id,
                table_number=payload.table_number,
                table_location=payload.table_location,
                created_at=payload.created_at,
                items=current["items"],
                printer_name=printer.get("name", "Kitchen Printer"),
                host=str(printer.get("host", "")).strip(),
                port=int(printer.get("port") or 9100),
            )

            ticket = _build_escpos_ticket(printer_payload)
            try:
                await asyncio.to_thread(
                    _send_escpos_over_tcp,
                    printer_payload.host,
                    printer_payload.port,
                    ticket,
                )
                results.append(
                    {
                        "printer_id": printer.get("id"),
                        "printer_name": printer.get("name"),
                        "host": printer.get("host"),
                        "port": printer.get("port"),
                        "sent_items": len(current["items"]),
                    }
                )
            except (socket.timeout, TimeoutError):
                errors.append(
                    {
                        "printer_id": printer.get("id"),
                        "printer_name": printer.get("name"),
                        "detail": f"Printer timeout: {printer.get('host')}:{printer.get('port')}",
                    }
                )
            except OSError as exc:
                errors.append(
                    {
                        "printer_id": printer.get("id"),
                        "printer_name": printer.get("name"),
                        "detail": f"Printer connection failed: {exc}",
                    }
                )

        return {
            "ok": len(results) > 0,
            "order_id": payload.order_id,
            "sent_printers": len(results),
            "sent_items": sum(result["sent_items"] for result in results),
            "results": results,
            "errors": errors,
        }
    except (socket.timeout, TimeoutError):
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Printer timeout",
        )
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Printer connection failed: {exc}",
        )


# ==================== Tables ====================


async def get_tables(active_only: bool = False):
    """Get all tables for staff POS"""
    try:
        params = {"active_only": active_only} if active_only else {}
        response = await staff_client.db_client.get("/tables", params=params)

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch tables",
            )

        return response.json()

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
            detail=f"Error fetching tables: {str(e)}",
        )


async def get_available_tables():
    """Get only available tables"""
    try:
        response = await staff_client.db_client.get("/tables/available")

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch available tables",
            )

        return response.json()

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
            detail=f"Error fetching available tables: {str(e)}",
        )


async def get_table_by_id(table_id: int):
    """Get a single table by ID"""
    try:
        response = await staff_client.db_client.get(f"/tables/{table_id}")

        if response.status_code == 404:
            return None
        if response.status_code != 200:
            return None

        return response.json()

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return None


async def update_table_status(table_id: int, table_status: str):
    """Update table status"""
    try:
        response = await staff_client.db_client.patch(
            f"/tables/{table_id}/status", json={"status": table_status}
        )

        if response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Table not found"
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update table status",
            )

        return response.json()

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
            detail=f"Error updating table status: {str(e)}",
        )


# ==================== Orders ====================


async def create_staff_order(
    user_id: int,
    items: list[dict],
    table_id: int | None = None,
    business_type: str = "restaurant",
    customer_name: str | None = None,
    fee_percent: float = 0,
):
    """Create a new order from staff POS"""
    try:
        order_data = {
            "user_id": user_id,
            "items": items,
            "business_type": business_type,
            "fee_percent": fee_percent,
        }

        if table_id:
            order_data["table_id"] = table_id

        if customer_name:
            order_data["customer_name"] = customer_name

        response = await staff_client.order_client.post("/orders", json=order_data)

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


async def get_orders_by_table(table_id: int):
    """Get active orders for a specific table"""
    try:
        response = await staff_client.order_client.get(f"/orders/table/{table_id}")

        if response.status_code != 200:
            return {"orders": [], "total": 0}

        data = response.json()
        return data

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Order service unavailable",
        )
    except Exception:
        return {"orders": [], "total": 0}


async def get_today_orders(user_id: int):
    """Get today's orders for a staff member"""
    try:
        from datetime import datetime

        response = await staff_client.order_client.get(f"/orders/user/{user_id}")

        if response.status_code != 200:
            return {"orders": [], "total": 0}

        data = response.json()
        all_orders = data.get("orders", [])

        today = datetime.now().date()
        today_orders = [
            order
            for order in all_orders
            if datetime.fromisoformat(order["created_at"].replace("Z", "+00:00")).date()
            == today
        ]

        return {"orders": today_orders, "total": len(today_orders)}
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Order service unavailable",
        )
    except Exception:
        return {"orders": [], "total": 0}


async def update_staff_order(
    order_id: int,
    user_id: int,
    items: list[dict],
    table_id: int | None = None,
    fee_percent: float | None = None,
):
    """Update an existing order"""
    try:
        order = await get_order_by_id(order_id)

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )

        if order.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own orders",
            )

        if order.get("status") in ["completed", "cancelled"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot update {order.get('status')} order",
            )

        update_data = {"items": items}
        if table_id is not None:
            update_data["table_id"] = table_id
        if fee_percent is not None:
            update_data["fee_percent"] = fee_percent

        response = await staff_client.order_client.put(
            f"/orders/{order_id}", json=update_data
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update order",
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
            detail=f"Error updating order: {str(e)}",
        )


async def update_order_status(order_id: int, new_status: str):
    """Update order status"""
    try:
        response = await staff_client.order_client.patch(
            f"/orders/{order_id}/status", json={"status": new_status}
        )

        if response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update order status",
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
            detail=f"Error updating order status: {str(e)}",
        )


async def remove_order_item(order_id: int, item_id: int, user_id: int):
    """Remove an item from an order"""
    try:
        order = await get_order_by_id(order_id)

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )

        if order.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only modify your own orders",
            )

        if order.get("status") in ["completed", "cancelled"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot modify {order.get('status')} order",
            )

        response = await staff_client.order_client.delete(
            f"/orders/{order_id}/items/{item_id}"
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to remove order item",
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
            detail=f"Error removing order item: {str(e)}",
        )


async def update_order_item(
    order_id: int, item_id: int, quantity: int | None, price: float | None
):
    """Update an order item"""
    try:
        update_data = {}
        if quantity is not None:
            update_data["quantity"] = quantity
        if price is not None:
            update_data["price"] = price

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No update data provided",
            )

        response = await staff_client.order_client.put(
            f"/orders/{order_id}/items/{item_id}", json=update_data
        )

        if response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order or item not found"
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update order item",
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
            detail=f"Error updating order item: {str(e)}",
        )


async def cancel_order(order_id: int, user_id: int):
    """Cancel an order (staff can only cancel their own pending orders)"""
    try:
        order = await get_order_by_id(order_id)

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )

        if order.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own orders",
            )

        if order.get("status") not in ["pending", "preparing"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel order with status: {order.get('status')}",
            )

        response = await staff_client.order_client.patch(
            f"/orders/{order_id}/status", json={"status": "cancelled"}
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cancel order",
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
            detail=f"Error cancelling order: {str(e)}",
        )
