from fastapi import FastAPI, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse

from admin.api import users
from authx.exceptions import MissingTokenError, AuthXException, NoAuthorizationError


app = FastAPI(
    title="Admin Micro Service",
    version="1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# app.include_router(products.product_router, prefix="/api")
app.include_router(users.users_router, prefix="/api")


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


# Exception handler for missing token
@app.exception_handler(MissingTokenError)
async def missing_token_handler(request: Request, exc: MissingTokenError):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": "Access denied: Missing or invalid authentication token"},
        headers={"WWW-Authenticate": "Bearer"},
    )


# Exception handler for invalid token
@app.exception_handler(AuthXException)
async def invalid_token_handler(request: Request, exc: AuthXException):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": "Access denied: Invalid or expired token"},
        headers={"WWW-Authenticate": "Bearer"},
    )


# Optional: Catch all other AuthX errors
@app.exception_handler(NoAuthorizationError)
async def authx_error_handler(request: Request, exc: NoAuthorizationError):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": "Access denied: Authentication failed"},
        headers={"WWW-Authenticate": "Bearer"},
    )


def run_admin():
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001, access_log=False, log_level="error")
