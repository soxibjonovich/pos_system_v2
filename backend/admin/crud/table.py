import httpx
from fastapi import HTTPException, status
from schemas import table as schema
from schemas.table import Table, Tables
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

async def get_tables(active_only: bool = False) -> Tables:
    try:
        params = {"active_only": active_only} if active_only else {}
        response = await service_client.db_client.get("/tables", params=params)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch tables"
            )
        
        return Tables.model_validate_json(response.content)
    
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching tables: {str(e)}"
        )


async def get_available_tables() -> Tables:
    try:
        response = await service_client.db_client.get("/tables/available")
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch available tables"
            )
        
        return Tables.model_validate_json(response.content)
    
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching available tables: {str(e)}"
        )


async def get_table_by_id(table_id: int) -> Table | None:
    try:
        response = await service_client.db_client.get(f"/tables/{table_id}")
        
        if response.status_code == 404:
            return None
        
        if response.status_code != 200:
            return None
        
        return Table.model_validate_json(response.content)
    
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable"
        )
    except Exception:
        return None


async def get_table_by_number(number: str) -> Table | None:
    try:
        response = await service_client.db_client.get(f"/tables/number/{number}")
        
        if response.status_code == 404:
            return None
        
        if response.status_code != 200:
            return None
        
        return Table.model_validate_json(response.content)
    
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable"
        )
    except Exception:
        return None


async def is_table_exists(number: str) -> bool:
    try:
        response = await service_client.db_client.get(f"/tables/number/{number}")
        return response.status_code == 200
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable"
        )
    except Exception:
        return False


async def create_table(table_in: schema.TableCreate) -> Table | None:
    if await is_table_exists(table_in.number):
        return None
    
    try:
        response = await service_client.db_client.post(
            "/tables",
            json=table_in.model_dump()
        )
        
        if response.status_code == 201:
            return Table.model_validate_json(response.content)
        
        return None
    
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable"
        )
    except Exception:
        return None


async def update_table(table_id: int, table_in: schema.TableUpdate) -> Table | None:
    try:
        response = await service_client.db_client.put(
            f"/tables/{table_id}",
            json=table_in.model_dump(exclude_unset=True)
        )
        
        if response.status_code == 404:
            return None
        
        if response.status_code == 200:
            return Table.model_validate_json(response.content)
        
        return None
    
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable"
        )
    except Exception:
        return None


async def update_table_status(table_id: int, status_: str) -> Table | None:
    try:
        response = await service_client.db_client.patch(
            f"/tables/{table_id}/status",
            json={"status": status_}
        )
        
        if response.status_code == 404:
            return None
        
        if response.status_code == 200:
            return Table.model_validate_json(response.content)
        
        return None
    
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update table status: {str(e)}"
        )


async def delete_table(table_id: int) -> bool:
    try:
        response = await service_client.db_client.delete(f"/tables/{table_id}")
        return response.status_code == 204
    
    except httpx.ConnectError:
        raise HTTPException