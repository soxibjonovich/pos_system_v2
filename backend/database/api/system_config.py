from fastapi import APIRouter,HTTPException,status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Depends
from database import get_db
from models import SystemConfig
from pydantic import BaseModel

router=APIRouter()

class SystemConfigUpdate(BaseModel):
    value:str

class SystemConfigResponse(BaseModel):
    key:str
    value:str

@router.get("/business_type",response_model=SystemConfigResponse)
async def get_business_type(db:AsyncSession=Depends(get_db)):
    result=await db.execute(select(SystemConfig).where(SystemConfig.key=="business_type"))
    config=result.scalars().first()
    if not config:
        config=SystemConfig(key="business_type",value="market")
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return SystemConfigResponse(key=config.key,value=config.value)

@router.put("/business_type",response_model=SystemConfigResponse)
async def update_business_type(data:SystemConfigUpdate,db:AsyncSession=Depends(get_db)):
    if data.value not in ["restaurant","market"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Invalid business type")
    result=await db.execute(select(SystemConfig).where(SystemConfig.key=="business_type"))
    config=result.scalars().first()
    if not config:
        config=SystemConfig(key="business_type",value=data.value)
        db.add(config)
    else:
        config.value=data.value
    await db.commit()
    await db.refresh(config)
    return SystemConfigResponse(key=config.key,value=config.value)