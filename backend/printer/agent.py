"""
PrintAgent - UNIVERSAL USB Printer Service
Works with ANY ESC/POS thermal printer (58mm, 80mm)
No specific models - detects all USB printers!
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
    import usb.core
    import usb.util
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "aiohttp", "pyusb", "pillow"])
    from aiohttp import web
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


class UniversalPrinter:
    """Universal ESC/POS printer - works with ANY thermal printer"""
    
    def __init__(self, device):
        self.device = device
        self.ep_out = None
        self.ep_in = None
        
        # Detach kernel driver if necessary
        try:
            if self.device.is_kernel_driver_active(0):
                self.device.detach_kernel_driver(0)
        except:
            pass
        
        # Set configuration
        try:
            self.device.set_configuration()
        except:
            pass
        
        # Find endpoints
        cfg = self.device.get_active_configuration()
        
        for intf in cfg:
            # Find OUT endpoint (for sending data)
            self.ep_out = usb.util.find_descriptor(
                intf,
                custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress) == usb.util.ENDPOINT_OUT
            )
            
            # Find IN endpoint (optional, for status)
            self.ep_in = usb.util.find_descriptor(
                intf,
                custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress) == usb.util.ENDPOINT_IN
            )
            
            if self.ep_out:
                break
        
        if self.ep_out is None:
            raise ValueError("No OUT endpoint found")
        
        logger.info(f"Printer initialized: OUT endpoint {self.ep_out.bEndpointAddress}")
    
    def _raw(self, data: bytes):
        """Send raw bytes to printer"""
        try:
            self.ep_out.write(data, timeout=5000)
        except Exception as e:
            logger.error(f"Print error: {e}")
            raise
    
    def text(self, txt: str):
        """Print text"""
        self._raw(txt.encode('utf-8', errors='ignore'))
    
    def set(self, align='left', text_type='normal', width=1, height=1):
        """Set text properties using standard ESC/POS commands"""
        
        # Alignment
        if align == 'center':
            self._raw(b'\x1b\x61\x01')
        elif align == 'right':
            self._raw(b'\x1b\x61\x02')
        else:  # left
            self._raw(b'\x1b\x61\x00')
        
        # Bold
        if text_type == 'b':
            self._raw(b'\x1b\x45\x01')  # Bold on
        else:
            self._raw(b'\x1b\x45\x00')  # Bold off
        
        # Size (standard ESC/POS command that works on most printers)
        size_byte = ((width - 1) << 4) | (height - 1)
        self._raw(b'\x1d\x21' + bytes([size_byte]))
    
    def cut(self):
        """Cut paper - try multiple commands for compatibility"""
        try:
            # Full cut (most common)
            self._raw(b'\x1d\x56\x00')
        except:
            try:
                # Partial cut (fallback)
                self._raw(b'\x1d\x56\x01')
            except:
                # Feed paper instead if cut doesn't work
                self._raw(b'\x1b\x64\x05')  # Feed 5 lines
    
    def qr(self, data: str, size=6):
        """Print QR code - works on most modern thermal printers"""
        try:
            qr_data = data.encode('utf-8')
            pL = len(qr_data) % 256
            pH = len(qr_data) // 256
            
            # Model 2 QR code (most compatible)
            self._raw(b'\x1d\x28\x6b' + bytes([pL + 3, pH]) + b'\x31\x50\x30' + qr_data)
            self._raw(b'\x1d\x28\x6b\x03\x00\x31\x43' + bytes([size]))
            self._raw(b'\x1d\x28\x6b\x03\x00\x31\x51\x30')
        except Exception as e:
            logger.warning(f"QR code not supported on this printer: {e}")


class PrinterManager:
    """Manages USB printer - detects ANY printer device, not just known brands"""
    
    def __init__(self):
        self.printer: Optional[UniversalPrinter] = None
        self.printer_info: Optional[dict] = None
        self.fallback_dir = Path.home() / "PrintAgent" / "receipts"
        self.fallback_dir.mkdir(parents=True, exist_ok=True)
    
    def is_printer_device(self, device) -> bool:
        """Check if device is likely a printer"""
        try:
            # USB printer class: 0x07
            # But many thermal printers use vendor-specific class
            # So we check multiple indicators
            
            # Method 1: Check interface class
            try:
                cfg = device.get_active_configuration()
                for intf in cfg:
                    if intf.bInterfaceClass == 0x07:  # Printer class
                        return True
            except:
                pass
            
            # Method 2: Check for OUT endpoint (all printers need this)
            try:
                cfg = device.get_active_configuration()
                for intf in cfg:
                    ep_out = usb.util.find_descriptor(
                        intf,
                        custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress) == usb.util.ENDPOINT_OUT
                    )
                    if ep_out:
                        # Check if it looks like a bulk transfer endpoint
                        if ep_out.bmAttributes & 0x03 == 0x02:  # Bulk transfer
                            return True
            except:
                pass
            
            return False
            
        except Exception as e:
            logger.debug(f"Error checking device: {e}")
            return False
    
    def detect_printer(self) -> Optional[dict]:
        """Auto-detect ANY USB printer - not limited to specific brands"""
        try:
            logger.info("Scanning for USB printers...")
            devices = list(usb.core.find(find_all=True))
            logger.info(f"Found {len(devices)} USB devices total")
            
            printer_candidates = []
            
            for device in devices:
                if self.is_printer_device(device):
                    try:
                        vendor_id = device.idVendor
                        product_id = device.idProduct
                        
                        # Try to get manufacturer and product name
                        try:
                            manufacturer = usb.util.get_string(device, device.iManufacturer) if device.iManufacturer else "Unknown"
                        except:
                            manufacturer = "Unknown"
                        
                        try:
                            product_name = usb.util.get_string(device, device.iProduct) if device.iProduct else "Unknown"
                        except:
                            product_name = "Unknown"
                        
                        printer_info = {
                            'vendor_id': vendor_id,
                            'product_id': product_id,
                            'manufacturer': manufacturer,
                            'product_name': product_name,
                            'device': device,
                            'status': 'detected'
                        }
                        
                        printer_candidates.append(printer_info)
                        logger.info(f"Found printer: {manufacturer} {product_name} ({hex(vendor_id)}:{hex(product_id)})")
                    
                    except Exception as e:
                        logger.debug(f"Error getting device info: {e}")
            
            if printer_candidates:
                # Return first printer found
                selected = printer_candidates[0]
                logger.info(f"Selected printer: {selected['manufacturer']} {selected['product_name']}")
                return selected
            else:
                logger.warning("No USB printers detected")
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
            
            self.printer = UniversalPrinter(self.printer_info['device'])
            
            logger.info("✅ Printer connected successfully")
            self.printer_info['status'] = 'connected'
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to printer: {e}")
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
            if self.printer is None:
                if not self.connect_printer():
                    return self._save_fallback(receipt_data)
            
            self._print_to_thermal(receipt_data)
            
            return {
                'status': 'printed',
                'printer': f"{self.printer_info['manufacturer']} {self.printer_info['product_name']}",
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Print error: {e}")
            if self.reconnect():
                try:
                    self._print_to_thermal(receipt_data)
                    return {
                        'status': 'printed_after_reconnect',
                        'printer': f"{self.printer_info['manufacturer']} {self.printer_info['product_name']}",
                        'timestamp': datetime.now().isoformat()
                    }
                except:
                    pass
            
            return self._save_fallback(receipt_data)
    
    def _print_to_thermal(self, data: dict):
        """Print to thermal printer with ESC/POS commands"""
        p = self.printer
        
        # Initialize printer
        p._raw(b'\x1b\x40')  # ESC @ - Initialize
        
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
            name = item.get('name', 'Item')[:20]
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
        
        # QR code (optional - not all printers support it)
        if data.get('order_id'):
            try:
                p.qr(f"ORDER-{data['order_id']}", size=6)
            except:
                pass
        
        # Feed and cut
        p._raw(b'\x1b\x64\x03')  # Feed 3 lines
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
    
    # CORS middleware
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
    logger.info("🖨️  PrintAgent - UNIVERSAL Printer Service")
    logger.info("=" * 60)
    
    # Try initial printer detection
    printer_manager.detect_printer()
    
    if printer_manager.printer_info:
        logger.info(f"✅ Found: {printer_manager.printer_info['manufacturer']} {printer_manager.printer_info['product_name']}")
        printer_manager.connect_printer()
    else:
        logger.warning("⚠️  No printer detected - receipts will be saved to files")
    
    # Start web server
    logger.info("🌐 Starting web server on http://localhost:9100")
    logger.info("✅ Ready to receive print jobs!")
    logger.info("=" * 60)
    
    app = asyncio.run(init_app())
    web.run_app(app, host='localhost', port=9100, print=None)

if __name__ == '__main__':
    main()