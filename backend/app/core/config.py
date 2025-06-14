from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "Computer Vision Monitoring API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Security
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Camera settings
    CAMERA_INDEX: int = 0
    VIDEO_FPS: int = 15
    
    # Distance measurement
    KNOWN_DISTANCE: float = 50.0  # cm
    REAL_WIDTH: float = 16.0      # cm (human head average)
    FOCAL_LENGTH: int = 550       # Adjusted focal length
    
    # Thresholds
    GOOD_DISTANCE_MIN: int = 40
    GOOD_DISTANCE_MAX: int = 60
    BRIGHTNESS_HIGH_THRESHOLD: int = 140
    PITCH_BAD_POSTURE_THRESHOLD: int = 15
    
    # Fatigue detection
    EAR_THRESH: float = 0.23
    MAR_THRESH: float = 0.75
    MAR_THRESH_NON_FRONTAL: float = 0.9
    YAW_ANGLE_THRESH: int = 20  # degrees
    EAR_CONSEC_FRAMES: int = 25
    YAWN_CONSEC_FRAMES: int = 15
    
    class Config:
        env_file = ".env"

settings = Settings()