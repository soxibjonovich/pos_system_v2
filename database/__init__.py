from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from contextlib import asynccontextmanager
from database.api import users, products, order
from database.database import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database Service started on port 8003")
    yield
    await engine.dispose()
    print("👋 Database Service stopped")


app = FastAPI(
    title="Database Microservice",
    description="Internal database operations service (no authentication required)",
    version="1.0",
    lifespan=lifespan,
)


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse("/docs")


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "database"}


app.include_router(users.user_router, prefix="/users", tags=["Users"])
app.include_router(products.product_router, prefix="/products", tags=["Products"])
app.include_router(order.order_router, prefix="/orders", tags=["Orders"])


def run_database():
    import uvicorn

    uvicorn.run("database:app", host="0.0.0.0", port=8002, log_level="error")


if __name__ == "__main__":
    run_database()
