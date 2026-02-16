from datetime import datetime
from typing import Optional
import schemas
from service_client import ServiceClient
from escpos.printer import Usb, Network, File
from escpos.exceptions import Error as EscposError
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


# Initialize service client
service_client = ServiceClient()

# Printer configuration - adjust based on your setup
PRINTER_TYPE = os.getenv("PRINTER_TYPE", "file")  # usb, network, or file
PRINTER_HOST = os.getenv("PRINTER_HOST", "192.168.1.100")
PRINTER_PORT = int(os.getenv("PRINTER_PORT", "9100"))
USB_VENDOR_ID = int(os.getenv("USB_VENDOR_ID", "0x04b8"), 16)
USB_PRODUCT_ID = int(os.getenv("USB_PRODUCT_ID", "0x0202"), 16)

# Business info
BUSINESS_NAME = os.getenv("BUSINESS_NAME", "POS System")
BUSINESS_ADDRESS = os.getenv("BUSINESS_ADDRESS", "Adress")
BUSINESS_PHONE = os.getenv("BUSINESS_PHONE", "+998 77 707 46 66")


def get_printer():
    """Get printer instance based on configuration"""
    return
    try:
        if PRINTER_TYPE == "usb":
            return Usb(USB_VENDOR_ID, USB_PRODUCT_ID)
        elif PRINTER_TYPE == "network":
            return Network(PRINTER_HOST, PRINTER_PORT)
        else:
            # File printer for testing
            return File("/app/receipts/test_print.txt")
    except EscposError as e:
        print(f"Printer connection error: {e}")
        return None


async def get_receipt_data(order_id: int) -> Optional[schemas.ReceiptResponse]:
    """Get order data formatted for receipt"""
    return
    try:
        # Get order from order service
        response = await service_client.order_client.get(f"/orders/{order_id}")
        
        if response.status_code != 200:
            return None
        
        order = response.json()
        
        # Calculate tax (10% for example)
        subtotal = float(order.get("total", 0))
        tax = subtotal * 0.10
        total = subtotal + tax
        
        # Format items
        items = []
        for item in order.get("items", []):
            product = item.get("product", {})
            items.append(schemas.ReceiptItem(
                product_name=product.get("title", "Unknown Product"),
                quantity=item.get("quantity", 0),
                price=float(item.get("price", 0)),
                subtotal=float(item.get("subtotal", 0))
            ))
        
        # Get table info if exists
        table_number = None
        if order.get("table"):
            table_number = order["table"].get("number")
        
        # Get server name
        server_name = None
        if order.get("user"):
            server_name = order["user"].get("full_name")
        
        return schemas.ReceiptResponse(
            order_id=order["id"],
            order_date=datetime.fromisoformat(order["created_at"].replace("Z", "+00:00")),
            items=items,
            subtotal=subtotal,
            tax=tax,
            total=total,
            table_number=table_number,
            server_name=server_name,
            payment_method="Cash"  # Default, can be extended
        )
    
    except Exception as e:
        print(f"Error getting receipt data: {e}")
        return None


async def print_receipt(order_id: int, copies: int = 1) -> Optional[schemas.PrintResponse]:
    """Print receipt for an order"""
    return
    try:
        # Get receipt data
        receipt = await get_receipt_data(order_id)
        
        if not receipt:
            return None
        
        # Get printer
        printer = get_printer()
        
        if not printer:
            return schemas.PrintResponse(
                order_id=order_id,
                printed_at=datetime.now(),
                copies=copies,
                status="failed",
                message="Printer not available"
            )
        
        # Print receipt
        for _ in range(copies):
            try:
                # Header
                printer.set(align="center", bold=True, double_height=True, double_width=True)
                printer.text(f"{BUSINESS_NAME}\n")
                printer.set(align="center", bold=False, double_height=False, double_width=False)
                printer.text(f"{BUSINESS_ADDRESS}\n")
                printer.text(f"{BUSINESS_PHONE}\n")
                printer.text("=" * 42 + "\n")
                
                # Order info
                printer.set(align="left")
                printer.text(f"Order #{receipt.order_id}\n")
                printer.text(f"Date: {receipt.order_date.strftime('%d.%m.%Y %H:%M')}\n")
                
                if receipt.table_number:
                    printer.text(f"Table: {receipt.table_number}\n")
                
                if receipt.server_name:
                    printer.text(f"Server: {receipt.server_name}\n")
                
                printer.text("=" * 42 + "\n")
                
                # Items
                printer.set(bold=True)
                printer.text(f"{'Item':<20} {'Qty':>5} {'Price':>7} {'Total':>8}\n")
                printer.set(bold=False)
                printer.text("-" * 42 + "\n")
                
                for item in receipt.items:
                    # Product name (truncate if too long)
                    name = item.product_name[:20]
                    printer.text(f"{name:<20}\n")
                    
                    # Quantity, price, subtotal
                    qty = f"{item.quantity}x"
                    price = f"{item.price:,.0f}"
                    subtotal = f"{item.subtotal:,.0f}"
                    printer.text(f"{'':<20} {qty:>5} {price:>7} {subtotal:>8}\n")
                
                printer.text("-" * 42 + "\n")
                
                # Totals
                printer.set(bold=True)
                printer.text(f"{'Subtotal:':<34} {receipt.subtotal:>8,.0f}\n")
                printer.text(f"{'Tax (10%):':<34} {receipt.tax:>8,.0f}\n")
                printer.text("=" * 42 + "\n")
                printer.set(double_height=True, double_width=True)
                printer.text(f"{'TOTAL:':<17} {receipt.total:>8,.0f}\n")
                printer.set(double_height=False, double_width=False)
                printer.text("=" * 42 + "\n")
                
                # Footer
                printer.text("\n")
                printer.set(align="center")
                printer.text("Rahmat! Yana kuting!\n")
                printer.text("Thank you! Come again!\n")
                printer.text("\n")
                
                # QR code (optional - order ID)
                try:
                    printer.qr(f"ORDER-{order_id}", size=6)
                except:
                    pass
                
                # Cut paper
                printer.cut()
                
            except EscposError as e:
                print(f"Print error: {e}")
                return schemas.PrintResponse(
                    order_id=order_id,
                    printed_at=datetime.utcnow(),
                    copies=copies,
                    status="failed",
                    message=f"Print failed: {str(e)}"
                )
        
        return schemas.PrintResponse(
            order_id=order_id,
            printed_at=datetime.utcnow(),
            copies=copies,
            status="success",
            message=f"Receipt printed successfully ({copies} copies)"
        )
    
    except Exception as e:
        print(f"Error printing receipt: {e}")
        return schemas.PrintResponse(
            order_id=order_id,
            printed_at=datetime.utcnow(),
            copies=copies,
            status="failed",
            message=f"Error: {str(e)}"
        )


