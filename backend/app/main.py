"""
PrepVerse FastAPI Backend
Main application entry point with CORS, middleware, and routers
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware

from app.config import get_settings
from app.api.v1.router import api_router
from app.core.oauth import configure_oauth

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Configure OAuth on startup."""
    configure_oauth()
    yield

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for PrepVerse - CBSE exam preparation platform",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Add SessionMiddleware (required for Authlib OAuth state/CSRF)
# Uses a separate cookie name to avoid conflict with our session cookie
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SESSION_SECRET_KEY,
    session_cookie="_oauth_state",  # Different from SESSION_COOKIE_NAME
    max_age=600,  # 10 min - only needed during OAuth flow
    same_site="lax" if settings.DEBUG else "none",
    https_only=not settings.DEBUG,  # False for local dev
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint - API health check
    """
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "message": "Welcome to PrepVerse API"
    }


# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring
    """
    return {
        "status": "healthy",
        "version": settings.APP_VERSION
    }


# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Global exception handler for unhandled errors
    """
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred",
            "error": str(exc) if settings.DEBUG else "Internal server error"
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
