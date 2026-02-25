"""
PrintAgent - Local USB Printer Service for POS System
Runs on each POS PC, listens on localhost:9100
Auto-detects thermal printers and prints receipts
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
import sys

try:
    from aiohttp import web
    from escpos.printer import Usb, Dummy, File
    from escpos import printer
    import usb.core
    import usb.util
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "aiohttp", "python-escpos", "pyusb", "pillow"])
    from aiohttp import web
    from escpos.printer import Usb, Dummy, File
    from escpos import printer
    import usb.core
    import usb.util

# Setup logging
LOG_DIR = Path.home() / "PrintAgent" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / f"print_agent_{datetime.now():%Y%m%d}.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("PrintAgent")


class PrinterManager:
    """Manages USB thermal printer connection and auto-detection"""
    
    # Common ESC/POS thermal printer vendor IDs
    KNOWN_VENDORS = {
        0x04b8: "Epson",
        0x0519: "Star Micronics",
        0x154f: "Custom",
        0x0dd4: "Custom Engineering",
        0x0483: "Generic ESC/POS",
        0x20d1: "Xprinter",
        0x0fe6: "ICS Advent",
        0x2730: "Rongta",
        0x6868: "Zjiang",
    }
    
    def __init__(self):
        self.printer: Optional[Usb] = None
        self.printer_info: Optional[dict] = None
        self.fallback_dir = Path.home() / "PrintAgent" / "receipts"
        self.fallback_dir.mkdir(parents=True, exist_ok=True)
        
    def detect_printer(self) -> Optional[dict]:
        """Auto-detect USB thermal printer"""
        try:
            # Find all USB devices
            devices = usb.core.find(find_all=True)
            
            for device in devices:
                vendor_id = device.idVendor
                product_id = device.idProduct
                
                # Check if it's a known thermal printer vendor
                if vendor_id in self.KNOWN_VENDORS:
                    printer_info = {
                        'vendor_id': vendor_id,
                        'product_id': product_id,
                        'vendor_name': self.KNOWN_VENDORS[vendor_id],
                        'product_name': usb.util.get_string(device, device.iProduct) if device.iProduct else "Unknown",
                        'status': 'detected'
                    }
                    logger.info(f"Detected printer: {printer_info}")
                    return printer_info
                    
            logger.warning("No thermal printer detected")
            return None
            
        except Exception as e:
            logger.error(f"Error detecting printer: {e}")
            return None
    
    def connect_printer(self) -> bool:
        """Connect to detected printer"""
        try:
            if not self.printer_info:
                self.printer_info = self.detect_printer()
                
            if not self.printer_info:
                logger.warning("No printer to connect to")
                return False
            
            # Try to connect
            self.printer = Usb(
                self.printer_info['vendor_id'],
                self.printer_info['product_id'],
                timeout=5000
            )
            
            logger.info("Printer connected successfully")
            self.printer_info['status'] = 'connected'
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to printer: {e}")
            self.printer = None
            if self.printer_info:
                self.printer_info['status'] = 'error'
            return False
    
    def reconnect(self) -> bool:
        """Attempt to reconnect to printer"""
        logger.info("Attempting to reconnect printer...")
        self.printer = None
        self.printer_info = None
        return self.connect_printer()
    
    def print_receipt(self, receipt_data: dict) -> dict:
        """Print receipt or save as fallback"""
        try:
            # Try to print to physical printer
            if self.printer is None:
                # Try to connect
                if not self.connect_printer():
                    return self._save_fallback(receipt_data)
            
            # Generate receipt
            self._print_to_thermal(receipt_data)
            
            return {
                'status': 'printed',
                'printer': self.printer_info['vendor_name'],
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Print error: {e}")
            # Auto-reconnect attempt
            if self.reconnect():
                try:
                    self._print_to_thermal(receipt_data)
                    return {
                        'status': 'printed_after_reconnect',
                        'printer': self.printer_info['vendor_name'],
                        'timestamp': datetime.now().isoformat()
                    }
                except:
                    pass
            
            # Fallback to file
            return self._save_fallback(receipt_data)
    
    def _print_to_thermal(self, data: dict):
        """Print to thermal printer with ESC/POS commands"""
        p = self.printer
        
        # Header
        p.set(align='center', text_type='b', width=2, height=2)
        p.text(f"{data.get('business_name', 'POS System')}\n")
        
        p.set(align='center', text_type='normal', width=1, height=1)
        p.text(f"{data.get('business_address', '')}\n")
        p.text(f"Tel: {data.get('business_phone', '')}\n")
        p.text("================================\n")
        
        # Order info
        p.set(align='left')
        p.text(f"Order #{data.get('order_id', 'N/A')}\n")
        p.text(f"Date: {datetime.now().strftime('%d.%m.%Y %H:%M')}\n")
        p.text(f"Cashier: {data.get('cashier', 'Staff')}\n")
        if data.get('table'):
            p.text(f"Table: {data['table']}\n")
        p.text("--------------------------------\n")
        
        # Items
        for item in data.get('items', []):
            name = item.get('name', 'Item')[:20]  # Truncate long names
            qty = item.get('quantity', 1)
            price = item.get('price', 0)
            subtotal = item.get('subtotal', qty * price)
            
            p.text(f"{name}\n")
            p.text(f"  {qty} x {price:,.0f} = {subtotal:,.0f}\n")
        
        p.text("================================\n")
        
        # Total
        p.set(text_type='b', width=2, height=2)
        total = data.get('total', 0)
        p.text(f"TOTAL: {total:,.0f} so'm\n")
        
        # Footer
        p.set(align='center', text_type='normal', width=1, height=1)
        p.text("\n")
        p.text("Thank you! / Rahmat!\n")
        p.text(f"{datetime.now().strftime('%d.%m.%Y %H:%M:%S')}\n")
        
        # QR code (optional)
        if data.get('order_id'):
            try:
                p.qr(f"ORDER-{data['order_id']}", size=6)
            except:
                pass
        
        # Cut paper
        p.cut()
        
    def _save_fallback(self, receipt_data: dict) -> dict:
        """Save receipt as text file when printer unavailable"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            order_id = receipt_data.get('order_id', 'unknown')
            filename = self.fallback_dir / f"receipt_{order_id}_{timestamp}.txt"
            
            with open(filename, 'w', encoding='utf-8') as f:
                f.write("=" * 40 + "\n")
                f.write(f"{receipt_data.get('business_name', 'POS System')}\n".center(40))
                f.write(f"{receipt_data.get('business_address', '')}\n".center(40))
                f.write(f"Tel: {receipt_data.get('business_phone', '')}\n".center(40))
                f.write("=" * 40 + "\n\n")
                
                f.write(f"Order #{order_id}\n")
                f.write(f"Date: {datetime.now().strftime('%d.%m.%Y %H:%M')}\n")
                f.write(f"Cashier: {receipt_data.get('cashier', 'Staff')}\n")
                if receipt_data.get('table'):
                    f.write(f"Table: {receipt_data['table']}\n")
                f.write("-" * 40 + "\n\n")
                
                for item in receipt_data.get('items', []):
                    name = item.get('name', 'Item')
                    qty = item.get('quantity', 1)
                    price = item.get('price', 0)
                    subtotal = item.get('subtotal', qty * price)
                    f.write(f"{name}\n")
                    f.write(f"  {qty} x {price:,.0f} = {subtotal:,.0f}\n")
                
                f.write("\n" + "=" * 40 + "\n")
                f.write(f"TOTAL: {receipt_data.get('total', 0):,.0f} so'm\n")
                f.write("=" * 40 + "\n\n")
                f.write("Thank you! / Rahmat!\n".center(40))
            
            logger.info(f"Receipt saved to {filename}")
            
            return {
                'status': 'saved_to_file',
                'reason': 'printer_unavailable',
                'filepath': str(filename),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to save fallback receipt: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def test_print(self) -> dict:
        """Print a test receipt"""
        test_data = {
            'business_name': 'POS System',
            'business_address': '123 Test Street',
            'business_phone': '+998 90 123 45 67',
            'order_id': 'TEST-001',
            'cashier': 'Test User',
            'table': '5',
            'items': [
                {'name': 'Test Item 1', 'quantity': 2, 'price': 10000, 'subtotal': 20000},
                {'name': 'Test Item 2', 'quantity': 1, 'price': 15000, 'subtotal': 15000},
            ],
            'total': 35000
        }
        return self.print_receipt(test_data)


# Web Server
printer_manager = PrinterManager()

async def handle_print(request):
    """Handle print request"""
    try:
        data = await request.json()
        result = printer_manager.print_receipt(data)
        return web.json_response(result)
    except Exception as e:
        logger.error(f"Print request error: {e}")
        return web.json_response({
            'status': 'error',
            'error': str(e)
        }, status=500)

async def handle_status(request):
    """Get printer status"""
    return web.json_response({
        'printer': printer_manager.printer_info,
        'timestamp': datetime.now().isoformat()
    })

async def handle_test(request):
    """Test print"""
    result = printer_manager.test_print()
    return web.json_response(result)

async def handle_reconnect(request):
    """Force reconnect"""
    success = printer_manager.reconnect()
    return web.json_response({
        'status': 'connected' if success else 'failed',
        'printer': printer_manager.printer_info
    })

async def init_app():
    """Initialize web application"""
    app = web.Application()
    
    # CORS middleware for browser requests
    async def cors_middleware(app, handler):
        async def middleware(request):
            if request.method == 'OPTIONS':
                return web.Response(
                    headers={
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    }
                )
            response = await handler(request)
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response
        return middleware
    
    app.middlewares.append(cors_middleware)
    
    app.router.add_post('/print', handle_print)
    app.router.add_get('/status', handle_status)
    app.router.add_post('/test', handle_test)
    app.router.add_post('/reconnect', handle_reconnect)
    
    return app

def main():
    """Main entry point"""
    logger.info("=" * 60)
    logger.info("PrintAgent Starting...")
    logger.info("=" * 60)
    
    # Try initial printer detection
    printer_manager.detect_printer()
    
    if printer_manager.printer_info:
        logger.info(f"Found printer: {printer_manager.printer_info['vendor_name']}")
        printer_manager.connect_printer()
    else:
        logger.warning("No printer detected - will save to files")
    
    # Start web server
    logger.info("Starting web server on http://localhost:9100")
    logger.info("Ready to receive print jobs!")
    
    app = asyncio.run(init_app())
    web.run_app(app, host='localhost', port=9100, print=None)

if __name__ == '__main__':
    main()