from typing import List
from fastapi import APIRouter, FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse

# Import the necessary modules
from order import crud, schemas
from order.deps import get_current_staff
from authx.exceptions import MissingTokenError, AuthXException, NoAuthorizationError

mapp = FastAPI(
    title="Order Micro Service",
    version="1.0",
)

app = APIRouter(
    prefix="/orders"
)

# Endpoint to get all orders
@app.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=List[schemas.OrderResponse],
)
async def get_orders(_: schemas.User = Depends(get_current_staff)):
    orders = await crud.get_orders()
    return orders


# Endpoint to get a single order by its ID
@app.get("/{id}", status_code=status.HTTP_200_OK, response_model=schemas.OrderResponse)
async def get_order(id: int, _: schemas.User = Depends(get_current_staff)):
    order = await crud.get_order_by_id(id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    return order


# Endpoint to edit an order
@app.put("/{id}", response_model=schemas.OrderUpdate)
async def edit_order(
    order: schemas.OrderUpdate, _: schemas.User = Depends(get_current_staff)
):
    updated_order = await crud.update_order(order.id, order)
    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    return updated_order


# Endpoint to delete an order
@app.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(id: int, _: schemas.User = Depends(get_current_staff)):
    deleted = await crud.delete_order(id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )
    return {"status": "ok"}


mapp.include_router(app)

# Exception handler for missing token
@mapp.exception_handler(MissingTokenError)
async def missing_token_handler(request: Request, exc: MissingTokenError):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": "Access denied: Missing or invalid authentication token"},
        headers={"WWW-Authenticate": "Bearer"},
    )


# Exception handler for invalid token
@mapp.exception_handler(AuthXException)
async def invalid_token_handler(request: Request, exc: AuthXException):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": "Access denied: Invalid or expired token"},
        headers={"WWW-Authenticate": "Bearer"},
    )


# Optional: Catch all other AuthX errors
@mapp.exception_handler(NoAuthorizationError)
async def authx_error_handler(request: Request, exc: NoAuthorizationError):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": "Access denied: Authentication failed"},
        headers={"WWW-Authenticate": "Bearer"},
    )


# Function to run the app
def run_order():
    import uvicorn

    uvicorn.run("order:mapp", host="0.0.0.0", port=8004, log_level="error")


if __name__ == "__main__":
    run_order()
