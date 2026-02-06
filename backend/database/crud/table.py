from typing import Optional

from models import Table, TableStatus
from schemas.table import TableCreate, TableUpdate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


async def get_tables(db: AsyncSession, active_only: bool = False):
    stmt = select(Table).order_by(Table.number)
    if active_only:
        stmt = stmt.where(Table.is_active == True)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_table_by_id(db: AsyncSession, table_id: int):
    stmt = select(Table).where(Table.id == table_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_table_by_number(db: AsyncSession, number: str):
    stmt = select(Table).where(Table.number == number)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_available_tables(db: AsyncSession):
    stmt = select(Table).where(
        Table.status == TableStatus.AVAILABLE,
        Table.is_active == True
    ).order_by(Table.number)
    result = await db.execute(stmt)
    return result.scalars().all()


async def create_table(db: AsyncSession, table: TableCreate):
    db_table = Table(**table.model_dump())
    db.add(db_table)
    await db.commit()
    await db.refresh(db_table)
    return db_table


async def update_table(db: AsyncSession, table_id: int, table: TableUpdate):
    stmt = select(Table).where(Table.id == table_id)
    result = await db.execute(stmt)
    db_table = result.scalar_one_or_none()
    
    if not db_table:
        return None
    
    update_data = table.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_table, field, value)
    
    await db.commit()
    await db.refresh(db_table)
    return db_table


async def update_table_status(db: AsyncSession, table_id: int, status: TableStatus):
    stmt = select(Table).where(Table.id == table_id)
    result = await db.execute(stmt)
    db_table = result.scalar_one_or_none()
    
    if not db_table:
        return None
    
    db_table.status = status
    await db.commit()
    await db.refresh(db_table)
    return db_table


async def delete_table(db: AsyncSession, table_id: int):
    stmt = select(Table).where(Table.id == table_id)
    result = await db.execute(stmt)
    db_table = result.scalar_one_or_none()
    
    if not db_table:
        return False
    
    await db.delete(db_table)
    await db.commit()
    return True