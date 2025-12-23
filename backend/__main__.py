from fastapi import FastAPI

from .auth import auth
from .user import user

app = FastAPI(
    title="POS system backend",
    servers=[
        {"url": "/", "description": "POS system backend"},
        {"url": "/auth", "description": "Auth service"},
        {"url": "/users", "description": "User service"},
    ],
)


@app.get("/health", summary="Check the health of the API")
async def health():
    return {"status": "ok"}


app.mount("/auth", auth, "auth")
app.mount("/users", user, "users")


def run_app():
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
