from typing import Optional, Dict
from pydantic import BaseModel
from datetime import datetime

class FaceMetrics(BaseModel):
    distance: Optional[float] = None
    pitch: Optional[float] = None
    brightness: Optional[float] = None
    ear: Optional[float] = None
    mar: Optional[float] = None
    yaw: Optional[float] = None
    posture_angles: Optional[dict] = None

class DrowsinessStatus(BaseModel):
    ear: Optional[float] = None
    mar: Optional[float] = None
    yaw: Optional[float] = None
    eye_counter: int
    yawn_counter: int
    drowsiness_alert: bool
    yawn_alert: bool

class MonitoringResponse(BaseModel):
    message: str
    status: str

class SessionReport(BaseModel):
    start_time: Optional[str]
    stop_time: Optional[str]
    session_duration_min: float
    time_face_visible_min: float
    avg_distance_cm: float
    time_good_distance_min: float
    avg_pitch_deg: float
    bad_posture_time_min: float
    bad_posture_events: int
    max_good_posture_streak_sec: float
    avg_brightness: float
    max_brightness: float
    high_brightness_time_min: float
    high_brightness_events: int
    face_missing_time_min: float
    drowsiness_time_min: float
    drowsiness_events: int
    yawns_detected: int
    yawns_per_hour: float
    session_score: float
    blinks: int
    long_blink_gaps: int
    longest_no_blink_sec: float
# Calibration Models
class CalibrationData(BaseModel):
    user_id: str
    scenario: str  # e.g., 'good_posture', 'neutral', 'looking_down'
    pitch_angle: Optional[float] = None
    distance: Optional[float] = None
    ear: Optional[float] = None
    timestamp: datetime = datetime.now()

class UserThresholds(BaseModel):
    user_id: str
    pitch_threshold: float = 15.0
    distance_min: float = 40.0
    distance_max: float = 60.0
    ear_threshold: float = 0.23
    mar_threshold: float = 0.75
    calibrated: bool = False
    calibration_scenarios: Dict[str, CalibrationData] = {}

# Minimal Dashboard Models
class PostureScore(BaseModel):
    overall: float  # 0-100
    neck: float
    distance: float
    status: str  # 'good', 'warning', 'poor'

class BlinkDetection(BaseModel):
    blink_detected: bool
    blink_count: int
    blink_rate: float  # blinks per minute
    ear_value: Optional[float] = None

class MinimalDashboardResponse(BaseModel):
    posture_score: PostureScore
    blink_detection: BlinkDetection
    alert: Optional[str] = None
    timestamp: float
    posture_angles: Optional[dict] = None
    # Raw metrics for calibration
    pitch_angle: Optional[float] = None
    distance: Optional[float] = None
    ear_value: Optional[float] = None

# WebSocket Frame Model
class VideoFrame(BaseModel):
    user_id: str
    frame: str  # base64 encoded image
    timestamp: float
