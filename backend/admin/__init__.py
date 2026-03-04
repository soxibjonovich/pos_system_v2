from authx.exceptions import AuthXException, MissingTokenError, NoAuthorizationError
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from api import products, users, orders, categories, table, system_config, reports

app = FastAPI(
    title="Admin Micro Service",
    version="1.0",
    root_path="/api/admin"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.product_router, prefix="")
app.include_router(users.users_router, prefix="")
app.include_router(orders.orders_router, prefix="")
app.include_router(categories.router, prefix="")
app.include_router(table.tables_router, prefix="")
app.include_router(system_config.router, prefix="")
app.include_router(reports.router, prefix="")



@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "admin"}


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


@app.exception_handler(RequestValidationError)
async def request_validation_handler(request: Request, exc: RequestValidationError):
    sanitized_errors = []
    for err in exc.errors():
        cleaned = dict(err)
        if isinstance(cleaned.get("input"), (bytes, bytearray)):
            cleaned["input"] = "<binary>"
        sanitized_errors.append(cleaned)

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": sanitized_errors},
    )


def run_admin():
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001, access_log=False, log_level="info")