async def generate_pdf_receipt(order_id: int) -> Optional[str]:
    """Generate PDF receipt for download"""
    return
    try:
        receipt = await get_receipt_data(order_id)
        
        if not receipt:
            return None
        
        # Create PDF
        pdf_path = f"/app/receipts/receipt_{order_id}.pdf"
        c = canvas.Canvas(pdf_path, pagesize=(80*mm, 200*mm))
        
        # Set up fonts
        c.setFont("Helvetica-Bold", 14)
        
        # Header
        y = 190*mm
        c.drawCentredString(40*mm, y, BUSINESS_NAME)
        
        c.setFont("Helvetica", 9)
        y -= 5*mm
        c.drawCentredString(40*mm, y, BUSINESS_ADDRESS)
        y -= 4*mm
        c.drawCentredString(40*mm, y, BUSINESS_PHONE)
        
        # Line
        y -= 5*mm
        c.line(5*mm, y, 75*mm, y)
        
        # Order info
        y -= 5*mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(5*mm, y, f"Order #{receipt.order_id}")
        
        y -= 5*mm
        c.setFont("Helvetica", 9)
        c.drawString(5*mm, y, f"Date: {receipt.order_date.strftime('%d.%m.%Y %H:%M')}")
        
        if receipt.table_number:
            y -= 4*mm
            c.drawString(5*mm, y, f"Table: {receipt.table_number}")
        
        if receipt.server_name:
            y -= 4*mm
            c.drawString(5*mm, y, f"Server: {receipt.server_name}")
        
        # Line
        y -= 5*mm
        c.line(5*mm, y, 75*mm, y)
        
        # Items header
        y -= 5*mm
        c.setFont("Helvetica-Bold", 8)
        c.drawString(5*mm, y, "Item")
        c.drawRightString(75*mm, y, "Total")
        
        # Items
        c.setFont("Helvetica", 8)
        for item in receipt.items:
            y -= 4*mm
            c.drawString(5*mm, y, item.product_name[:25])
            y -= 3*mm
            c.drawString(8*mm, y, f"{item.quantity}x @ {item.price:,.0f}")
            c.drawRightString(75*mm, y, f"{item.subtotal:,.0f}")
        
        # Line
        y -= 4*mm
        c.line(5*mm, y, 75*mm, y)
        
        # Totals
        y -= 5*mm
        c.setFont("Helvetica", 9)
        c.drawString(5*mm, y, "Subtotal:")
        c.drawRightString(75*mm, y, f"{receipt.subtotal:,.0f}")
        
        y -= 4*mm
        c.drawString(5*mm, y, "Tax (10%):")
        c.drawRightString(75*mm, y, f"{receipt.tax:,.0f}")
        
        # Total
        y -= 5*mm
        c.line(5*mm, y, 75*mm, y)
        y -= 5*mm
        c.setFont("Helvetica-Bold", 12)
        c.drawString(5*mm, y, "TOTAL:")
        c.drawRightString(75*mm, y, f"{receipt.total:,.0f}")
        
        # Footer
        y -= 10*mm
        c.setFont("Helvetica", 9)
        c.drawCentredString(40*mm, y, "Rahmat! Yana kuting!")
        y -= 4*mm
        c.drawCentredString(40*mm, y, "Thank you! Come again!")
        
        c.save()
        
        return pdf_path
    
    except Exception as e:
        print(f"Error generating PDF: {e}")
        return None


async def get_print_history(order_id: int) -> list[schemas.PrintHistoryItem]:
    """Get print history for an order (placeholder - would need database)"""
    # This would typically query a database
    # For now, return empty list
    return []


async def test_printer() -> Optional[schemas.PrintResponse]:
    """Test printer with sample receipt"""
    try:
        printer = get_printer()
        
        if not printer:
            return schemas.PrintResponse(
                order_id=0,
                printed_at=datetime.utcnow(),
                copies=1,
                status="failed",
                message="Printer not available"
            )
        
        # Print test receipt
        printer.set(align="center", bold=True, double_height=True)
        printer.text("PRINTER TEST\n")
        printer.set(bold=False, double_height=False)
        printer.text(f"\n{datetime.utcnow().strftime('%d.%m.%Y %H:%M:%S')}\n")
        printer.text("\nPrinter is working!\n")
        printer.text("Printer ishlayapti!\n\n")
        printer.cut()
        
        return schemas.PrintResponse(
            order_id=0,
            printed_at=datetime.utcnow(),
            copies=1,
            status="success",
            message="Test print successful"
        )
    
    except Exception as e:
        return schemas.PrintResponse(
            order_id=0,
            printed_at=datetime.utcnow(),
            copies=1,
            status="failed",
            message=f"Test failed: {str(e)}"
        )