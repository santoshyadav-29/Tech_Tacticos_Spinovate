"""
Calibration API endpoints for personalized posture detection.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional
from app.services.calibration_service_db import calibration_service_db as calibration_service
from app.models.schemas import UserThresholds
from pydantic import BaseModel

router = APIRouter()


class CaptureRequest(BaseModel):
    """Request model for capturing calibration data."""
    pitch_angle: Optional[float] = None
    roll_angle: Optional[float] = None
    distance: Optional[float] = None
    ear: Optional[float] = None


@router.post("/start/{user_id}")
async def start_calibration(user_id: str):
    """
    Initialize calibration session for a user.
    
    Returns instructions and list of scenarios to complete.
    """
    return {
        "user_id": user_id,
        "scenarios": [
            {
                "id": "good_posture",
                "name": "Good Posture",
                "description": "Sit upright with your back straight, shoulders relaxed, and head aligned with your spine. Look directly at the camera.",
                "duration": 3
            },
            {
                "id": "neutral",
                "name": "Neutral Posture",
                "description": "Sit in your most comfortable, natural position. This will be your baseline.",
                "duration": 3
            },
            {
                "id": "looking_down",
                "name": "Looking Down",
                "description": "Tilt your head down as if looking at a keyboard. This helps set the warning threshold.",
                "duration": 3
            }
        ],
        "instructions": "Complete each scenario by maintaining the posture for the specified duration. The system will automatically capture your posture data.",
        "status": "ready"
    }


@router.post("/capture/{user_id}/{scenario}")
async def capture_calibration(
    user_id: str, 
    scenario: str, 
    data: CaptureRequest
):
    """
    Capture calibration data for a specific scenario.
    
    Valid scenarios:
    - good_posture: Ideal sitting posture
    - neutral: User's natural posture
    - looking_down: Maximum acceptable head tilt
    """
    valid_scenarios = ["good_posture", "neutral", "looking_down"]
    
    if scenario not in valid_scenarios:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario. Must be one of: {', '.join(valid_scenarios)}"
        )
    
    print(f"CALIBRATION CAPTURE: scenario={scenario}, pitch_angle={data.pitch_angle}, roll_angle={data.roll_angle}, distance={data.distance}, ear={data.ear}")
    
    result = calibration_service.store_calibration_frame(
        user_id=user_id,
        scenario=scenario,
        pitch_angle=data.pitch_angle,
        roll_angle=data.roll_angle,
        distance=data.distance,
        ear=data.ear
    )
    
    # Get current status
    status = calibration_service.get_calibration_status(user_id)
    
    return {
        **result,
        "calibration_status": status
    }


@router.post("/complete/{user_id}")
async def complete_calibration(user_id: str):
    """
    Finalize calibration and calculate personalized thresholds.
    
    This should be called after all required scenarios are captured.
    """
    # Check if user has completed required scenarios
    status = calibration_service.get_calibration_status(user_id)
    
    if "good_posture" not in status["scenarios_completed"]:
        raise HTTPException(
            status_code=400,
            detail="Minimum requirement: 'good_posture' scenario must be completed"
        )
    
    # Calculate personalized thresholds
    thresholds = calibration_service.calculate_personalized_thresholds(user_id)
    
    return {
        "status": "success",
        "message": "Calibration completed successfully",
        "calibrated": thresholds.calibrated,
        "thresholds": {
            "pitch_threshold": thresholds.pitch_threshold,
            "distance_min": thresholds.distance_min,
            "distance_max": thresholds.distance_max,
            "ear_threshold": thresholds.ear_threshold,
            "mar_threshold": thresholds.mar_threshold
        }
    }


@router.get("/thresholds/{user_id}", response_model=UserThresholds)
async def get_thresholds(user_id: str):
    """
    Get user's calibrated thresholds.
    
    Returns default thresholds if user hasn't calibrated yet.
    """
    return calibration_service.get_user_thresholds(user_id)


@router.get("/status/{user_id}")
async def get_calibration_status(user_id: str):
    """
    Get current calibration status and progress for a user.
    """
    return calibration_service.get_calibration_status(user_id)


@router.delete("/reset/{user_id}")
async def reset_calibration(user_id: str):
    """
    Reset calibration data for a user.
    
    User will need to recalibrate from scratch.
    """
    return calibration_service.reset_calibration(user_id)
