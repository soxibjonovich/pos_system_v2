from contextlib import asynccontextmanager
from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import crud
import schemas
# from deps import get_current_staff
from rabbitmq_client import rabbitmq_client
import os


async def handle_order_event(data: dict):
    """Handle order events for automatic printing"""
    if data.get("action") == "created" and data.get("auto_print"):
        order_id = data.get("order_id")
        if order_id:
            await crud.print_receipt(order_id)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await rabbitmq_client.connect()
    await rabbitmq_client.subscribe("order.created", handle_order_event)
    
    # Create receipts directory if it doesn't exist
    os.makedirs("/app/receipts", exist_ok=True)
    
    yield
    
    # Shutdown
    await rabbitmq_client.close()
    await crud.service_client.close()


mapp = FastAPI(
    title="Printer Microservice",
    version="1.0",
    lifespan=lifespan,
    root_path="/api/printer"
)

mapp.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@mapp.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "printer"}


app = APIRouter(prefix="/receipts", tags=["Receipts"])


@app.post("", response_model=schemas.PrintResponse, status_code=status.HTTP_201_CREATED)
async def print_receipt(
    print_request: schemas.PrintRequest,
    # _: schemas.User = Depends(get_current_staff)
):
    """
    Print a receipt for an order
    """
    result = await crud.print_receipt(print_request.order_id, print_request.copies)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found or printing failed"
        )
    
    return result


@app.get("/{order_id}", response_model=schemas.ReceiptResponse)
async def get_receipt(
    order_id: int,
    # _: schemas.User = Depends(get_current_staff)
):
    """
    Get receipt data for an order without printing
    """
    receipt = await crud.get_receipt_data(order_id)
    
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    return receipt


@app.get("/{order_id}/download")
async def download_receipt(
    order_id: int,
    # _: schemas.User = Depends(get_current_staff)
):
    """
    Download receipt as PDF
    """
    pdf_path = await crud.generate_pdf_receipt(order_id)
    
    if not pdf_path or not os.path.exists(pdf_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found"
        )
    
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"receipt_{order_id}.pdf"
    )


@app.get("/history/{order_id}", response_model=schemas.PrintHistoryResponse)
async def get_print_history(
    order_id: int,
    # _: schemas.User = Depends(get_current_staff)
):
    """
    Get print history for an order
    """
    history = await crud.get_print_history(order_id)
    return {"order_id": order_id, "prints": history}


@app.post("/test", response_model=schemas.PrintResponse)
async def test_print(
    # _: schemas.User = Depends(get_current_staff)
):
    """
    Test printer with a sample receipt
    """
    result = await crud.test_printer()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Printer test failed"
        )
    
    return result


mapp.include_router(app)


def run_printer():
    import uvicorn
    uvicorn.run(
        "printer:mapp",
        host="0.0.0.0",
        port=8005,
        log_level="info",
        reload=True
    )


if __name__ == "__main__":
    run_printer()