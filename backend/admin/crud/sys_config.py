import httpx
from config import settings


class ServiceClient:
    def __init__(self):
        self.db_client = httpx.AsyncClient(
            base_url=settings.DATABASE_SERVICE_URL, timeout=10.0
        )
        self.auth_client = httpx.AsyncClient(
            base_url=settings.AUTH_SERVICE_URL, timeout=10.0
        )

    async def close(self):
        await self.db_client.aclose()
        await self.auth_client.aclose()


service_client = ServiceClient()
# @handle_service_errors
async def get_system_config(key:str)->dict|None:
    response=await service_client.db_client.get(f"/system-config/{key}")
    if response.status_code==404:
        return None
    if response.status_code==200:
        return response.json()
    return None

# @handle_service_errors
async def update_system_config(key:str,value:str)->bool:
    response=await service_client.db_client.put(f"/system-config/{key}",json={"value":value})
    return response.status_code==200