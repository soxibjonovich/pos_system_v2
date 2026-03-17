"""
PrintAgent - UNIVERSAL USB Printer Service
Works with ANY ESC/POS thermal printer (58mm, 80mm)
"""

import asyncio
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    import usb.core
    import usb.util
    from aiohttp import web
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "aiohttp", "pyusb"]
    )
    import usb.core
    import usb.util
    from aiohttp import web

LOG_DIR = Path.home() / "PrintAgent" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / f"print_agent_{datetime.now():%Y%m%d}.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("PrintAgent")


# ---------------------------------------------------------------------------
# Layout — match your actual roll width here
# 58mm roll  → 32 chars
# 80mm roll  → 48 chars
# ---------------------------------------------------------------------------
LINE_WIDTH = 32
SEP_THICK  = "=" * LINE_WIDTH
SEP_THIN   = "-" * LINE_WIDTH

# ---------------------------------------------------------------------------
# ESC/POS byte constants
# ---------------------------------------------------------------------------
ESC_INIT       = b"\x1b\x40"
ESC_CHARSET    = b"\x1b\x74\x11"   # PC866 Cyrillic
ESC_BOLD_ON    = b"\x1b\x45\x01"
ESC_BOLD_OFF   = b"\x1b\x45\x00"
ESC_CENTER     = b"\x1b\x61\x01"
ESC_LEFT       = b"\x1b\x61\x00"
ESC_DBL_ON     = b"\x1d\x21\x11"   # double width + height
ESC_DBL_OFF    = b"\x1d\x21\x00"
ESC_FEED       = b"\x1b\x64\x04"
ESC_CUT        = b"\x1d\x56\x41\x05"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _enc(text: str) -> bytes:
    return text.encode("cp866", errors="ignore")


def _safe(value, max_len: int = LINE_WIDTH) -> str:
    return str(value or "").replace('"', "'").replace("\n", " ").strip()[:max_len]


def _center(text: str) -> bytes:
    """Software-center a string within LINE_WIDTH (fallback for printers that
    ignore ESC a centering on double-width text)."""
    pad = max(0, (LINE_WIDTH - len(text)) // 2)
    return _enc(" " * pad + text + "\n")


def _meta(label: str, value: str) -> bytes:
    """Bold label + normal value on one line."""
    return ESC_BOLD_ON + _enc(label) + ESC_BOLD_OFF + _enc(f": {value}\n")


def _item_line(title: str, qty: int, price: float, subtotal: float) -> bytes:
    """name left, formula right, space-padded."""
    title   = _safe(title, 14)
    formula = f"{qty} x {price:,.0f} = {subtotal:,.0f}"
    spaces  = max(1, LINE_WIDTH - len(title) - len(formula))
    return _enc(f"{title}{' ' * spaces}{formula}\n")


# ---------------------------------------------------------------------------
# Universal USB printer
# ---------------------------------------------------------------------------
class UniversalPrinter:
    def __init__(self, device):
        self.device  = device
        self.ep_out  = None

        try:
            if self.device.is_kernel_driver_active(0):
                self.device.detach_kernel_driver(0)
        except Exception:
            pass

        try:
            self.device.set_configuration()
        except Exception:
            pass

        cfg = self.device.get_active_configuration()
        for intf in cfg:
            self.ep_out = usb.util.find_descriptor(
                intf,
                custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress)
                == usb.util.ENDPOINT_OUT,
            )
            if self.ep_out:
                break

        if self.ep_out is None:
            raise ValueError("No OUT endpoint found on printer")

        logger.info(f"Printer ready — endpoint {self.ep_out.bEndpointAddress:#04x}")

    def write(self, data: bytes):
        self.ep_out.write(data, timeout=5000)

    def cut(self):
        for cmd in (b"\x1d\x56\x00", b"\x1d\x56\x01", b"\x1b\x64\x05"):
            try:
                self.write(cmd)
                return
            except Exception:
                continue


