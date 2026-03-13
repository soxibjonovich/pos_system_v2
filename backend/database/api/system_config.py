from database import get_db
from fastapi import APIRouter, Depends, HTTPException, status
from models import SystemConfig
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


class SystemConfigUpdate(BaseModel):
    value: str


class SystemConfigResponse(BaseModel):
    key: str
    value: str


class ServiceFeeUpdate(BaseModel):
    value: float = Field(..., ge=0, le=100)


class RestaurantProfileUpdate(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=120)
    business_phone: str = Field(..., min_length=1, max_length=40)


async def _get_or_create_config(db: AsyncSession, key: str, default_value: str):
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    config = result.scalars().first()
    if not config:
        config = SystemConfig(key=key, value=default_value)
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config


@router.get("/business_type", response_model=SystemConfigResponse)
async def get_business_type(db: AsyncSession = Depends(get_db)):
    config = await _get_or_create_config(db, "business_type", "market")
    return SystemConfigResponse(key=config.key, value=config.value)


@router.put("/business_type", response_model=SystemConfigResponse)
async def update_business_type(
    data: SystemConfigUpdate, db: AsyncSession = Depends(get_db)
):
    if data.value not in ["restaurant", "market"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid business type"
        )
    config = await _get_or_create_config(db, "business_type", data.value)
    config.value = data.value
    await db.commit()
    await db.refresh(config)
    return SystemConfigResponse(key=config.key, value=config.value)


@router.get("/service_fee_percent", response_model=SystemConfigResponse)
async def get_service_fee_percent(db: AsyncSession = Depends(get_db)):
    config = await _get_or_create_config(db, "service_fee_percent", "0")
    return SystemConfigResponse(key=config.key, value=config.value)


@router.put("/service_fee_percent", response_model=SystemConfigResponse)
async def update_service_fee_percent(
    data: ServiceFeeUpdate, db: AsyncSession = Depends(get_db)
):
    config = await _get_or_create_config(db, "service_fee_percent", "0")
    config.value = str(round(float(data.value), 2))
    await db.commit()
    await db.refresh(config)
    return SystemConfigResponse(key=config.key, value=config.value)


@router.get("/business_name", response_model=SystemConfigResponse)
async def get_business_name(db: AsyncSession = Depends(get_db)):
    config = await _get_or_create_config(db, "business_name", "POS System")
    return SystemConfigResponse(key=config.key, value=config.value)


@router.put("/business_name", response_model=SystemConfigResponse)
async def update_business_name(
    data: SystemConfigUpdate, db: AsyncSession = Depends(get_db)
):
    config = await _get_or_create_config(db, "business_name", data.value.strip())
    config.value = data.value.strip()
    await db.commit()
    await db.refresh(config)
    return SystemConfigResponse(key=config.key, value=config.value)


@router.get("/business_phone", response_model=SystemConfigResponse)
async def get_business_phone(db: AsyncSession = Depends(get_db)):
    config = await _get_or_create_config(db, "business_phone", "+998")
    return SystemConfigResponse(key=config.key, value=config.value)


@router.put("/business_phone", response_model=SystemConfigResponse)
async def update_business_phone(
    data: SystemConfigUpdate, db: AsyncSession = Depends(get_db)
):
    config = await _get_or_create_config(db, "business_phone", data.value.strip())
    config.value = data.value.strip()
    await db.commit()
    await db.refresh(config)
    return SystemConfigResponse(key=config.key, value=config.value)
