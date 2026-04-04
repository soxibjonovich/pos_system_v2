from contextlib import asynccontextmanager

from api import (
    categories,
    order,
    printer,
    products,
    reports,
    system_config,
    table,
    users,
)
from config import settings
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from rabbitmq_client import rabbitmq_client
from sqlalchemy import text

from database import Base, engine


async def _ensure_order_extra_columns() -> None:
    if "sqlite" not in settings.DATABASE_URL:
        return
    async with engine.begin() as conn:
        cols = await conn.execute(text("PRAGMA table_info(orders)"))
        col_names = [str(row[1]) for row in cols.fetchall()]
        if "payment_method" not in col_names:
            await conn.execute(
                text("ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cash'")
            )
        if "order_type" not in col_names:
            await conn.execute(
                text("ALTER TABLE orders ADD COLUMN order_type VARCHAR(20) DEFAULT 'dine_in'")
            )


async def _ensure_product_unit_column() -> None:
    if "sqlite" not in settings.DATABASE_URL:
        return
    async with engine.begin() as conn:
        cols = await conn.execute(text("PRAGMA table_info(products)"))
        col_names = [str(row[1]) for row in cols.fetchall()]
        if "unit" not in col_names:
            await conn.execute(
                text("ALTER TABLE products ADD COLUMN unit VARCHAR(20)")
            )
        if "capacity" not in col_names:
            await conn.execute(
                text("ALTER TABLE products ADD COLUMN capacity FLOAT")
            )


async def _migrate_table_unique_constraint() -> None:
    """Replace single-column unique index on tables.number with a composite
    unique index on (number, COALESCE(location, '')) so the same table number
    can exist in different locations (e.g. Indoor/1 and Outdoor/1)."""
    if "sqlite" not in settings.DATABASE_URL:
        return
    async with engine.begin() as conn:
        indexes = await conn.execute(text("PRAGMA index_list('tables')"))
        index_names = [str(row[1]) for row in indexes.fetchall()]
        # Drop the old single-column unique index SQLAlchemy created
        for old_idx in ("ix_tables_number", "uq_tables_number"):
            if old_idx in index_names:
                await conn.execute(text(f"DROP INDEX IF EXISTS {old_idx}"))
        # Create the composite unique index if absent
        if "uq_table_number_location" not in index_names:
            await conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_table_number_location "
                    "ON tables(number, COALESCE(location, ''))"
                )
            )


async def _ensure_table_location_column() -> None:
    # Lightweight runtime migration for existing SQLite databases.
    if "sqlite" not in settings.DATABASE_URL:
        return
    async with engine.begin() as conn:
        cols = await conn.execute(text("PRAGMA table_info(tables)"))
        col_names = [str(row[1]) for row in cols.fetchall()]
        if "subcategory" not in col_names:
            await conn.execute(
                text("ALTER TABLE tables ADD COLUMN subcategory VARCHAR(100)")
            )
            col_names.append("subcategory")
        if "location" not in col_names:
            await conn.execute(
                text("ALTER TABLE tables ADD COLUMN location VARCHAR(100)")
            )
        if "subcategory" in col_names and "location" in col_names:
            await conn.execute(
                text(
                    "UPDATE tables SET location = subcategory "
                    "WHERE location IS NULL AND subcategory IS NOT NULL"
                )
            )


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _ensure_order_extra_columns()
    await _ensure_product_unit_column()
    await _ensure_table_location_column()
    await _migrate_table_unique_constraint()

    rabbitmq_connected = await rabbitmq_client.connect(retries=5, delay_seconds=2)
    if not rabbitmq_connected:
        # Keep the API alive even if RabbitMQ is still booting.
        await rabbitmq_client.connect_in_background(retries=60, delay_seconds=2)
        print(
            "⚠️ Database Service started without RabbitMQ, background reconnect enabled"
        )
    print("✅ Database Service started on port 8003")

    yield

    # Shutdown
    await rabbitmq_client.close()
    await engine.dispose()
    print("👋 Database Service stopped")


app = FastAPI(
    title="Database Microservice",
    version="1.2",
    lifespan=lifespan,
    root_path="/api/database",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse("/docs")


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "database"}


@app.exception_handler(RequestValidationError)
async def request_validation_handler(request: Request, exc: RequestValidationError):
    def _json_safe(value):
        if isinstance(value, (str, int, float, bool)) or value is None:
            return value
        if isinstance(value, (bytes, bytearray)):
            return "<binary>"
        if isinstance(value, dict):
            return {str(k): _json_safe(v) for k, v in value.items()}
        if isinstance(value, (list, tuple, set)):
            return [_json_safe(v) for v in value]
        return str(value)

    sanitized_errors = []
    for err in exc.errors():
        cleaned = _json_safe(dict(err))
        sanitized_errors.append(cleaned)

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": sanitized_errors},
    )


app.include_router(users.user_router, prefix="/users", tags=["Users"])
app.include_router(products.router, prefix="/products", tags=["Products"])
app.include_router(order.router, prefix="/orders", tags=["Orders"])
app.include_router(categories.router, prefix="/categories", tags=["Categories"])
app.include_router(table.router, prefix="/tables", tags=["Tables"])
app.include_router(printer.router, prefix="/printers", tags=["Printers"])
app.include_router(reports.router, prefix="/reports", tags=["Reports"])
app.include_router(
    system_config.router, prefix="/system-config", tags=["System Config"]
)


def run_database():
    import uvicorn

    uvicorn.run("database:app", host="0.0.0.0", port=8002, log_level="error")


if __name__ == "__main__":
    run_database()
