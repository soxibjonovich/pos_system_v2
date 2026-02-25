# 🖨️ PrintAgent - Local USB Thermal Printer Service

**Silent, automatic receipt printing for POS terminals**

PrintAgent runs on each POS PC and handles USB thermal printer communication. When a cashier creates an order, the receipt prints automatically to their local printer.

---

## 🎯 What It Does

```
Staff creates order → Frontend sends to localhost:9100 → PrintAgent prints → Receipt comes out ✅
```

- ✅ **Auto-detects** any USB thermal printer
- ✅ **Auto-reconnects** if printer unplugged/replug ged
- ✅ **Silent printing** - no dialogs, no clicks
- ✅ **PDF fallback** - saves receipts if printer offline
- ✅ **Universal support** - Epson, Star, Xprinter, Rongta, Generic ESC/POS
- ✅ **Runs in background** - system tray icon shows status

---

## 📦 What's Included

```
PrintAgent/
├── PrintAgent.exe          # Main executable (~8MB)
├── print-agent.py          # Source code
├── build-exe.py            # Build script
├── install.bat             # Auto-installer
└── README.md               # This file
```

---

## 🚀 Installation (Each POS PC)

### Option A: Quick Install (Recommended)

1. **Copy files to POS PC**
   ```
   C:\PrintAgent\
   ├── PrintAgent.exe
   └── install.bat
   ```

2. **Right-click `install.bat` → Run as Administrator**
   - Creates startup shortcut
   - Adds to autostart
   - Launches PrintAgent

3. **Plug in USB printer**
   - Should auto-detect within 5 seconds
   - Green icon in system tray = ready ✅

### Option B: Manual Install

1. **Copy `PrintAgent.exe` to:** `C:\PrintAgent\`

2. **Run PrintAgent.exe**
   - Check system tray for green printer icon

3. **Add to startup (so it auto-runs on boot):**
   - Press `Win + R`
   - Type: `shell:startup`
   - Create shortcut to `C:\PrintAgent\PrintAgent.exe`

4. **Plug in USB printer**

---

## 🖥️ Supported Printers

### Tested Brands:
- ✅ **Epson** (TM-T20, TM-T88, etc.)
- ✅ **Star Micronics** (TSP143, TSP650)
- ✅ **Xprinter** (XP-58, XP-80)
- ✅ **Rongta** (RP80, RP326)
- ✅ **Zjiang** (ZJ-5890K, ZJ-8250)
- ✅ **Generic ESC/POS** thermal printers

### Requirements:
- **USB connection** (not Bluetooth or WiFi for now)
- **ESC/POS compatible** (most thermal printers are)
- **80mm or 58mm** paper width

---

## 🔧 Usage

### For Staff (POS Operators):

**Nothing!** Just create orders normally.

Receipts print automatically. If PrintAgent is running and printer connected, you'll never even know it's there.

### For Admins:

**Test printing:**
1. Open browser → go to your POS system
2. Admin → Settings → Printer Settings
3. Click **Test Print**
4. Receipt should print

**Check status:**
- Look at system tray (bottom-right of screen)
- 🟢 Green icon = Printer connected
- 🟡 Yellow icon = PrintAgent running, no printer
- 🔴 Red icon = PrintAgent not running

**Troubleshooting:**
- Double-click system tray icon to see log
- Or check: `C:\Users\YourName\PrintAgent\logs\`

---

## 📡 API Endpoints

PrintAgent listens on `http://localhost:9100`

### POST /print
Print a receipt.

**Request:**
```json
{
  "order_id": 123,
  "business_name": "My Restaurant",
  "business_address": "123 Main St",
  "business_phone": "+998 90 123 4567",
  "cashier": "John Doe",
  "table": "5",
  "items": [
    {
      "name": "Pepperoni Pizza",
      "quantity": 2,
      "price": 50000,
      "subtotal": 100000
    }
  ],
  "total": 100000
}
```

**Response:**
```json
{
  "status": "printed",
  "printer": "Epson",
  "timestamp": "2026-02-17T10:30:00"
}
```

### GET /status
Get printer status.

