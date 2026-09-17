import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load .env before initializing app components
load_dotenv()

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import auth, tracks, search, playlists, users
from providers.music_provider import get_music_provider

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("music_app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    logger.info("Initializing database tables...")
    await init_db()
    
    # Initialize and report active music provider
    provider = get_music_provider()
    logger.info(f"Active Music Provider: {provider.provider_name.upper()}")
    logger.info(f"Catalog Info: {provider.catalog_description}")
    
    yield
    logger.info("Shutting down music streaming application backend.")

app = FastAPI(
    title="AuraSound Music Streaming API",
    description=(
        "Production-grade Music Streaming Backend connecting to authorized legal music catalogs.\n\n"
        "### Key Principles:\n"
        "- **100% Legal Streaming**: Third-party streaming via official APIs (Audius, Jamendo, Spotify Web Playback).\n"
        "- **No Scraping / No DRM Bypass**: Strictly respects rights, licensing, and provider developer terms.\n"
        "- **Separation of Rights**: Metadata is cached and referenced by provider IDs without storing copyrighted audio."
    ),
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router)
app.include_router(tracks.router)
app.include_router(search.router)
app.include_router(playlists.router)
app.include_router(users.router)

@app.get("/health", tags=["System"])
async def health_check():
    """System health check and active catalog info."""
    provider = get_music_provider()
    return {
        "status": "healthy",
        "service": "AuraSound Music API",
        "provider": provider.provider_name,
        "catalog_summary": provider.catalog_description
    }

@app.get("/", tags=["System"])
async def root():
    return {
        "name": "AuraSound Music Streaming API",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/health"
    }

# Global exception handler for uncaught errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected internal server error occurred. Please try again later."}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
