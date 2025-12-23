from fastapi import FastAPI

from . import schema

auth = FastAPI(
    title="Auth",
    version="1.0.0",
    description="Authentication service",
    docs_url="/docs",
    redoc_url="/redoc",
)


@auth.post("/login")
async def login(user: schema.LoginUser):
    return {"status": "success"}
    # todo()!


@auth.post("/logout")
async def logout():
    return {"status": "success"}
    # todo()!
