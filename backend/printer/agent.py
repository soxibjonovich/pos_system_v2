"""
PrintAgent - UNIVERSAL USB Printer Service
Works with ANY ESC/POS thermal printer (58mm, 80mm)
"""

import asyncio
import ctypes
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional


# ---------------------------------------------------------------------------
# libusb bootstrap — must run before any usb import
# ---------------------------------------------------------------------------
def _load_libusb():
    """Load libusb-1.0.dll on Windows before pyusb tries to find it."""
    if sys.platform != "win32":
        return
    mei = getattr(sys, "_MEIPASS", None)
    candidates = [
        Path(mei) / "libusb-1.0.dll" if mei else None,
        Path(sys.executable).parent / "libusb-1.0.dll",
        Path(__file__).parent / "libusb-1.0.dll",
    ]
    for dll in filter(None, candidates):
        if dll.exists():
            try:
                ctypes.CDLL(str(dll))
                os.environ.setdefault("LIBUSB_PATH", str(dll))
                return
            except OSError:
                continue

_load_libusb()

import usb.core  # noqa: E402
import usb.util  # noqa: E402
from aiohttp import web  # noqa: E402

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
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
# Layout
# 58mm roll → 32 chars | 80mm roll → 48 chars
# ---------------------------------------------------------------------------
LINE_WIDTH = 32
SEP_THICK  = "=" * LINE_WIDTH
SEP_THIN   = "-" * LINE_WIDTH

# ---------------------------------------------------------------------------
# ESC/POS constants
# ---------------------------------------------------------------------------
ESC_INIT    = b"\x1b\x40"
ESC_CHARSET = b"\x1b\x74\x11"  # PC866 Cyrillic
ESC_BOLD_ON = b"\x1b\x45\x01"
ESC_BOLD_OFF= b"\x1b\x45\x00"
ESC_CENTER  = b"\x1b\x61\x01"
ESC_LEFT    = b"\x1b\x61\x00"
ESC_DBL_ON  = b"\x1d\x21\x11"  # double width + height
ESC_DBL_OFF = b"\x1d\x21\x00"
ESC_FEED    = b"\x1b\x64\x04"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _enc(text: str) -> bytes:
    return text.encode("cp866", errors="ignore")

def _safe(value, max_len: int = LINE_WIDTH) -> str:
    return str(value or "").replace('"', "'").replace("\n", " ").strip()[:max_len]

def _meta(label: str, value: str) -> bytes:
    return ESC_BOLD_ON + _enc(label) + ESC_BOLD_OFF + _enc(f": {value}\n")

def _item_line(title: str, qty: int, price: float, subtotal: float) -> bytes:
    title   = _safe(title, 14)
    formula = f"{qty} x {price:,.0f} = {subtotal:,.0f}"
    spaces  = max(1, LINE_WIDTH - len(title) - len(formula))
    return _enc(f"{title}{' ' * spaces}{formula}\n")

