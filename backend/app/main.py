from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import video, monitoring, health
from app.core.config import settings

def create_application() -> FastAPI:
    """Create and configure FastAPI application."""
    application = FastAPI(
        title=settings.APP_NAME,
        description="Computer Vision Monitoring API",
        version=settings.VERSION,
        debug=settings.DEBUG,
    )

    # Add CORS middleware
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins for development; restrict in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    application.include_router(health.router, prefix="/health", tags=["health"])
    application.include_router(video.router, prefix="/video", tags=["video"])
    application.include_router(monitoring.router, prefix="/monitoring", tags=["monitoring"])

    return application

app = create_application()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )