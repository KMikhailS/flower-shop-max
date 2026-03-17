import logging
import os
from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import users, goods, uploads, shop_addresses, health, promo_banners, categories, orders, dadata, cart

logger = logging.getLogger(__name__)
load_dotenv()

APP_URL = os.getenv("APP_URL")

# Create FastAPI app
app = FastAPI(title="FanFanTulpan API", version="1.0.0")

# Middleware for logging all requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"[REQUEST] {request.method} {request.url.path} - Client: {request.client.host if request.client else 'unknown'}")

    # Special logging for DELETE requests
    if request.method == "DELETE":
        logger.warning(f"[DELETE REQUEST DETECTED] Path: {request.url.path}, Headers: {dict(request.headers)}")

    response = await call_next(request)

    logger.info(f"[RESPONSE] {request.method} {request.url.path} - Status: {response.status_code}")

    return response

# Upload configuration
# Use /app/data/uploads to leverage the Docker volume mount
UPLOAD_DIR = Path("/app/data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Configure CORS
# Note: In production behind nginx proxy, requests come from same origin
# CORS is only needed for direct API access during testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Vite dev server
        "http://localhost:5173",  # Alternative Vite port
        APP_URL
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Mount static files directory for serving uploaded images
app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

# Include routers
app.include_router(users.router)
app.include_router(goods.router)
app.include_router(uploads.router)
app.include_router(shop_addresses.router)
app.include_router(health.router)
app.include_router(promo_banners.router)
app.include_router(categories.router)
app.include_router(orders.router)
app.include_router(dadata.router)
app.include_router(cart.router)
