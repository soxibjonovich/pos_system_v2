# POS System - Microservices Architecture

[![Python](https://img.shields.io/badge/Python-3.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688.svg)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Modern Point of Sale system built with FastAPI microservices, featuring real-time updates via WebSockets and RabbitMQ event-driven architecture.

## 🏗️ Architecture
```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Admin     │      │    Auth     │      │   Order     │
│   :8001     │◄────►│   :8003     │◄────►│   :8004     │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │                    ▼                    │
       │             ┌─────────────┐             │
       └────────────►│  Database   │◄────────────┘
                     │   :8002     │
                     └──────┬──────┘
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│    Redis    │      │  RabbitMQ   │      │   SQLite    │
│   :6379     │      │   :5672     │      │  Database   │
└─────────────┘      └─────────────┘      └─────────────┘
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| **Admin API** | 8001 | Admin management, user oversight, product/order monitoring |
| **Database API** | 8002 | Data persistence layer, CRUD operations |
| **Auth API** | 8003 | Authentication, authorization, JWT token management |
| **Order API** | 8004 | Order processing, WebSocket updates, kitchen display |
| **Redis** | 6379 | Token storage, session caching |
| **RabbitMQ** | 5672, 15672 | Event messaging, real-time notifications |

## 🚀 Quick Start with Docker

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0+
- 4GB RAM minimum
- 10GB disk space

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/your-username/pos_system.git
cd pos_system
```

2. **Start services (Windows):**
```cmd
start.bat
```

   **Or (Linux/macOS):**
```bash
chmod +x start.sh
./start.sh
```

3. **Quick start alternative:**
```bash
# Windows
quick-start.bat

# Linux/macOS
./quick-start.sh
```

4. **Manual start:**
```bash
docker-compose up -d --build
```

### 🌐 Access Services

Once started, services are available at:

- 📊 **Admin API**: http://localhost:8001/docs
- 💾 **Database API**: http://localhost:8002/docs
- 🔐 **Auth API**: http://localhost:8003/docs
- 📦 **Order API**: http://localhost:8004/docs
- 🐰 **RabbitMQ Management**: http://localhost:15672
  - Username: `admin`
  - Password: `pos_password_2024`

### 📝 Useful Docker Commands

```bash
# View service status
docker-compose ps

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f database

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Restart specific service
docker-compose restart auth

# Access service shell
docker exec -it database_api sh
docker exec -it auth_api sh
docker exec -it admin_api sh
docker exec -it order_api sh

# Clean everything (including volumes)
docker-compose down -v

# Check resource usage
docker stats
```

## 🛠️ Development without Docker

### Prerequisites

- Python 3.13+
- Redis 7+
- RabbitMQ 3.13+
- SQLite 3+

### Setup

1. **Create virtual environment:**
```bash
python -m venv .venv

# Activate
source .venv/bin/activate  # Linux/macOS
.venv\Scripts\activate     # Windows
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Start infrastructure services:**
```bash
# Start Redis
redis-server

# Start RabbitMQ (separate terminal)
rabbitmq-server
```

4. **Run database migrations:**
```bash
alembic upgrade head
```

5. **Start all microservices:**
```bash
python main.py
```

   **Or start individually:**
```bash
# Terminal 1 - Database
python -m database.main

# Terminal 2 - Auth
python -m auth.main

# Terminal 3 - Admin
python -m admin.main

# Terminal 4 - Order
python -m order.main
```

## 📁 Project Structure

```
pos_system/
├── backend/
│   ├── admin/              # Admin microservice
│   │   ├── api/           # API routes
│   │   ├── crud/          # Database operations
│   │   ├── schemas/       # Pydantic models
│   │   ├── config.py      # Configuration
│   │   ├── main.py        # Service entry point
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── auth/              # Authentication microservice
│   │   ├── api/
│   │   ├── crud/
│   │   ├── schemas/
│   │   ├── deps.py        # Dependencies (auth checks)
│   │   ├── redis_client.py
│   │   ├── config.py
│   │   ├── main.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── database/          # Database microservice
│   │   ├── api/
│   │   ├── crud/
│   │   ├── models.py      # SQLAlchemy models
│   │   ├── schemas/
│   │   ├── database.py    # DB connection
│   │   ├── rabbitmq_client.py
│   │   ├── config.py
│   │   ├── main.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   └── order/             # Order microservice
│       ├── api/
│       ├── crud/
│       ├── schemas/
│       ├── websocket_manager.py
│       ├── rabbitmq_client.py
│       ├── config.py
│       ├── main.py
│       ├── Dockerfile
│       └── requirements.txt
│
├── alembic/               # Database migrations
│   ├── versions/
│   └── env.py
├── data/                  # SQLite database (gitignored)
├── docker-compose.yml     # Docker orchestration
├── start.bat              # Windows launcher
├── start.sh               # Linux/macOS launcher
├── quick-start.bat        # Quick Windows start
├── quick-start.sh         # Quick Unix start
├── .env.example           # Environment template
├── .dockerignore
├── .gitignore
├── alembic.ini
└── README.md
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory (or copy from `.env.example`):

```bash
# Project Info
PROJECT_NAME=POS System
VERSION=1.0.0

# Service URLs (Docker)
DATABASE_SERVICE_URL=http://database_api:8002
AUTH_SERVICE_URL=http://auth_api:8003

# Database
DATABASE_URL=sqlite+aiosqlite:///./data/pos_system.db

# Authentication
SECRET_KEY=your-super-secret-key-change-in-production-make-it-very-long-and-random
ALGORITHM=HS256
TOKEN_EXPIRE_DAYS=7

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL=amqp://admin:pos_password_2024@rabbitmq:5672/
```

### Security Notes

⚠️ **IMPORTANT**: Change these values in production:
- `SECRET_KEY` - Use a long, random string (minimum 32 characters)
- `RABBITMQ_DEFAULT_PASS` - Change default RabbitMQ password
- Consider using environment-specific `.env` files

## 🔥 Features

### Core Features
- ✅ **Multi-tenant Architecture** - Isolated microservices
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Role-based Access Control** - Admin, Staff, Chef roles
- ✅ **Real-time Updates** - WebSocket for live order updates
- ✅ **Event-driven** - RabbitMQ message bus
- ✅ **RESTful APIs** - OpenAPI/Swagger documentation
- ✅ **Database Migrations** - Alembic for version control

### Business Features
- 📦 **Product Management** - CRUD operations, stock tracking
- 👥 **User Management** - Staff, roles, permissions
- 🛒 **Order Processing** - Create, update, track orders
- 💰 **Payment Processing** - Multiple payment methods
- 📊 **Reporting** - Sales, inventory, analytics
- 🔔 **Real-time Notifications** - Order status updates

## 🧪 Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=backend

# Specific service
pytest backend/auth/tests/
```

## 📊 Monitoring

### Health Checks

Each service exposes a `/health` endpoint:

```bash
curl http://localhost:8001/health  # Admin
curl http://localhost:8002/health  # Database
curl http://localhost:8003/health  # Auth
curl http://localhost:8004/health  # Order
```

### Logs

```bash
# View all logs
docker-compose logs -f

# Specific service
docker-compose logs -f database

# Last 100 lines
docker-compose logs --tail=100 auth
```

## 🚢 Production Deployment

### Docker Production Build

```bash
# Build for production
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Recommendations

1. **Use PostgreSQL** instead of SQLite for production
2. **Enable SSL/TLS** for all services
3. **Set up reverse proxy** (Nginx/Traefik)
4. **Configure logging** to external service
5. **Set up monitoring** (Prometheus/Grafana)
6. **Regular backups** of database
7. **Use secrets management** (Vault, AWS Secrets Manager)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Authors

- **Your Name** - *Initial work* - [YourGitHub](https://github.com/yourusername)

## 🙏 Acknowledgments

- FastAPI for the amazing framework
- Docker for containerization
- RabbitMQ for reliable messaging
- Redis for fast caching
- The open-source community

##