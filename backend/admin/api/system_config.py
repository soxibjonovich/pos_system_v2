from fastapi import APIRouter,HTTPException,status
from schemas import sys_config as schemas
from crud import sys_config as crud
router=APIRouter(prefix="/system-config",tags=["System Config"])

@router.get("/business-type")
async def get_business_type():
    business_type=await crud.get_system_config("business_type")
    if not business_type:
        return {"key":"business_type","value":"market"}
    return business_type

@router.put("/business-type")
async def update_business_type(data:schemas.BusinessTypeUpdate):
    updated=await crud.update_system_config("business_type",data.business_type)
    if not updated:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,detail="Failed to update")
    return {"key":"business_type","value":data.business_type}