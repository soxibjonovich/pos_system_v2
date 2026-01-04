from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from admin.api import users


app = FastAPI(
    title="Admin Micro Service", 
    version="1.0", 
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# app.include_router(products.product_router, prefix="/api")
app.include_router(users.users_router, prefix="/api")


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


def run_admin():
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8004, access_log=False, log_level="error")
	
