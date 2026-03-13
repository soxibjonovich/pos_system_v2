from crud import sys_config as crud
from fastapi import APIRouter, HTTPException, status
from schemas import sys_config as schemas

router = APIRouter(prefix="/system-config", tags=["System Config"])


@router.get("/business-type")
async def get_business_type():
    business_type = await crud.get_system_config("business_type")
    if not business_type:
        return {"key": "business_type", "value": "market"}
    return business_type


@router.put("/business-type")
async def update_business_type(data: schemas.BusinessTypeUpdate):
    updated = await crud.update_system_config("business_type", data.business_type)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update"
        )
    return {"key": "business_type", "value": data.business_type}


@router.get("/service-fee")
async def get_service_fee():
    service_fee = await crud.get_system_config("service_fee_percent")
    if not service_fee:
        return {"key": "service_fee_percent", "value": "0"}
    return service_fee


@router.put("/service-fee")
async def update_service_fee(data: schemas.ServiceFeeUpdate):
    value = str(round(float(data.service_fee_percent), 2))
    updated = await crud.update_system_config("service_fee_percent", value)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update"
        )
    return {"key": "service_fee_percent", "value": value}


@router.get("/restaurant-profile")
async def get_restaurant_profile():
    business_name = await crud.get_system_config("business_name")
    business_phone = await crud.get_system_config("business_phone")
    return {
        "business_name": (business_name or {}).get("value", "POS System"),
        "business_phone": (business_phone or {}).get("value", "+998"),
    }


@router.put("/restaurant-profile")
async def update_restaurant_profile(data: schemas.RestaurantProfileUpdate):
    name = data.business_name.strip()
    phone = data.business_phone.strip()
    updated_name = await crud.update_system_config("business_name", name)
    updated_phone = await crud.update_system_config("business_phone", phone)
    if not updated_name or not updated_phone:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update"
        )
    return {
        "business_name": name,
        "business_phone": phone,
    }
