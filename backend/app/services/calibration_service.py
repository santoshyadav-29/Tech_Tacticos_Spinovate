"""
Calibration Service for personalized posture detection thresholds.
Allows users to calibrate the system with different posture scenarios.
"""

import numpy as np
from typing import Dict, Optional
from datetime import datetime
from app.models.schemas import CalibrationData, UserThresholds
from app.core.config import settings


class CalibrationService:
    """Service for managing user calibration data and personalized thresholds."""
    
    def __init__(self):
        # In-memory storage for user thresholds
        # In production, this should be replaced with database storage
        self.user_thresholds: Dict[str, UserThresholds] = {}
    
    def store_calibration_frame(
        self, 
        user_id: str, 
        scenario: str, 
        pitch_angle: Optional[float] = None,
        roll_angle: Optional[float] = None,
        distance: Optional[float] = None,
        ear: Optional[float] = None
    ) -> Dict:
        """
        Store calibration data for a specific scenario.
        
        Args:
            user_id: Unique identifier for the user
            scenario: Type of posture scenario (good_posture, neutral, looking_down)
            pitch_angle: Head pitch angle in degrees (up/down)
            roll_angle: Head roll angle in degrees (side-to-side tilt)
            distance: Distance from camera in cm
            ear: Eye Aspect Ratio
            
        Returns:
            Status dictionary
        """
        # Initialize user thresholds if not exists
        if user_id not in self.user_thresholds:
            self.user_thresholds[user_id] = UserThresholds(user_id=user_id)
        
        # Create calibration data
        calibration_data = CalibrationData(
            user_id=user_id,
            scenario=scenario,
            pitch_angle=pitch_angle,
            roll_angle=roll_angle,
            distance=distance,
            ear=ear,
            timestamp=datetime.now()
        )
        
        # Store in user's calibration scenarios
        self.user_thresholds[user_id].calibration_scenarios[scenario] = calibration_data
        
        return {
            "status": "success",
            "scenario": scenario,
            "message": f"Calibration data stored for scenario: {scenario}"
        }
    
    def calculate_personalized_thresholds(self, user_id: str) -> UserThresholds:
        """
        Calculate personalized thresholds based on calibration scenarios.
        
        Scenarios expected:
        - good_posture: User sitting with ideal posture
        - neutral: User's natural sitting posture
        - looking_down: User looking down (worst acceptable posture)
        
        Args:
            user_id: Unique identifier for the user
            
        Returns:
            UserThresholds with calculated personalized values
        """
        if user_id not in self.user_thresholds:
            return UserThresholds(user_id=user_id, calibrated=False)
        
        user_data = self.user_thresholds[user_id]
        scenarios = user_data.calibration_scenarios
        
        # Need at least good_posture scenario for basic calibration
        if "good_posture" not in scenarios:
            return user_data
        
        good_posture = scenarios["good_posture"]
        
        print(f"CALCULATING THRESHOLDS: good_posture.pitch_angle={good_posture.pitch_angle}, good_posture.roll_angle={good_posture.roll_angle}, good_posture.distance={good_posture.distance}")
        
        # Calculate pitch threshold
        if good_posture.pitch_angle is not None:
            # Set threshold as 1.5x the good posture angle
            # This gives some tolerance while maintaining good posture
            base_pitch = abs(good_posture.pitch_angle)
            user_data.pitch_threshold = max(base_pitch * 1.5, 10.0)  # Minimum 10 degrees
            
            print(f"PITCH THRESHOLD CALC: base_pitch={base_pitch}, threshold={user_data.pitch_threshold}")
            
            # If we have looking_down scenario, use it as upper bound
            if "looking_down" in scenarios and scenarios["looking_down"].pitch_angle:
                max_pitch = abs(scenarios["looking_down"].pitch_angle)
                user_data.pitch_threshold = min(user_data.pitch_threshold, max_pitch * 0.9)
                print(f"ADJUSTED WITH LOOKING_DOWN: max_pitch={max_pitch}, new_threshold={user_data.pitch_threshold}")
        else:
            print(f"WARNING: good_posture.pitch_angle is None, using default threshold")
        
        # Calculate roll threshold (side-to-side tilt)
        if good_posture.roll_angle is not None:
            # Good posture should have minimal roll (head upright)
            # Set threshold based on deviation from neutral
            base_roll = abs(good_posture.roll_angle)
            # Allow 10 degrees of tilt from good posture (more sensitive than before)
            user_data.roll_threshold = max(base_roll + 10.0, 10.0)
            
            print(f"ROLL THRESHOLD CALC: base_roll={base_roll}, threshold={user_data.roll_threshold}")
        else:
            print(f"WARNING: good_posture.roll_angle is None, using default threshold")
        
        # Calculate distance thresholds
        if good_posture.distance is not None:
            # Set distance range around the good posture distance
            base_distance = good_posture.distance
            tolerance = 5.0  # cm
            user_data.distance_min = max(base_distance - tolerance, 30.0)
            user_data.distance_max = min(base_distance + tolerance, 80.0)
        
        # Calculate EAR threshold for blink detection
        if good_posture.ear is not None:
            # Good posture EAR should be higher (eyes more open)
            # Set blink threshold slightly below good posture EAR
            user_data.ear_threshold = good_posture.ear * 0.85
            
            # Ensure it's within reasonable bounds
            user_data.ear_threshold = max(0.18, min(0.30, user_data.ear_threshold))
        
        # If we have neutral posture, adjust thresholds
        if "neutral" in scenarios:
            neutral = scenarios["neutral"]
            
            if neutral.pitch_angle is not None and good_posture.pitch_angle is not None:
                # Average between good and neutral for a balanced threshold
                avg_pitch = (abs(good_posture.pitch_angle) + abs(neutral.pitch_angle)) / 2
                user_data.pitch_threshold = avg_pitch * 1.3
        
        # Mark as calibrated
        user_data.calibrated = True
        
        return user_data
    
    def get_user_thresholds(self, user_id: str) -> UserThresholds:
        """
        Get thresholds for a user. Returns defaults if not calibrated.
        
        Args:
            user_id: Unique identifier for the user
            
        Returns:
            UserThresholds object
        """
        if user_id in self.user_thresholds:
            return self.user_thresholds[user_id]
        
        # Return default thresholds
        return UserThresholds(user_id=user_id, calibrated=False)
    
    def reset_calibration(self, user_id: str) -> Dict:
        """
        Reset calibration data for a user.
        
        Args:
            user_id: Unique identifier for the user
            
        Returns:
            Status dictionary
        """
        if user_id in self.user_thresholds:
            del self.user_thresholds[user_id]
            return {"status": "success", "message": "Calibration data reset"}
        
        return {"status": "info", "message": "No calibration data found"}
    
    def get_calibration_status(self, user_id: str) -> Dict:
        """
        Get calibration status and progress for a user.
        
        Args:
            user_id: Unique identifier for the user
            
        Returns:
            Dictionary with calibration status and completed scenarios
        """
        required_scenarios = ["good_posture", "neutral", "looking_down"]
        
        if user_id not in self.user_thresholds:
            return {
                "calibrated": False,
                "scenarios_completed": [],
                "scenarios_remaining": required_scenarios
            }
        
        user_data = self.user_thresholds[user_id]
        completed = list(user_data.calibration_scenarios.keys())
        remaining = [s for s in required_scenarios if s not in completed]
        
        return {
            "calibrated": user_data.calibrated,
            "scenarios_completed": completed,
            "scenarios_remaining": remaining,
            "thresholds": {
                "pitch_threshold": user_data.pitch_threshold,
                "distance_min": user_data.distance_min,
                "distance_max": user_data.distance_max,
                "ear_threshold": user_data.ear_threshold
            } if user_data.calibrated else None
        }


# Singleton instance
calibration_service = CalibrationService()
