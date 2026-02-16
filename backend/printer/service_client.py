import httpx
from config import settings

class ServiceClient:
    """HTTP client for communicating with other microservices"""
    
    def __init__(self):
        self.order_client = httpx.AsyncClient(
            base_url=settings.ORDER_SERVICE_URL,
            timeout=30.0
        )
        self.database_client = httpx.AsyncClient(
            base_url=settings.DATABASE_SERVICE_URL,
            timeout=30.0
        )
    
    async def close(self):
        """Close all HTTP clients"""
        await self.order_client.aclose()
        await self.database_client.aclose()