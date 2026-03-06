from crud import printer as crud
from database import get_db
from fastapi import APIRouter, Depends, HTTPException, status
from schemas import printer as schema
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["Printers"])


@router.get("", response_model=schema.PrintersResponse)
async def get_printers(active_only: bool = False, db: AsyncSession = Depends(get_db)):
    printers = await crud.get_printers(db, active_only=active_only)
    return {"printers": printers, "total": len(printers)}


@router.get("/{printer_id}", response_model=schema.PrinterResponse)
async def get_printer(printer_id: int, db: AsyncSession = Depends(get_db)):
    printer = await crud.get_printer_by_id(db, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    return printer


@router.post(
    "", response_model=schema.PrinterResponse, status_code=status.HTTP_201_CREATED
)
async def create_printer(
    printer: schema.PrinterCreate, db: AsyncSession = Depends(get_db)
):
    existing = await crud.get_printer_by_name(db, printer.name.strip())
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Printer with this name already exists",
        )
    return await crud.create_printer(db, printer)


@router.put("/{printer_id}", response_model=schema.PrinterResponse)
async def update_printer(
    printer_id: int, printer: schema.PrinterUpdate, db: AsyncSession = Depends(get_db)
):
    if printer.name:
        existing = await crud.get_printer_by_name(db, printer.name.strip())
        if existing and existing["id"] != printer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Printer with this name already exists",
            )

    updated = await crud.update_printer(db, printer_id, printer)
    if not updated:
        raise HTTPException(status_code=404, detail="Printer not found")
    return updated


@router.delete("/{printer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_printer(printer_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await crud.delete_printer(db, printer_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Printer not found")
