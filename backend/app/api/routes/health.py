from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Computer Vision Monitoring API"}

@router.get("/ping")
async def ping():
    """Simple ping endpoint."""
    return {"message": "pong"}