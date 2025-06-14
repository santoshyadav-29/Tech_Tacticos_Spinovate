from fastapi import APIRouter, Depends
from app.api.routes.video import video_stream_service

router = APIRouter()

@router.get("/status")
async def get_alert_status():
    """Get current alert status and reset alerts after polling."""
    return video_stream_service.get_and_reset_alerts()

@router.get("/check")
async def check_alerts():
    """Check if any alerts are currently active."""
    return video_stream_service.alert_service.get_alerts()
