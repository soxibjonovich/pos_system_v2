# CLAUDE.md

## Project
POS System v2 — microservices, FastAPI backend, React+TS frontend.

## Services
| Service | Port | Dir |
|---------|------|-----|
| Admin API | 8001 | `backend/admin/` |
| Database API | 8002 | `backend/database/` |
| Auth API | 8003 | `backend/auth/` |
| Order API | 8004 | `backend/order/` |
| Printer API | 8005 | `backend/printer/` |
| Frontend | 80 | `frontend/` |

## Tech Stack
- **Backend:** Python 3.13, FastAPI, SQLAlchemy (async), SQLite+aiosqlite, Alembic, Redis, RabbitMQ
- **Frontend:** React 18, TypeScript, TanStack Router, Tailwind CSS, shadcn/ui
- **Infra:** Docker Compose, Nginx

## Key Conventions
- All DB ops are async (`AsyncSession`)
- Inter-service calls via `service_client.py` (HTTP)
- Events via RabbitMQ; sessions/tokens via Redis
- Migrations: Alembic (`backend/database/`)
- i18n: `frontend/src/i18n/translations.ts` (uz/en/ru)

## Dev Commands
```bash
docker-compose up -d --build   # start all
docker-compose logs -f <svc>   # logs
docker-compose restart <svc>   # restart one
docker exec -it database_api alembic upgrade head  # migrate
```

## Guides
- See [tests.md](tests.md) for testing
- See [formatter.md](formatter.md) for code style
- See [ui.md](ui.md) for frontend UI rules