# ---------------------------------------------------------------------------
# USB printer
# ---------------------------------------------------------------------------
class UniversalPrinter:
    def __init__(self, device):
        self.device   = device
        self.ep_out   = None
        self.intf_num = None

        # 1. Detach kernel driver from ALL interfaces
        for intf_idx in range(3):
            try:
                if device.is_kernel_driver_active(intf_idx):
                    device.detach_kernel_driver(intf_idx)
                    logger.info(f"Kernel driver detached from interface {intf_idx}")
            except NotImplementedError:
                logger.debug(
                    f"Kernel driver inspection unsupported for interface {intf_idx}"
                )
            except usb.core.USBError as e:
                if e.errno not in (2, 5):   # ENOENT / EIO — interface doesn't exist
                    if "not supported" in str(e).lower() or "unimplemented" in str(e).lower():
                        logger.debug(
                            f"Kernel driver inspection unsupported for interface {intf_idx}: {e}"
                        )
                    else:
                        logger.debug(f"detach intf {intf_idx}: {e}")
            except Exception:
                pass

        # 2. Set configuration
        logger.info(
            f"Configuring printer {device.idVendor:#06x}:{device.idProduct:#06x}"
        )
        try:
            device.set_configuration()
            logger.info("USB set_configuration succeeded")
        except NotImplementedError as e:
            logger.info(f"USB set_configuration unsupported on this platform: {e}")
        except usb.core.USBError as e:
            if e.errno not in (16, 114):    # EBUSY / EALREADY — already configured
                raise
            logger.info(f"USB set_configuration skipped: {e}")

        # 3. Find bulk-OUT endpoint, scanning ALL interfaces
        logger.info("Resolving USB printer endpoint")
        try:
            cfg = device.get_active_configuration()
            logger.info("Using active USB configuration")
            interfaces = list(cfg)
        except (NotImplementedError, usb.core.USBError) as e:
            logger.info(f"Active configuration unavailable, scanning descriptors directly: {e}")
            interfaces = []
            for cfg in device:
                interfaces.extend(list(cfg))

        for intf in interfaces:
            ep = usb.util.find_descriptor(
                intf,
                custom_match=lambda e: (
                    usb.util.endpoint_direction(e.bEndpointAddress)
                    == usb.util.ENDPOINT_OUT
                    and (e.bmAttributes & 0x03) == 0x02   # bulk only
                ),
            )
            if ep:
                self.ep_out   = ep
                self.intf_num = intf.bInterfaceNumber
                logger.info(
                    f"Selected USB endpoint {self.ep_out.bEndpointAddress:#04x} "
                    f"on interface {self.intf_num}"
                )
                break

        if self.ep_out is None:
            raise ValueError("No bulk-OUT endpoint found on printer")

        # 4. Claim interface — required on Windows and for XP-58
        logger.info(f"Claiming USB interface {self.intf_num}")
        try:
            usb.util.claim_interface(device, self.intf_num)
            logger.info(
                f"Printer ready — intf={self.intf_num} "
                f"endpoint={self.ep_out.bEndpointAddress:#04x}"
            )
        except NotImplementedError as e:
            logger.info(
                f"USB claim_interface unsupported on this platform, continuing without claim: {e}"
            )
            logger.info(
                f"Printer ready — intf={self.intf_num} "
                f"endpoint={self.ep_out.bEndpointAddress:#04x}"
            )
        except usb.core.USBError as e:
            if e.errno in (16, 114):        # already claimed — fine
                logger.info(
                    f"Printer ready (already claimed) — intf={self.intf_num} "
                    f"endpoint={self.ep_out.bEndpointAddress:#04x}"
                )
            else:
                raise ValueError(f"claim_interface failed: {e}") from e

    def write(self, data: bytes):
        """Write with one auto-reclaim retry — XP-58 drops claim after USB suspend."""
        try:
            self.ep_out.write(data, timeout=5000)
        except usb.core.USBError as e:
            logger.warning(f"Write failed ({e}), reclaiming and retrying…")
            try:
                usb.util.claim_interface(self.device, self.intf_num)
            except Exception:
                pass
            self.ep_out.write(data, timeout=5000)

    def cut(self):
        for cmd in (b"\x1d\x56\x00", b"\x1d\x56\x01", b"\x1b\x64\x05"):
            try:
                self.write(cmd)
                return
            except Exception:
                continue

    def __del__(self):
        try:
            if self.intf_num is not None:
                usb.util.release_interface(self.device, self.intf_num)
        except Exception:
            pass
