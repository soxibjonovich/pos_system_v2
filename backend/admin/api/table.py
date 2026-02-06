from api.deps import get_current_admin
from crud import table as crud
from fastapi import APIRouter, Depends, HTTPException, status
from schemas import table as schema
from schemas.users import User

tables_router = APIRouter(prefix="/tables", tags=["Tables"])


@tables_router.get("", response_model=schema.Tables)
async def get_tables(
    active_only: bool = False,
    _: User = Depends(get_current_admin),
):
    return await crud.get_tables(active_only)


@tables_router.get("/available", response_model=schema.Tables)
async def get_available_tables(_: User = Depends(get_current_admin)):
    return await crud.get_available_tables()


@tables_router.get("/{table_id}", response_model=schema.Table)
async def get_table(
    table_id: int,
    _: User = Depends(get_current_admin),
):
    table = await crud.get_table_by_id(table_id)
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found"
        )
    return table


@tables_router.post("", response_model=schema.Table, status_code=status.HTTP_201_CREATED)
async def create_table(
    table_in: schema.TableCreate,
    _: User = Depends(get_current_admin),
):
    table = await crud.create_table(table_in)
    if not table:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Table number already exists"
        )
    return table


@tables_router.put("/{table_id}", response_model=schema.Table)
async def update_table(
    table_id: int,
    table_in: schema.TableUpdate,
    _: User = Depends(get_current_admin),
):
    if table_in.number:
        existing = await crud.get_table_by_number(table_in.number)
        if existing and existing.id != table_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Table number already exists"
            )
    
    table = await crud.update_table(table_id, table_in)
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found"
        )
    return table


@tables_router.patch("/{table_id}/status", response_model=schema.Table)
async def update_table_status(
    table_id: int,
    status_data: schema.TableStatusUpdate,
    _: User = Depends(get_current_admin),
):
    try:
        table = await crud.get_table_by_id(table_id)
        if not table:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Table not found"
            )
        
        updated_table = await crud.update_table_status(table_id, status_data.status)
        if not updated_table:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update table status"
            )
        
        return updated_table
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating table status: {str(e)}"
        )


@tables_router.delete("/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_table(
    table_id: int,
    _: User = Depends(get_current_admin),
):
    deleted = await crud.delete_table(table_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found"
        )