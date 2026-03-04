from contextlib import asynccontextmanager

from api import categories, order, products, reports, system_config, table, users
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from rabbitmq_client import rabbitmq_client

from database import Base, engine


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await rabbitmq_client.connect()
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
app.include_router(reports.router, prefix="/reports", tags=["Reports"])
app.include_router(
    system_config.router, prefix="/system-config", tags=["System Config"]
)


def run_database():
    import uvicorn

    uvicorn.run("database:app", host="0.0.0.0", port=8002, log_level="error")


if __name__ == "__main__":
    run_database()
