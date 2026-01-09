from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from database.api import order, products, users
from database.database import Base, engine
from shared.rabbitmq_client import rabbitmq_client


@asynccontextmanager
async def lifespan(app: FastAPI):
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


app = FastAPI(title="Database Microservice", version="1.2", lifespan=lifespan)

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


app.include_router(users.user_router, prefix="/users", tags=["Users"])
app.include_router(products.product_router, prefix="/products", tags=["Products"])
app.include_router(order.order_router, prefix="/orders", tags=["Orders"])


def run_database():
    import uvicorn

    uvicorn.run("database:app", host="0.0.0.0", port=8002, log_level="error")


if __name__ == "__main__":
    run_database()
