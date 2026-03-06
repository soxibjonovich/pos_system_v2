import httpx
from config import settings
from fastapi import HTTPException, status
from schemas import printers as schema


class ServiceClient:
    def __init__(self):
        self.client = httpx.AsyncClient(
            base_url=settings.DATABASE_SERVICE_URL, timeout=10.0
        )

    async def close(self):
        await self.client.aclose()


service_client = ServiceClient()


async def get_printers(active_only: bool = False) -> schema.PrintersResponse:
    try:
        response = await service_client.client.get(
            "/printers", params={"active_only": str(active_only).lower()}
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch printers",
            )
        return schema.PrintersResponse(**response.json())
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )


async def get_printer_by_id(printer_id: int) -> schema.PrinterResponse | None:
    try:
        response = await service_client.client.get(f"/printers/{printer_id}")
        if response.status_code == 404:
            return None
        if response.status_code != 200:
            return None
        return schema.PrinterResponse(**response.json())
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
    except Exception:
        return None


async def create_printer(printer: schema.PrinterCreate) -> schema.PrinterResponse:
    try:
        response = await service_client.client.post(
            "/printers", json=printer.model_dump()
        )
        if response.status_code == 400:
            detail = response.json().get("detail", "Invalid printer data")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
        if response.status_code != 201:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create printer",
            )
        return schema.PrinterResponse(**response.json())
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )


async def update_printer(
    printer_id: int, printer: schema.PrinterUpdate
) -> schema.PrinterResponse | None:
    try:
        response = await service_client.client.put(
            f"/printers/{printer_id}", json=printer.model_dump(exclude_unset=True)
        )
        if response.status_code == 404:
            return None
        if response.status_code == 400:
            detail = response.json().get("detail", "Invalid printer data")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update printer",
            )
        return schema.PrinterResponse(**response.json())
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )


async def delete_printer(printer_id: int) -> bool:
    try:
        response = await service_client.client.delete(f"/printers/{printer_id}")
        if response.status_code == 404:
            return False
        if response.status_code != 204:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete printer",
            )
        return True
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable",
        )
