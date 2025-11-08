"""
Calibration Service with Database Persistence
Stores user calibration data in SQLite database for persistence across server restarts.
"""

import sqlite3
import json
import numpy as np
from typing import Dict, Optional
from datetime import datetime
from pathlib import Path
from app.models.schemas import CalibrationData, UserThresholds
from app.core.config import settings


class CalibrationServiceDB:
    """Service for managing user calibration data with database persistence."""
    
    def __init__(self, db_path: str = "calibration_data.db"):
        """Initialize the service with SQLite database."""
        self.db_path = db_path
        self._init_database()
        # In-memory cache for faster access
        self._cache: Dict[str, UserThresholds] = {}
    
    def _init_database(self):
        """Create database tables if they don't exist."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                calibrated BOOLEAN DEFAULT FALSE,
                pitch_threshold REAL DEFAULT 15.0,
                roll_threshold REAL DEFAULT 10.0,
                distance_min REAL DEFAULT 40.0,
                distance_max REAL DEFAULT 60.0,
                ear_threshold REAL DEFAULT 0.23,
                mar_threshold REAL DEFAULT 0.75,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Calibration scenarios table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS calibration_scenarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                scenario TEXT NOT NULL,
                pitch_angle REAL,
                roll_angle REAL,
                distance REAL,
                ear REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id),
                UNIQUE(user_id, scenario)
            )
        """)
        
        conn.commit()
        conn.close()
    
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
        Store calibration data for a specific scenario in database.
        
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
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Ensure user exists
            cursor.execute("""
                INSERT OR IGNORE INTO users (user_id) VALUES (?)
            """, (user_id,))
            
            # Store calibration scenario (REPLACE if exists)
            cursor.execute("""
                INSERT OR REPLACE INTO calibration_scenarios 
                (user_id, scenario, pitch_angle, roll_angle, distance, ear, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, scenario, pitch_angle, roll_angle, distance, ear, datetime.now()))
            
            conn.commit()
            
            # Invalidate cache
            if user_id in self._cache:
                del self._cache[user_id]
            
            return {
                "status": "success",
                "scenario": scenario,
                "message": f"Calibration data stored for scenario: {scenario}"
            }
        except Exception as e:
            conn.rollback()
            return {
                "status": "error",
                "message": f"Failed to store calibration data: {str(e)}"
            }
        finally:
            conn.close()
    
    def _load_user_from_db(self, user_id: str) -> Optional[UserThresholds]:
        """Load user thresholds and calibration scenarios from database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Load user thresholds
            cursor.execute("""
                SELECT calibrated, pitch_threshold, roll_threshold, 
                       distance_min, distance_max, ear_threshold, mar_threshold
                FROM users WHERE user_id = ?
            """, (user_id,))
            
            user_row = cursor.fetchone()
            if not user_row:
                return None
            
            # Load calibration scenarios
            cursor.execute("""
                SELECT scenario, pitch_angle, roll_angle, distance, ear, timestamp
                FROM calibration_scenarios WHERE user_id = ?
            """, (user_id,))
            
            scenarios = {}
            for row in cursor.fetchall():
                scenario, pitch, roll, dist, ear, timestamp = row
                scenarios[scenario] = CalibrationData(
                    user_id=user_id,
                    scenario=scenario,
                    pitch_angle=pitch,
                    roll_angle=roll,
                    distance=dist,
                    ear=ear,
                    timestamp=datetime.fromisoformat(timestamp) if timestamp else datetime.now()
                )
            
            # Create UserThresholds object
            thresholds = UserThresholds(
                user_id=user_id,
                calibrated=bool(user_row[0]),
                pitch_threshold=user_row[1],
                roll_threshold=user_row[2],
                distance_min=user_row[3],
                distance_max=user_row[4],
                ear_threshold=user_row[5],
                mar_threshold=user_row[6],
                calibration_scenarios=scenarios
            )
            
            return thresholds
            
        finally:
            conn.close()
    
    def calculate_personalized_thresholds(self, user_id: str) -> UserThresholds:
        """
        Calculate personalized thresholds based on calibration scenarios.
        Saves results to database.
        """
        # Load from database
        user_data = self._load_user_from_db(user_id)
        if not user_data:
            return UserThresholds(user_id=user_id, calibrated=False)
        
        scenarios = user_data.calibration_scenarios
        
        # Need at least good_posture scenario for basic calibration
        if "good_posture" not in scenarios:
            return user_data
        
        good_posture = scenarios["good_posture"]
        
        print(f"CALCULATING THRESHOLDS: good_posture.pitch_angle={good_posture.pitch_angle}")
        
        # Calculate pitch threshold
        if good_posture.pitch_angle is not None:
            base_pitch = abs(good_posture.pitch_angle)
            user_data.pitch_threshold = max(base_pitch * 1.5, 10.0)
            
            if "looking_down" in scenarios and scenarios["looking_down"].pitch_angle:
                max_pitch = abs(scenarios["looking_down"].pitch_angle)
                user_data.pitch_threshold = min(user_data.pitch_threshold, max_pitch * 0.9)
        
        # Calculate roll threshold
        if good_posture.roll_angle is not None:
            base_roll = abs(good_posture.roll_angle)
            user_data.roll_threshold = max(base_roll + 10.0, 10.0)
        
        # Calculate distance thresholds
        if good_posture.distance is not None:
            base_distance = good_posture.distance
            tolerance = 5.0
            user_data.distance_min = max(base_distance - tolerance, 30.0)
            user_data.distance_max = min(base_distance + tolerance, 80.0)
        
        # Calculate EAR threshold
        if good_posture.ear is not None:
            user_data.ear_threshold = good_posture.ear * 0.85
            user_data.ear_threshold = max(0.18, min(0.30, user_data.ear_threshold))
        
        # Adjust with neutral posture if available
        if "neutral" in scenarios:
            neutral = scenarios["neutral"]
            if neutral.pitch_angle is not None and good_posture.pitch_angle is not None:
                avg_pitch = (abs(good_posture.pitch_angle) + abs(neutral.pitch_angle)) / 2
                user_data.pitch_threshold = avg_pitch * 1.3
        
        # Mark as calibrated
        user_data.calibrated = True
        
        # Save to database
        self._save_thresholds_to_db(user_data)
        
        # Update cache
        self._cache[user_id] = user_data
        
        return user_data
    
    def _save_thresholds_to_db(self, thresholds: UserThresholds):
        """Save calculated thresholds to database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                UPDATE users SET
                    calibrated = ?,
                    pitch_threshold = ?,
                    roll_threshold = ?,
                    distance_min = ?,
                    distance_max = ?,
                    ear_threshold = ?,
                    mar_threshold = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            """, (
                thresholds.calibrated,
                thresholds.pitch_threshold,
                thresholds.roll_threshold,
                thresholds.distance_min,
                thresholds.distance_max,
                thresholds.ear_threshold,
                thresholds.mar_threshold,
                thresholds.user_id
            ))
            
            conn.commit()
        finally:
            conn.close()
    
    def get_user_thresholds(self, user_id: str) -> UserThresholds:
        """
        Get thresholds for a user from cache or database.
        Returns defaults if not calibrated.
        """
        # Check cache first
        if user_id in self._cache:
            return self._cache[user_id]
        
        # Load from database
        thresholds = self._load_user_from_db(user_id)
        if thresholds:
            self._cache[user_id] = thresholds
            return thresholds
        
        # Return default thresholds
        return UserThresholds(user_id=user_id, calibrated=False)
    
    def reset_calibration(self, user_id: str) -> Dict:
        """Reset calibration data for a user in database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Delete calibration scenarios
            cursor.execute("DELETE FROM calibration_scenarios WHERE user_id = ?", (user_id,))
            
            # Reset user thresholds to defaults
            cursor.execute("""
                UPDATE users SET
                    calibrated = FALSE,
                    pitch_threshold = 15.0,
                    roll_threshold = 10.0,
                    distance_min = 40.0,
                    distance_max = 60.0,
                    ear_threshold = 0.23,
                    mar_threshold = 0.75,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            """, (user_id,))
            
            conn.commit()
            
            # Invalidate cache
            if user_id in self._cache:
                del self._cache[user_id]
            
            return {"status": "success", "message": "Calibration data reset"}
            
        except Exception as e:
            conn.rollback()
            return {"status": "error", "message": f"Failed to reset: {str(e)}"}
        finally:
            conn.close()
    
    def get_calibration_status(self, user_id: str) -> Dict:
        """Get calibration status and progress for a user from database."""
        required_scenarios = ["good_posture", "neutral", "looking_down"]
        
        thresholds = self._load_user_from_db(user_id)
        if not thresholds:
            return {
                "calibrated": False,
                "scenarios_completed": [],
                "scenarios_remaining": required_scenarios
            }
        
        completed = list(thresholds.calibration_scenarios.keys())
        remaining = [s for s in required_scenarios if s not in completed]
        
        return {
            "calibrated": thresholds.calibrated,
            "scenarios_completed": completed,
            "scenarios_remaining": remaining,
            "thresholds": {
                "pitch_threshold": thresholds.pitch_threshold,
                "distance_min": thresholds.distance_min,
                "distance_max": thresholds.distance_max,
                "ear_threshold": thresholds.ear_threshold
            } if thresholds.calibrated else None
        }


# Singleton instance with database persistence
calibration_service_db = CalibrationServiceDB()
