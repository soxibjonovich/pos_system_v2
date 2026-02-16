from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal


class TopProduct(BaseModel):
    product_name: str
    quantity: int
    revenue: float


class SalesByDay(BaseModel):
    date: str
    total: float


class SalesByHour(BaseModel):
    hour: int
    total: float


class SalesSummaryResponse(BaseModel):
    total_sales: float
    total_orders: int
    total_items: int
    average_order_value: float
    top_products: list[TopProduct] = Field(default_factory=list)
    sales_by_day: list[SalesByDay] = Field(default_factory=list)
    sales_by_hour: list[SalesByHour] = Field(default_factory=list)


class InventoryItem(BaseModel):
    product_name: str
    quantity: int
    price: float
    value: float
    status: Literal["in_stock", "low_stock", "out_of_stock", "unlimited"]


class InventoryReportResponse(BaseModel):
    total_products: int
    low_stock_count: int
    out_of_stock_count: int
    total_value: float
    products: list[InventoryItem] = Field(default_factory=list)


class ReportRequest(BaseModel):
    start_date: datetime | None = None
    end_date: datetime | None = None


class ExcelReportResponse(BaseModel):
    filename: str
    message: str