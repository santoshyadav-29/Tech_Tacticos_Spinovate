from fastapi import APIRouter, Depends, HTTPException
from app.services.video_stream import VideoStreamService
from app.models.schemas import MonitoringResponse, SessionReport
from app.core.exceptions import MonitoringNotActiveException

router = APIRouter()

def get_video_service() -> VideoStreamService:
    return VideoStreamService()

@router.post("/start", response_model=MonitoringResponse)
async def start_monitoring(service: VideoStreamService = Depends(get_video_service)):
    """Start a monitoring session."""
    result = service.start_monitoring()
    return MonitoringResponse(**result)

@router.post("/stop", response_model=MonitoringResponse)
async def stop_monitoring(service: VideoStreamService = Depends(get_video_service)):
    """Stop the current monitoring session."""
    result = service.stop_monitoring()
    return MonitoringResponse(**result)

@router.get("/report", response_model=SessionReport)
async def get_report(service: VideoStreamService = Depends(get_video_service)):
    """Generate comprehensive monitoring report."""
    report = service.get_report()
    if "error" in report:
        raise HTTPException(status_code=400, detail=report["error"])
    return SessionReport(**report)

@router.get("/status")
async def get_monitoring_status(service: VideoStreamService = Depends(get_video_service)):
    """Get current monitoring status."""
    return {
        "monitoring_active": service.monitoring_service.is_active,
        "current_metrics": service.get_latest_data()
    }