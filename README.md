# 🍕 POS System v2 - Modern Microservices Architecture

[![Python](https://img.shields.io/badge/Python-3.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688.svg)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Production-ready Point of Sale system** with microservices architecture, real-time updates, receipt printing, and comprehensive reporting. Perfect for restaurants, cafes, retail stores, and markets.

## ✨ Key Features

### 🎯 Core Capabilities
- ✅ **Multi-language Support** - Uzbek, English, Russian (i18n ready)
- ✅ **PIN-based Authentication** - Simple 4-digit staff login
- ✅ **Real-time Order Updates** - WebSocket + RabbitMQ event streaming
- ✅ **Thermal Receipt Printing** - ESC/POS printer support (USB/Network/File)
- ✅ **Business Type Modes** - Restaurant (tables) or Market (quick sales)
- ✅ **Comprehensive Reports** - Sales, inventory, trends with Excel export
- ✅ **Admin Dashboard** - Real-time analytics with beautiful charts
- ✅ **Offline-ready** - SQLite database, works without constant internet

### 💼 Business Features
- 📦 **Inventory Management** - Stock tracking, low stock alerts, unlimited items
- 👥 **User & Role Management** - Admin/Staff roles with permissions
- 🍽️ **Table Management** - For restaurant mode (dine-in service)
- 🛒 **Order Processing** - Create, edit, cancel, complete orders
- 🖨️ **Auto-print Receipts** - Automatic printing on order creation
- 📊 **Sales Analytics** - Daily/hourly trends, top products, revenue tracking
- 📈 **Dashboard Widgets** - Today's sales, pending orders, inventory alerts
- 💾 **Data Export** - Excel reports with charts and summaries

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend (React + TS)                      │
│                      Nginx :80 (Browser UI)                       │
└───────────────────────────┬──────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Admin API   │    │   Auth API   │    │  Order API   │
│    :8001     │◄──►│    :8003     │◄──►│    :8004     │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       │                   │                   │
       │            ┌──────┴───────┐           │
       └───────────►│ Database API │◄──────────┘
                    │    :8002     │
                    └──────┬───────┘
                           │
       ┌───────────────────┼────────────────────────┐
       ▼                   ▼                        ▼
┌─────────────┐     ┌─────────────┐        ┌──────────────┐
│   Redis     │     │  RabbitMQ   │        │   Printer    │
│   :6379     │     │   :5672     │        │ Service :8005│
└─────────────┘     └─────────────┘        └──────────────┘
                           │
                    ┌──────┴───────┐
                    │   SQLite DB   │
                    │ pos_system.db │
                    └───────────────┘
```

### 🔧 Services Overview

| Service | Port | Description | Tech Stack |
|---------|------|-------------|------------|
| **Frontend** | 80 | React SPA with TanStack Router | React 18 + TypeScript + Tailwind + shadcn/ui |
| **Admin API** | 8001 | User/product/category/reports management | FastAPI + SQLAlchemy + openpyxl |
| **Database API** | 8002 | Data persistence, CRUD operations | FastAPI + SQLite + Alembic |
| **Auth API** | 8003 | JWT authentication, PIN verification | FastAPI + Redis + JWT |
| **Order API** | 8004 | Order processing, WebSocket updates | FastAPI + RabbitMQ + WebSockets |
| **Printer API** | 8005 | Receipt printing (thermal/PDF) | FastAPI + python-escpos + ReportLab |
| **Redis** | 6379 | Session caching, token storage | Redis 7 Alpine |
| **RabbitMQ** | 5672, 15672 | Event messaging, auto-print triggers | RabbitMQ 3.13 Management |

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Docker Compose** v2.0+
- **4GB RAM** minimum (8GB recommended)
- **10GB** disk space

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/soxibjonovich/pos_system_v2.git
cd pos_system_v2

# 2. Start all services
docker-compose up -d --build

# 3. Wait for health checks (1-2 minutes)
docker-compose ps

# 4. Access the system
# Open browser: http://localhost
```

### First Login

**Default admin credentials:**
- **PIN:** `9999`
- **Username:** `admin` (only for API docs)

**Change the admin PIN immediately after first login!**

## 🌐 Access Points

Once running, access these URLs:

| Service | URL | Credentials |
|---------|-----|-------------|
| 🎨 **Main App** | http://localhost | PIN: 9999 |
| 📚 **Admin API Docs** | http://localhost/api/admin/docs | - |
| 🔐 **Auth API Docs** | http://localhost/api/auth/docs | - |
| 📦 **Order API Docs** | http://localhost/api/order/docs | - |
| 💾 **Database API Docs** | http://localhost/api/database/docs | - |
| 🖨️ **Printer API Docs** | http://localhost/api/printer/docs | - |
| 🐰 **RabbitMQ Console** | http://localhost:15672 | guest / guest |

## 📁 Project Structure

```
pos_system_v2/
├── backend/
│   ├── admin/                # Admin microservice
│   │   ├── api/             # REST endpoints
│   │   │   ├── users.py     # User management
│   │   │   ├── products.py  # Product CRUD
│   │   │   ├── categories.py
│   │   │   ├── tables.py
│   │   │   ├── reports.py   # Sales & inventory reports
│   │   │   └── settings.py  # Business config
│   │   ├── reports_crud.py  # Report generation + Excel export
│   │   ├── reports_schemas.py
│   │   ├── service_client.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── auth/                # Authentication microservice
│   │   ├── api/
│   │   │   └── auth.py      # PIN login, JWT tokens
│   │   ├── crud.py
│   │   ├── schemas.py
│   │   ├── deps.py          # Auth dependencies
│   │   ├── redis_client.py  # Session management
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── database/            # Database microservice
│   │   ├── api/
│   │   │   ├── users.py
│   │   │   ├── products.py
│   │   │   ├── orders.py
│   │   │   ├── tables.py
│   │   │   └── reports.py   # Raw SQL reporting endpoints
│   │   ├── crud/
│   │   │   ├── users.py
│   │   │   ├── products.py
│   │   │   ├── orders.py
│   │   │   └── reports.py   # SQL aggregation queries
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── database.py      # AsyncSession setup
│   │   ├── rabbitmq_client.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── order/               # Order processing microservice
│   │   ├── api/
│   │   │   └── orders.py    # Order CRUD + WebSocket
│   │   ├── websocket_manager.py
│   │   ├── rabbitmq_client.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   └── printer/             # Printer microservice
│       ├── crud.py          # Receipt generation
│       ├── schemas.py
│       ├── rabbitmq_client.py  # Auto-print listener
│       ├── service_client.py
│       ├── Dockerfile
│       ├── requirements.txt
│       └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── login/       # PIN login page
│   │   │   ├── staff/       # POS terminal (order creation)
│   │   │   └── admin/
│   │   │       ├── dashboard/    # Analytics dashboard
│   │   │       ├── products/     # Product management
│   │   │       ├── categories/
│   │   │       ├── users/
│   │   │       ├── tables/
│   │   │       ├── reports/      # Reports & Excel download
│   │   │       ├── orders/       # Order history
│   │   │       └── settings/     # Business type config
│   │   ├── components/ui/   # shadcn components
│   │   ├── contexts/
│   │   │   └── auth-context.tsx
│   │   ├── i18n/
│   │   │   └── translations.ts   # uz, en, ru
│   │   ├── hooks/
│   │   │   └── useTranslate.ts
│   │   ├── config.tsx       # API endpoints
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docker-compose.yml       # Orchestration with health checks
├── .env.example             # Environment template
├── alembic.ini              # Database migrations
└── README.md
```

## ⚙️ Configuration

### Environment Variables

Create `.env` file (copy from `.env.example`):

```bash
# Database
DATABASE_URL=sqlite+aiosqlite:///./data/pos_system.db

# JWT Authentication
JWT_SECRET_KEY=your-super-secret-key-minimum-32-chars-change-this-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRES=3600

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_USER=guest
RABBITMQ_PASS=guest
RABBITMQ_MANAGEMENT_PORT=15672

# Printer Configuration
PRINTER_TYPE=file  # Options: file, usb, network
PRINTER_HOST=192.168.1.100  # For network printer
PRINTER_PORT=9100
USB_VENDOR_ID=0x04b8  # For USB printer
USB_PRODUCT_ID=0x0e15
BUSINESS_NAME=My Restaurant
BUSINESS_ADDRESS=123 Main St, Tashkent
BUSINESS_PHONE=+998901234567

# Frontend
FRONTEND_PORT=80

# Logging
LOG_LEVEL=info  # debug, info, warning, error
```

### 🔐 Security Notes

⚠️ **CRITICAL for Production:**
1. Change `JWT_SECRET_KEY` to a random 32+ character string
2. Change `RABBITMQ_USER` and `RABBITMQ_PASS`
3. Change default admin PIN (9999) after first login
4. Enable HTTPS with SSL certificates
5. Use PostgreSQL instead of SQLite for production
6. Set up firewall rules to restrict port access

## 🖨️ Printer Setup

### Test Mode (Default)
Receipts saved to `/app/receipts/test_print.txt` for testing.

### USB Thermal Printer
```bash
# 1. Find your printer's vendor and product ID
lsusb
# Bus 001 Device 003: ID 04b8:0e15 Seiko Epson Corp.
#                        ^^^^:^^^^
#                     vendor:product

# 2. Update .env
PRINTER_TYPE=usb
USB_VENDOR_ID=0x04b8
USB_PRODUCT_ID=0x0e15

# 3. Give Docker USB access (uncomment in docker-compose.yml)
devices:
  - "/dev/usb/lp0:/dev/usb/lp0"
privileged: true

# 4. Restart printer service
docker-compose restart printer_api
```

### Network Printer (Ethernet/WiFi)
```bash
# Update .env
PRINTER_TYPE=network
PRINTER_HOST=192.168.1.100
PRINTER_PORT=9100

# Restart
docker-compose restart printer_api
```

### Test Printing
```bash
curl -X POST http://localhost/api/printer/receipts/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Reports & Analytics

### Available Reports

1. **Sales Summary**
   - Total sales, orders, items sold
   - Average order value
   - Trend vs. yesterday

2. **Top Products**
   - Best sellers by revenue
   - Quantity sold per product
   - Revenue breakdown

3. **Daily Sales**
   - Sales by date
   - Chart visualization
   - Weekly/monthly aggregation

4. **Hourly Sales**
   - Peak hours analysis
   - Sales distribution

5. **Inventory Status**
   - Stock levels
   - Low stock alerts
   - Out of stock items
   - Total inventory value

### Excel Export

All reports can be downloaded as professional Excel files with:
- Multiple sheets (Summary, Top Products, Daily Sales)
- Charts and graphs
- Formatted tables
- Ready for printing

**Access:** Admin Panel → Reports → Download Excel

## 🎨 Frontend Features

### Multi-language Support (i18n)
- **Uzbek** (default) - O'zbekcha
- **English** - English
- **Russian** - Русский

Language switcher available in settings.

### Business Type Modes

**Restaurant Mode:**
- Table management required
- Waiter service
- Table status tracking
- Dine-in focused

**Market Mode:**
- No tables needed
- Quick retail sales
- Fast checkout
- Retail focused

**Change anytime:** Admin → Settings → Select Business Type

### Dark Mode
Full dark mode support across all pages with Tailwind CSS.

## 🧪 Testing & Development

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f admin_api
docker-compose logs -f printer_api

# Last 100 lines
docker-compose logs --tail=100 database_api
```

### Restart Individual Service
```bash
docker-compose restart admin_api
docker-compose restart printer_api
```

### Access Service Shell
```bash
docker exec -it admin_api sh
docker exec -it database_api sh
```

### Check Health
```bash
# All services status
docker-compose ps

# Individual health checks
curl http://localhost/api/admin/health
curl http://localhost/api/database/health
curl http://localhost/api/printer/health
```

### Database Migrations
```bash
# Create new migration
docker exec -it database_api alembic revision -m "description"

# Run migrations
docker exec -it database_api alembic upgrade head

# Rollback
docker exec -it database_api alembic downgrade -1
```

## 🚢 Production Deployment

### VirtualBox VM Setup (Linux Mint)

**Perfect for POS deployment** - one VM server, multiple POS terminals connect via browser.

1. **Install Linux Mint in VirtualBox**
2. **Set network to Bridged Adapter**
3. **Set static IP** (e.g., 192.168.1.100)
4. **Install Docker & Docker Compose**
5. **Clone repo and run docker-compose**
6. **On each POS PC:** Add to `C:\Windows\System32\drivers\etc\hosts`:
   ```
   192.168.1.100  pos-server
   ```
7. **Access from any device:** http://pos-server

### Recommendations

- ✅ Use PostgreSQL for production (instead of SQLite)
- ✅ Enable SSL/TLS with Let's Encrypt
- ✅ Set up Nginx reverse proxy
- ✅ Configure automated backups
- ✅ Use Docker health checks (already configured)
- ✅ Monitor with Prometheus/Grafana
- ✅ Set up log aggregation (ELK stack)
- ✅ Use secrets management (Vault, AWS Secrets)

## 📝 Common Commands

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View resource usage
docker stats

# Clean up (WARNING: deletes data)
docker-compose down -v

# Backup database
docker cp database_api:/app/data/pos_system.db ./backup_$(date +%Y%m%d).db

# Restore database
docker cp ./backup.db database_api:/app/data/pos_system.db
docker-compose restart database_api
```

## 🐛 Troubleshooting

### Services won't start
```bash
# Check if RabbitMQ is healthy
docker-compose logs rabbitmq

# Restart services in order
docker-compose restart rabbitmq
docker-compose restart redis
docker-compose restart database_api
docker-compose restart auth_api
```

### Frontend shows errors
```bash
# Check nginx logs
docker-compose logs frontend

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

### Printer not working
```bash
# Check printer service logs
docker-compose logs printer_api

# Test printer endpoint
curl -X POST http://localhost/api/printer/receipts/test

# Verify printer configuration
docker exec printer_api cat /app/.env
```

### Database locked errors
```bash
# SQLite has write lock - restart database
docker-compose restart database_api

# Or switch to PostgreSQL for production
```

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

## 👨‍💻 Author

**Сафаров Махмуд** - [@soxibjonovich](https://github.com/soxibjonovich)

## 🙏 Acknowledgments

- FastAPI for the excellent framework
- React & TanStack Router for modern frontend
- shadcn/ui for beautiful components
- RabbitMQ & Redis for reliable infrastructure
- python-escpos for thermal printing
- The open-source community

---

**Made with ❤️ for restaurants, cafes, and retail businesses**

**⭐ Star this repo if it helped you!**