**Response:**
```json
{
  "printer": {
    "vendor_id": 1208,
    "product_id": 3605,
    "vendor_name": "Epson",
    "product_name": "TM-T20II",
    "status": "connected"
  },
  "timestamp": "2026-02-17T10:30:00"
}
```

### POST /test
Print a test receipt.

### POST /reconnect
Force reconnect to printer.

---

## 🐛 Troubleshooting

### PrintAgent won't start
```
1. Check if Python is installed (not required for .exe)
2. Run as Administrator
3. Check antivirus isn't blocking it
4. Look at logs in C:\Users\YourName\PrintAgent\logs\
```

### Printer not detected
```
1. Check USB cable is plugged in
2. Check printer is powered on
3. Try different USB port
4. Restart PrintAgent (right-click tray icon → Exit → relaunch)
5. Click "Reconnect" button in admin settings
```

### Receipts saving to file instead of printing
```
1. Printer might be offline/out of paper
2. Check system tray icon - should be green
3. Manually test: Admin → Settings → Test Print
4. Check printer status lights (usually green = ready)
5. Receipts saved to: C:\Users\YourName\PrintAgent\receipts\
```

### "Connection refused" error in browser
```
1. PrintAgent not running - check system tray
2. Firewall blocking localhost:9100 (unlikely but possible)
3. Another program using port 9100 (stop it)
```

### Receipt printed but looks weird
```
1. Wrong paper width - check printer settings
2. Some characters missing - might need different encoding
3. QR code too large - printer model doesn't support it (not critical)
```

---

## 🔨 Building from Source

If you need to modify PrintAgent:

1. **Install Python 3.11+**

2. **Install dependencies:**
   ```bash
   pip install aiohttp python-escpos pyusb pillow
   ```

3. **Run from source:**
   ```bash
   python print-agent.py
   ```

4. **Build new .exe:**
   ```bash
   python build-exe.py
   ```

Output: `dist/PrintAgent.exe`

---

## 📁 File Locations

```
C:\PrintAgent\
├── PrintAgent.exe           # The program

C:\Users\YourName\PrintAgent\
├── logs\                    # Log files (one per day)
│   └── print_agent_20260217.log
└── receipts\                # PDF fallback receipts
    └── receipt_123_20260217_103045.txt
```

---

## ⚙️ Advanced Configuration

### Add Custom Printer (if auto-detect fails)

Edit `print-agent.py` and add your printer's VID:PID to `KNOWN_VENDORS`:

```python
KNOWN_VENDORS = {
    0x04b8: "Epson",
    0xYOUR_VID: "Your Printer Name",  # Add this line
}
```

Find your VID:PID:
1. Open Device Manager
2. Find your printer under "Printers" or "USB devices"
3. Properties → Details → Hardware IDs
4. Look for `VID_XXXX&PID_XXXX`

---

## 🆘 Support

**Logs location:** `C:\Users\YourName\PrintAgent\logs\`

Send logs when reporting issues!

**Common issues:**
- No printer detected → Try different USB port
- Receipt garbled → Wrong paper width setting
- Port 9100 in use → Close other printer software

---

## 📋 Checklist for Each POS PC

- [ ] Copy PrintAgent.exe to `C:\PrintAgent\`
- [ ] Run install.bat as Administrator
- [ ] Plug in USB thermal printer
- [ ] See green icon in system tray
- [ ] Open POS system in browser
- [ ] Go to Admin → Settings → Printer
- [ ] Click "Test Print"
- [ ] Receipt prints! ✅

---

## 🎁 Features

- ✅ Auto-detect any ESC/POS printer
- ✅ Auto-reconnect on unplug
- ✅ Silent background printing
- ✅ PDF fallback if printer offline
- ✅ System tray status indicator
- ✅ Auto-start on Windows boot
- ✅ QR codes on receipts
- ✅ Bilingual (Uzbek/English)
- ✅ CORS enabled for browser requests
- ✅ Detailed logging
- ✅ Zero-config for end users

---

**Made with ❤️ for POS System v2**

Need help? Check the logs or contact your system administrator.