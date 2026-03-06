import json

from models import PrinterConfig
from schemas.printer import PrinterCreate, PrinterUpdate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


def _normalize_categories(values: list[str] | None) -> list[str]:
    if not values:
        return []
    cleaned: list[str] = []
    for value in values:
        text = str(value).strip()
        if text and text not in cleaned:
            cleaned.append(text)
    return cleaned


def _decode_categories(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        decoded = json.loads(raw)
        if isinstance(decoded, list):
            return _normalize_categories([str(v) for v in decoded])
    except Exception:
        pass
    return []


def _encode_categories(values: list[str] | None) -> str:
    return json.dumps(_normalize_categories(values), ensure_ascii=False)


def _to_printer_response(printer: PrinterConfig) -> dict:
    return {
        "id": printer.id,
        "name": printer.name,
        "host": printer.host,
        "port": printer.port,
        "categories": _decode_categories(printer.categories),
        "is_active": printer.is_active,
        "created_at": printer.created_at,
        "updated_at": printer.updated_at,
    }


async def get_printers(db: AsyncSession, active_only: bool = False):
    stmt = select(PrinterConfig).order_by(PrinterConfig.created_at.desc())
    if active_only:
        stmt = stmt.where(PrinterConfig.is_active == True)
    result = await db.execute(stmt)
    return [_to_printer_response(item) for item in result.scalars().all()]


async def get_printer_by_id(db: AsyncSession, printer_id: int):
    stmt = select(PrinterConfig).where(PrinterConfig.id == printer_id)
    result = await db.execute(stmt)
    printer = result.scalar_one_or_none()
    return _to_printer_response(printer) if printer else None


async def get_printer_by_name(db: AsyncSession, name: str):
    stmt = select(PrinterConfig).where(PrinterConfig.name == name)
    result = await db.execute(stmt)
    printer = result.scalar_one_or_none()
    return _to_printer_response(printer) if printer else None


async def create_printer(db: AsyncSession, printer: PrinterCreate):
    db_printer = PrinterConfig(
        name=printer.name.strip(),
        host=printer.host.strip(),
        port=printer.port,
        categories=_encode_categories(printer.categories),
        is_active=printer.is_active,
    )
    db.add(db_printer)
    await db.commit()
    await db.refresh(db_printer)
    return _to_printer_response(db_printer)


async def update_printer(db: AsyncSession, printer_id: int, printer: PrinterUpdate):
    stmt = select(PrinterConfig).where(PrinterConfig.id == printer_id)
    result = await db.execute(stmt)
    db_printer = result.scalar_one_or_none()
    if not db_printer:
        return None

    update_data = printer.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "categories":
            setattr(db_printer, field, _encode_categories(value))
        elif field in {"name", "host"} and value is not None:
            setattr(db_printer, field, str(value).strip())
        else:
            setattr(db_printer, field, value)

    await db.commit()
    await db.refresh(db_printer)
    return _to_printer_response(db_printer)


async def delete_printer(db: AsyncSession, printer_id: int):
    stmt = select(PrinterConfig).where(PrinterConfig.id == printer_id)
    result = await db.execute(stmt)
    db_printer = result.scalar_one_or_none()
    if not db_printer:
        return False

    await db.delete(db_printer)
    await db.commit()
    return True
