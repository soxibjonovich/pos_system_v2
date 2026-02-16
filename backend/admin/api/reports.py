from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from datetime import datetime
from crud import reports as crud
import schemas.reports as schemas
from schemas import users as user_schema
from .deps import get_current_admin
import os

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/sales", response_model=schemas.SalesSummaryResponse)
async def get_sales_report(
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    _: user_schema.User = Depends(get_current_admin)
):
    """
    Get sales summary report
    """
    return await crud.get_sales_summary(start_date, end_date)


@router.get("/inventory", response_model=schemas.InventoryReportResponse)
async def get_inventory_report(_: user_schema.User = Depends(get_current_admin)):
    """
    Get inventory status report
    """
    return await crud.get_inventory_report()


@router.post("/sales/excel")
async def generate_sales_excel(
    report_request: schemas.ReportRequest,
    _: user_schema.User = Depends(get_current_admin)
):
    """
    Generate Excel sales report and download
    """
    filename = await crud.generate_excel_report(
        report_request.start_date,
        report_request.end_date
    )
    
    if not filename or not os.path.exists(filename):
        return {"error": "Failed to generate report"}
    
    return FileResponse(
        filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=os.path.basename(filename)
    )