# ---------------------------------------------------------------------------
# Printer manager
# ---------------------------------------------------------------------------
class PrinterManager:
    def __init__(self):
        self.printer:      Optional[UniversalPrinter] = None
        self.printer_info: Optional[dict]             = None
        self.fallback_dir = Path.home() / "PrintAgent" / "receipts"
        self.fallback_dir.mkdir(parents=True, exist_ok=True)

    # --- detection ----------------------------------------------------------

    def _is_printer(self, device) -> bool:
        try:
            cfg = device.get_active_configuration()
            for intf in cfg:
                if intf.bInterfaceClass == 0x07:
                    return True
                ep = usb.util.find_descriptor(
                    intf,
                    custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress)
                    == usb.util.ENDPOINT_OUT,
                )
                if ep and (ep.bmAttributes & 0x03) == 0x02:
                    return True
        except Exception:
            pass
        return False

    def detect_printer(self) -> Optional[dict]:
        logger.info("Scanning USB devices...")
        for device in usb.core.find(find_all=True) or []:
            if not self._is_printer(device):
                continue
            try:
                def _str(idx):
                    try:
                        return usb.util.get_string(device, idx) if idx else "Unknown"
                    except Exception:
                        return "Unknown"

                info = {
                    "vendor_id":    device.idVendor,
                    "product_id":   device.idProduct,
                    "manufacturer": _str(device.iManufacturer),
                    "product_name": _str(device.iProduct),
                    "device":       device,
                    "status":       "detected",
                }
                logger.info(
                    f"Found: {info['manufacturer']} {info['product_name']} "
                    f"({device.idVendor:#06x}:{device.idProduct:#06x})"
                )
                self.printer_info = info
                return info
            except Exception as e:
                logger.debug(f"Device error: {e}")

        logger.warning("No USB printer found")
        return None

    def connect(self) -> bool:
        if not self.printer_info:
            self.detect_printer()
        if not self.printer_info:
            return False
        try:
            self.printer = UniversalPrinter(self.printer_info["device"])
            self.printer_info["status"] = "connected"
            logger.info("Printer connected")
            return True
        except Exception as e:
            logger.error(f"Connect failed: {e}")
            self.printer = None
            self.printer_info["status"] = "error"
            return False

    def reconnect(self) -> bool:
        self.printer      = None
        self.printer_info = None
        return self.connect()

    # --- printing -----------------------------------------------------------

    def print_receipt(self, data: dict) -> dict:
        if self.printer is None:
            if not self.connect():
                return self._fallback(data)
        try:
            self._send(data)
            return {
                "status":    "printed",
                "printer":   f"{self.printer_info['manufacturer']} {self.printer_info['product_name']}",
                "timestamp": datetime.now().isoformat(),
            }
        except Exception as e:
            logger.error(f"Print failed: {e}")
            if self.reconnect():
                try:
                    self._send(data)
                    return {
                        "status":    "printed_after_reconnect",
                        "printer":   f"{self.printer_info['manufacturer']} {self.printer_info['product_name']}",
                        "timestamp": datetime.now().isoformat(),
                    }
                except Exception:
                    pass
            return self._fallback(data)

    def _send(self, data: dict):
        """Build and stream receipt bytes to printer."""
        p   = self.printer
        now = datetime.now().strftime("%d.%m.%Y  %H:%M")

        out = ESC_INIT + ESC_CHARSET

        # ── Business name (double-size, hardware-centered) ──────────────────
        name = _safe(data.get("business_name", "POS"), LINE_WIDTH)
        out += ESC_CENTER + ESC_DBL_ON + ESC_BOLD_ON
        out += _enc(name + "\n")
        out += ESC_DBL_OFF + ESC_BOLD_OFF

        # ── Address / phone (normal, hardware-centered) ──────────────────────
        if data.get("business_address"):
            out += _enc(_safe(data["business_address"]) + "\n")
        if data.get("business_phone"):
            out += _enc(f"Tel: {data['business_phone']}\n")

        out += _enc("\n")

        # ── Separator + order meta ───────────────────────────────────────────
        out += ESC_LEFT + _enc(SEP_THICK + "\n")
        out += _meta("Order",   f"#{data.get('order_id', 'N/A')}")
        out += _meta("Date",    now)
        out += _meta("Cashier", _safe(data.get("cashier", "Staff"), 20))
        if data.get("table"):
            out += _meta("Table", str(data["table"]))
        out += _enc(SEP_THIN + "\n")

        # ── Items ────────────────────────────────────────────────────────────
        for item in data.get("items", []):
            qty      = item.get("quantity", 1)
            price    = item.get("price", 0)
            subtotal = item.get("subtotal", qty * price)
            out += _item_line(item.get("name", "Item"), qty, price, subtotal)

        out += _enc(SEP_THICK + "\n")

        # ── Totals ───────────────────────────────────────────────────────────
        subtotal_amount = data.get("subtotal_amount")
        fee_percent     = data.get("fee_percent", 0)
        fee_amount      = data.get("fee_amount", 0)

        if subtotal_amount is not None:
            out += _enc(f"Subtotal: {subtotal_amount:,.0f} so'm\n")
            if fee_amount:
                out += _enc(f"Fee ({fee_percent:g}%): {fee_amount:,.0f} so'm\n")

        total = data.get("total", 0)
        out += ESC_DBL_ON + ESC_BOLD_ON
        out += _enc(f"TOTAL: {total:,.0f}\n")
        out += ESC_DBL_OFF + ESC_BOLD_OFF
        out += _enc(SEP_THICK + "\n")

        # ── Footer ───────────────────────────────────────────────────────────
        out += ESC_CENTER
        out += _enc("\nRahmat! / Thank you!\n")
        out += _enc(f"{now}\n")

        out += ESC_FEED
        p.write(out)
        p.cut()

    def _fallback(self, data: dict) -> dict:
        """Save receipt as plain-text when printer is unavailable."""
        try:
            now      = datetime.now()
            order_id = data.get("order_id", "unknown")
            filename = self.fallback_dir / f"receipt_{order_id}_{now:%Y%m%d_%H%M%S}.txt"

            def ctr(text: str) -> str:
                return text.center(LINE_WIDTH)

            lines = [
                SEP_THICK,
                ctr(data.get("business_name", "POS")),
            ]
            if data.get("business_address"):
                lines.append(ctr(data["business_address"]))
            if data.get("business_phone"):
                lines.append(ctr(f"Tel: {data['business_phone']}"))
            lines += [
                "",
                SEP_THICK,
                f"Order: #{order_id}",
                f"Date:  {now.strftime('%d.%m.%Y  %H:%M')}",
                f"Cashier: {data.get('cashier', 'Staff')}",
            ]
            if data.get("table"):
                lines.append(f"Table: {data['table']}")
            lines.append(SEP_THIN)

            for item in data.get("items", []):
                qty      = item.get("quantity", 1)
                price    = item.get("price", 0)
                subtotal = item.get("subtotal", qty * price)
                title    = _safe(item.get("name", "Item"), 14)
                formula  = f"{qty} x {price:,.0f} = {subtotal:,.0f}"
                spaces   = max(1, LINE_WIDTH - len(title) - len(formula))
                lines.append(f"{title}{' ' * spaces}{formula}")

            lines.append(SEP_THICK)

            subtotal_amount = data.get("subtotal_amount")
            fee_amount      = data.get("fee_amount", 0)
            fee_percent     = data.get("fee_percent", 0)
            if subtotal_amount is not None:
                lines.append(f"Subtotal: {subtotal_amount:,.0f} so'm")
                if fee_amount:
                    lines.append(f"Fee ({fee_percent:g}%): {fee_amount:,.0f} so'm")

            lines += [
                f"TOTAL: {data.get('total', 0):,.0f} so'm",
                SEP_THICK,
                ctr("Rahmat! / Thank you!"),
            ]

            filename.write_text("\n".join(lines), encoding="utf-8")
            logger.info(f"Fallback receipt saved: {filename}")

            return {
                "status":    "saved_to_file",
                "reason":    "printer_unavailable",
                "filepath":  str(filename),
                "timestamp": now.isoformat(),
            }
        except Exception as e:
            logger.error(f"Fallback save failed: {e}")
            return {"status": "error", "error": str(e), "timestamp": datetime.now().isoformat()}

    def test_print(self) -> dict:
        return self.print_receipt({
            "business_name":    "POS System",
            "business_address": "123 Test Street",
            "business_phone":   "+998 90 123 45 67",
            "order_id":         "TEST-001",
            "cashier":          "Test User",
            "table":            "5",
            "items": [
                {"name": "non",   "quantity": 3, "price": 222, "subtotal": 666},
                {"name": "choy",  "quantity": 2, "price": 88,  "subtotal": 176},
                {"name": "sezar", "quantity": 3, "price": 99,  "subtotal": 297},
            ],
            "subtotal_amount": 1139,
            "fee_percent":     10,
            "fee_amount":      114,
            "total":           1253,
        })


