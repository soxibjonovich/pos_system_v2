from api.deps import get_current_admin
from crud import printers as crud
from fastapi import APIRouter, Depends, HTTPException, status
from schemas import printers as schema
from schemas.users import User

router = APIRouter(prefix="/printers", tags=["Printers"])


@router.get("", response_model=schema.PrintersResponse)
async def get_printers(
    active_only: bool = False,
    _: User = Depends(get_current_admin),
):
    return await crud.get_printers(active_only=active_only)


@router.get("/{printer_id}", response_model=schema.PrinterResponse)
async def get_printer(
    printer_id: int,
    _: User = Depends(get_current_admin),
):
    printer = await crud.get_printer_by_id(printer_id)
    if not printer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Printer not found"
        )
    return printer


@router.post(
    "", response_model=schema.PrinterResponse, status_code=status.HTTP_201_CREATED
)
async def create_printer(
    printer: schema.PrinterCreate,
    _: User = Depends(get_current_admin),
):
    return await crud.create_printer(printer)


@router.put("/{printer_id}", response_model=schema.PrinterResponse)
async def update_printer(
    printer_id: int,
    printer: schema.PrinterUpdate,
    _: User = Depends(get_current_admin),
):
    updated = await crud.update_printer(printer_id, printer)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Printer not found"
        )
    return updated


@router.delete("/{printer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_printer(
    printer_id: int,
    _: User = Depends(get_current_admin),
):
    deleted = await crud.delete_printer(printer_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Printer not found"
        )