# ---------------------------------------------------------------------------
# Printer manager
# ---------------------------------------------------------------------------
class PrinterManager:
    def __init__(self):
        self.printer:      Optional[UniversalPrinter] = None
        self.printer_info: Optional[dict]             = None
        self.fallback_dir = Path.home() / "PrintAgent" / "receipts"
        self.fallback_dir.mkdir(parents=True, exist_ok=True)

    def _iter_interfaces(self, device):
        """Yield every interface from every declared configuration."""
        try:
            for cfg in device:
                for intf in cfg:
                    yield intf
        except Exception as e:
            logger.debug(
                f"Could not inspect configurations for "
                f"{device.idVendor:#06x}:{device.idProduct:#06x}: {e}"
            )

    def _iter_config_interfaces(self, device):
        try:
            for cfg in device:
                for intf in cfg:
                    yield cfg, intf
        except Exception as e:
            logger.debug(
                f"Could not inspect configurations for "
                f"{device.idVendor:#06x}:{device.idProduct:#06x}: {e}"
            )

    def _log_device_debug(self, device):
        try:
            parts = []
            for cfg, intf in self._iter_config_interfaces(device):
                endpoints = []
                for ep in intf:
                    direction = usb.util.endpoint_direction(ep.bEndpointAddress)
                    dir_name = "OUT" if direction == usb.util.ENDPOINT_OUT else "IN"
                    transfer_type = ep.bmAttributes & 0x03
                    endpoints.append(
                        f"{ep.bEndpointAddress:#04x}/{dir_name}/type={transfer_type}"
                    )
                endpoints_text = ", ".join(endpoints) if endpoints else "no-endpoints"
                parts.append(
                    f"cfg={cfg.bConfigurationValue} "
                    f"intf={intf.bInterfaceNumber} "
                    f"class={intf.bInterfaceClass:#04x} "
                    f"eps=[{endpoints_text}]"
                )
            detail = " | ".join(parts) if parts else "no-interfaces"
            logger.info(
                f"USB device {device.idVendor:#06x}:{device.idProduct:#06x} -> {detail}"
            )
        except Exception as e:
            logger.info(
                f"USB device {device.idVendor:#06x}:{device.idProduct:#06x} "
                f"could not be inspected: {e}"
            )

    def _is_printer(self, device) -> bool:
        for intf in self._iter_interfaces(device):
            # Accept printer class OR vendor-specific (XP-58 uses 0xFF on some fw)
            if intf.bInterfaceClass not in (0x07, 0xFF):
                continue
            ep = usb.util.find_descriptor(
                intf,
                custom_match=lambda e: (
                    usb.util.endpoint_direction(e.bEndpointAddress)
                    == usb.util.ENDPOINT_OUT
                    and (e.bmAttributes & 0x03) == 0x02
                ),
            )
            if ep:
                logger.debug(
                    f"Matched printer interface on "
                    f"{device.idVendor:#06x}:{device.idProduct:#06x} "
                    f"class={intf.bInterfaceClass:#04x} "
                    f"intf={intf.bInterfaceNumber} "
                    f"ep_out={ep.bEndpointAddress:#04x}"
                )
                return True
        return False

    def detect_printer(self) -> Optional[dict]:
        logger.info("Scanning USB devices...")
        for device in usb.core.find(find_all=True) or []:
            self._log_device_debug(device)
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

        logger.warning("No USB printer found — will use file fallback")
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
    p   = self.printer
    now = datetime.now().strftime("%d.%m.%Y  %H:%M")

    COLS     = 32
    DBL_COLS = COLS // 2

    SEP_THICK = "=" * COLS
    SEP_THIN  = "-" * COLS

    def item_amount(value: float | int) -> str:
        return f"{float(value):,.0f} so'm"

    def qqs_line(item: dict) -> str | None:
        percent = item.get("qqs_percent")
        amount  = item.get("qqs_amount")
        if percent in (None, "", 0, 0.0) and amount in (None, "", 0, 0.0):
            return None
        amount_value = 0 if amount in (None, "") else float(amount)
        return f"QQS ({float(percent or 0):g}%) {item_amount(amount_value)}"

    out = ESC_INIT + ESC_CHARSET

    # ── Header ──────────────────────────────────────────────────────────
    name = _safe(data.get("business_name", "POS"), COLS)
    out += ESC_CENTER + ESC_DBL_ON + ESC_BOLD_ON
    out += _enc(name + "\n")
    out += ESC_DBL_OFF + ESC_BOLD_OFF
    if data.get("business_phone"):
        out += _enc(f"Tel: {data['business_phone']}\n")
    out += ESC_LEFT
    out += _enc(f"Sana va vaqti: {now}\n")
    out += _enc(f"Ishchi ismi: {_safe(data.get('cashier', 'Staff'), 20)}\n")
    out += _enc(SEP_THICK + "\n")   # thick === after header, single line

    # ── Items ────────────────────────────────────────────────────────────
    for index, item in enumerate(data.get("items", []), start=1):
        qty      = item.get("quantity", 1)
        price    = item.get("price", 0)
        subtotal = item.get("subtotal", qty * price)

        # Double-width line: "1. Name          3x"
        qty_str  = f"{qty:g}" if isinstance(qty, (int, float)) else str(qty)
        suffix   = f" {qty_str}x"
        prefix   = f"{index}. "
        name_max = max(1, DBL_COLS - len(prefix) - len(suffix))
        item_name = _safe(item.get("name", "Item"), name_max)
        pad      = DBL_COLS - len(prefix) - len(item_name) - len(suffix)
        dbl_line = f"{prefix}{item_name}{' ' * max(0, pad)}{suffix}"

        out += ESC_LEFT + ESC_DBL_ON + ESC_BOLD_ON
        out += _enc(dbl_line + "\n")
        out += ESC_BOLD_OFF + ESC_DBL_OFF

        # Normal-size price line: "50,000 x 3 = 150,000 so'm"
        formula = f"{float(price):,.0f} x {qty}"
        overall = item_amount(subtotal)
        spaces  = max(1, COLS - len(formula) - len(overall))
        out += _enc(f"{formula}{' ' * spaces}{overall}\n")

        # Optional QQS line
        qqs_text = qqs_line(item)
        if qqs_text:
            out += _enc(qqs_text.rjust(COLS) + "\n")

    out += _enc(SEP_THIN + "\n")    # thin --- after items, single line

    # ── Totals ───────────────────────────────────────────────────────────
    total       = data.get("total", 0)
    qqs_percent = data.get("qqs_percent", 0)
    qqs_amount  = data.get("qqs_amount", 0)
    fee_percent = data.get("fee_percent", 0)
    fee_amount  = data.get("fee_amount", 0)

    if qqs_amount:
        out += _enc(f"QQS ({float(qqs_percent):g}%) : {item_amount(qqs_amount)}\n")
    if fee_amount:
        out += _enc(f"Komissiya ({float(fee_percent):g}%) : {item_amount(fee_amount)}\n")

    out += ESC_BOLD_ON
    out += _enc(f"Jami to'lov : {item_amount(total)}\n")
    out += ESC_BOLD_OFF

    out += ESC_FEED
    p.write(out)
    p.cut()
    def _fallback(self, data: dict) -> dict:
        try:
            now      = datetime.now()
            order_id = data.get("order_id", "unknown")
            filename = self.fallback_dir / f"receipt_{order_id}_{now:%Y%m%d_%H%M%S}.txt"

            def item_amount(value: float | int) -> str:
                return f"{float(value):,.0f} so'm"

            def qqs_line(item: dict) -> str | None:
                percent = item.get("qqs_percent")
                amount = item.get("qqs_amount")
                if percent in (None, "", 0, 0.0) and amount in (None, "", 0, 0.0):
                    return None
                amount_value = 0 if amount in (None, "") else float(amount)
                return f"QQS ({float(percent or 0):g}%) {item_amount(amount_value)}"

            lines = [data.get("business_name", "POS")]
            if data.get("business_phone"):
                lines.append(f"Tel: {data['business_phone']}")
            lines.append(f"Sana va vaqti: {now.strftime('%d.%m.%Y  %H:%M')}")
            lines.append(f"Ishchi ismi: {data.get('cashier', 'Staff')}")
            lines.append(SEP_THIN)

            for index, item in enumerate(data.get("items", []), start=1):
                qty      = item.get("quantity", 1)
                price    = item.get("price", 0)
                subtotal = item.get("subtotal", qty * price)
                lines.append(f"{index}. {_safe(item.get('name', 'Item'), LINE_WIDTH - 3)}")
                formula = f"{float(price):,.0f} x {qty}"
                overall = item_amount(subtotal)
                spaces = max(1, LINE_WIDTH - len(formula) - len(overall))
                lines.append(f"{formula}{' ' * spaces}{overall}")
                qqs_text = qqs_line(item)
                if qqs_text:
                    lines.append(qqs_text.rjust(LINE_WIDTH))

            lines += [
                SEP_THIN,
            ]
            qqs_percent = data.get("qqs_percent", 0)
            qqs_amount = data.get("qqs_amount", 0)
            fee_percent = data.get("fee_percent", 0)
            fee_amount = data.get("fee_amount", 0)
            if qqs_amount:
                lines.append(f"QQS ({float(qqs_percent):g}%) : {item_amount(qqs_amount)}")
            if fee_amount:
                lines.append(
                    f"Komissiya ({float(fee_percent):g}%) : {item_amount(fee_amount)}"
                )
            lines.append(f"Jami to'lov : {item_amount(data.get('total', 0))}")

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
# Web handlers
# ---------------------------------------------------------------------------
printer_manager = PrinterManager()