# ---------------------------------------------------------------------------
# Web server
# ---------------------------------------------------------------------------
printer_manager = PrinterManager()


async def handle_print(request):
    try:
        result = printer_manager.print_receipt(await request.json())
        return web.json_response(result)
    except Exception as e:
        logger.error(f"Print request error: {e}")
        return web.json_response({"status": "error", "error": str(e)}, status=500)


async def handle_status(request):
    return web.json_response({
        "printer":   printer_manager.printer_info,
        "timestamp": datetime.now().isoformat(),
    })


async def handle_test(request):
    return web.json_response(printer_manager.test_print())


async def handle_reconnect(request):
    success = printer_manager.reconnect()
    return web.json_response({
        "status":  "connected" if success else "failed",
        "printer": printer_manager.printer_info,
    })


async def init_app() -> web.Application:
    app = web.Application()

    @web.middleware
    async def cors(request, handler):
        if request.method == "OPTIONS":
            return web.Response(headers={
                "Access-Control-Allow-Origin":  "*",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            })
        resp = await handler(request)
        resp.headers["Access-Control-Allow-Origin"] = "*"
        return resp

    app.middlewares.append(cors)
    app.router.add_post("/print",     handle_print)
    app.router.add_get("/status",     handle_status)
    app.router.add_post("/test",      handle_test)
    app.router.add_post("/reconnect", handle_reconnect)
    return app


def main():
    logger.info("=" * 60)
    logger.info("PrintAgent — Universal USB Printer Service")
    logger.info("=" * 60)

    if printer_manager.detect_printer():
        printer_manager.connect()
    else:
        logger.warning("No printer detected — receipts will be saved to files")

    logger.info("Starting on http://localhost:9100")

    app = asyncio.run(init_app())
    web.run_app(app, host="localhost", port=9100, print=None)


if __name__ == "__main__":
    main()