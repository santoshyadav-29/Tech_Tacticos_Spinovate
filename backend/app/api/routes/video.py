from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.services.video_stream import VideoStreamService
from app.models.schemas import FaceMetrics, DrowsinessStatus

router = APIRouter()

# Dependency to get video service
def get_video_service() -> VideoStreamService:
    return VideoStreamService()

@router.get("/stream")
async def video_feed(service: VideoStreamService = Depends(get_video_service)):
    """Stream video feed with computer vision processing."""
    return StreamingResponse(
        service.generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/local")
async def run_local(service: VideoStreamService = Depends(get_video_service)):
    """Run video processing locally (for development)."""
    return StreamingResponse(
        service.generate_frames(local=True),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/metrics", response_model=FaceMetrics)
async def get_metrics(service: VideoStreamService = Depends(get_video_service)):
    """Get current face metrics."""
    return FaceMetrics(**service.get_latest_data())

@router.get("/drowsiness", response_model=DrowsinessStatus)
async def get_drowsiness_status(service: VideoStreamService = Depends(get_video_service)):
    """Get current drowsiness detection status."""
    return DrowsinessStatus(**service.get_drowsiness_status())