async def handle_print(request: web.Request) -> web.Response:
    try:
        data   = await request.json()
        result = await asyncio.get_event_loop().run_in_executor(
            None, printer_manager.print_receipt, data
        )
        return web.json_response(result)
    except Exception as e:
        logger.error(f"Print request error: {e}")
        return web.json_response({"status": "error", "error": str(e)}, status=500)


async def handle_status(request: web.Request) -> web.Response:
    info = printer_manager.printer_info
    # strip non-serialisable device object before sending
    safe_info = None
    if info:
        safe_info = {k: v for k, v in info.items() if k != "device"}
    return web.json_response({
        "printer":   safe_info,
        "timestamp": datetime.now().isoformat(),
    })


async def handle_test(request: web.Request) -> web.Response:
    result = await asyncio.get_event_loop().run_in_executor(
        None, printer_manager.test_print
    )
    return web.json_response(result)


async def handle_reconnect(request: web.Request) -> web.Response:
    success = await asyncio.get_event_loop().run_in_executor(
        None, printer_manager.reconnect
    )
    info = printer_manager.printer_info
    safe_info = {k: v for k, v in info.items() if k != "device"} if info else None
    return web.json_response({
        "status":  "connected" if success else "failed",
        "printer": safe_info,
    })


# ---------------------------------------------------------------------------
# App factory — called once inside the running event loop
# ---------------------------------------------------------------------------
def create_app() -> web.Application:
    app = web.Application()

    @web.middleware
    async def cors(request: web.Request, handler):
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
    app.router.add_get( "/status",    handle_status)
    app.router.add_post("/test",      handle_test)
    app.router.add_post("/reconnect", handle_reconnect)
    return app


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    logger.info("=" * 60)
    logger.info("PrintAgent — Universal USB Printer Service")
    logger.info("=" * 60)

    # Initial printer detection (blocking, before the event loop starts)
    if printer_manager.detect_printer():
        printer_manager.connect()
    else:
        logger.warning("No printer detected — receipts will be saved to files")

    logger.info("Listening on http://localhost:9100")
    logger.info("Endpoints: POST /print  GET /status  POST /test  POST /reconnect")
    logger.info("=" * 60)

    # ------------------------------------------------------------------ #
    # FIX: create_app() here, inside web.run_app() — NOT in asyncio.run()
    # asyncio.run() creates+closes its own event loop, which makes the app
    # object incompatible with the new loop that web.run_app() opens.
    # ------------------------------------------------------------------ #
    web.run_app(
        create_app(),
        host="0.0.0.0",   # accept from local network too, not just localhost
        port=9100,
        print=None,        # suppress aiohttp's own startup banner
    )


if __name__ == "__main__":
    main()
