from typing import Optional
from pydantic import BaseModel

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