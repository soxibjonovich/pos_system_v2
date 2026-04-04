from crud import table as crud
from database import get_db
from fastapi import APIRouter, Depends, HTTPException, Query, status
from models import TableStatus
from schemas import table as schema
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

router = APIRouter(tags=["Tables"])


@router.get("", response_model=schema.TablesResponse)
async def get_tables(
    active_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    tables = await crud.get_tables(db, active_only)
    return {"tables": tables, "total": len(tables)}


@router.get("/available", response_model=schema.TablesResponse)
async def get_available_tables(db: AsyncSession = Depends(get_db)):
    tables = await crud.get_available_tables(db)
    return {"tables": tables, "total": len(tables)}


@router.get("/number/{number}", response_model=schema.TableResponse)
async def get_table_by_number(
    number: str,
    location: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    table = await crud.get_table_by_number(db, number, location)
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found"
        )
    return table


@router.get("/{table_id}", response_model=schema.TableResponse)
async def get_table(table_id: int, db: AsyncSession = Depends(get_db)):
    table = await crud.get_table_by_id(db, table_id)
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table with id {table_id} not found"
        )
    return table


@router.post("", response_model=schema.TableResponse, status_code=status.HTTP_201_CREATED)
async def create_table(
    table: schema.TableCreate,
    db: AsyncSession = Depends(get_db)
):
    existing = await crud.get_table_by_number(db, table.number, table.location)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A table with this number already exists in the same location"
        )
    return await crud.create_table(db, table)


@router.put("/{table_id}", response_model=schema.TableResponse)
async def update_table(
    table_id: int,
    table: schema.TableUpdate,
    db: AsyncSession = Depends(get_db)
):
    if table.number is not None:
        # Fetch current table to get its location for the uniqueness check
        current = await crud.get_table_by_id(db, table_id)
        check_location = table.location if table.location is not None else (current.location if current else None)
        existing = await crud.get_table_by_number(db, table.number, check_location)
        if existing and existing.id != table_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A table with this number already exists in the same location"
            )

    updated = await crud.update_table(db, table_id, table)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table with id {table_id} not found"
        )
    return updated


@router.patch("/{table_id}/status", response_model=schema.TableResponse)
async def update_table_status(
    table_id: int,
    status: TableStatus,
    db: AsyncSession = Depends(get_db)
):
    updated = await crud.update_table_status(db, table_id, status)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table with id {table_id} not found"
        )
    return updated


@router.delete("/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_table(table_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await crud.delete_table(db, table_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table with id {table_id} not found"
        )
