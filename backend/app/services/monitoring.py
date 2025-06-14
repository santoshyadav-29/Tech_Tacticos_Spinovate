import time
from typing import Dict, Any, Optional
from threading import Lock
from app.core.config import settings
from datetime import datetime

def format_timestamp(ts: Optional[float]) -> Optional[str]:
    return datetime.fromtimestamp(ts).isoformat() if ts else None

class MonitoringService:
    """Service for session monitoring and analytics."""

    def __init__(self):
        self.monitoring_active = False
        self.monitoring_data: Dict[str, Any] = {}
        self.lock = Lock()
        self._reset_session_data()

    def start_monitoring(self) -> Dict[str, str]:
        with self.lock:
            if self.monitoring_active:
                return {"message": "Monitoring already started", "status": "already_started"}
            self.monitoring_active = True
            self._reset_session_data()
            self.monitoring_data["start_time"] = time.time()
            return {"message": "Monitoring started", "status": "started"}

    def stop_monitoring(self) -> Dict[str, str]:
        with self.lock:
            if not self.monitoring_active:
                return {"message": "Monitoring already stopped", "status": "already_stopped"}
            self.monitoring_active = False
            self.monitoring_data["stop_time"] = time.time()
            return {"message": "Monitoring stopped", "status": "stopped"}

    def update_metrics(self, distance: Optional[float], pitch: Optional[float], 
                       brightness: Optional[float], drowsiness_detected: bool, 
                       yawn_detected: bool):
        if not self.monitoring_active:
            return

        with self.lock:
            current_time = time.time()
            elapsed = 1 / settings.VIDEO_FPS

            self.monitoring_data["total_frames"] += 1
            self.monitoring_data["total_duration"] = current_time - self.monitoring_data["start_time"]

            face_detected = distance is not None
            if face_detected:
                self.monitoring_data["frames_with_face"] += 1
                self._update_distance_metrics(distance, elapsed)
                self._update_brightness_metrics(brightness, elapsed)
                self._update_posture_metrics(pitch, elapsed)
                self._update_drowsiness_metrics(drowsiness_detected, yawn_detected, elapsed)
            else:
                self.monitoring_data["face_missing_time"] += elapsed

    def _update_distance_metrics(self, distance: float, elapsed: float):
        self.monitoring_data["distance_sum"] += distance
        if settings.GOOD_DISTANCE_MIN <= distance <= settings.GOOD_DISTANCE_MAX:
            self.monitoring_data["good_distance_time"] += elapsed

    def _update_brightness_metrics(self, brightness: Optional[float], elapsed: float):
        if brightness is not None:
            self.monitoring_data["brightness_sum"] += brightness
            self.monitoring_data["max_brightness"] = max(
                brightness, self.monitoring_data["max_brightness"]
            )

            if brightness > settings.BRIGHTNESS_HIGH_THRESHOLD:
                self.monitoring_data["high_brightness_time"] += elapsed
                if not self.monitoring_data["_brightness_state"]:
                    self.monitoring_data["high_brightness_events"] += 1
                    self.monitoring_data["_brightness_state"] = True
            else:
                self.monitoring_data["_brightness_state"] = False

    def _update_posture_metrics(self, pitch: Optional[float], elapsed: float):
        if pitch is not None:
            self.monitoring_data["pitch_sum"] += abs(pitch)

            if abs(pitch) > settings.PITCH_BAD_POSTURE_THRESHOLD:
                self.monitoring_data["bad_posture_time"] += elapsed
                self.monitoring_data["current_good_posture_streak"] = 0
                if self.monitoring_data["last_posture_good"]:
                    self.monitoring_data["bad_posture_events"] += 1
                self.monitoring_data["last_posture_good"] = False
            else:
                self.monitoring_data["current_good_posture_streak"] += elapsed
                self.monitoring_data["max_good_posture_streak"] = max(
                    self.monitoring_data["max_good_posture_streak"],
                    self.monitoring_data["current_good_posture_streak"]
                )
                self.monitoring_data["last_posture_good"] = True

    def _update_drowsiness_metrics(self, drowsiness_detected: bool, yawn_detected: bool, elapsed: float):
        if drowsiness_detected:
            self.monitoring_data["drowsiness_time"] += elapsed
            if not self.monitoring_data["_drowsiness_state"]:
                self.monitoring_data["drowsiness_events"] += 1
                self.monitoring_data["_drowsiness_state"] = True
        else:
            self.monitoring_data["_drowsiness_state"] = False

        if yawn_detected:
            if not self.monitoring_data["_yawn_state"]:
                self.monitoring_data["yawns_detected"] += 1
                self.monitoring_data["_yawn_state"] = True
        else:
            self.monitoring_data["_yawn_state"] = False

    def generate_report(self) -> Dict[str, Any]:
        if not self.monitoring_data:
            return {"error": "No session data"}

        with self.lock:
            duration = self.monitoring_data["total_duration"]
            total_seen_time = duration - self.monitoring_data["face_missing_time"]

            avg_distance = (self.monitoring_data["distance_sum"] /
                            self.monitoring_data["frames_with_face"]
                            if self.monitoring_data["frames_with_face"] else 0)
            avg_pitch = (self.monitoring_data["pitch_sum"] /
                         self.monitoring_data["frames_with_face"]
                         if self.monitoring_data["frames_with_face"] else 0)
            avg_brightness = (self.monitoring_data["brightness_sum"] /
                              self.monitoring_data["frames_with_face"]
                              if self.monitoring_data["frames_with_face"] else 0)

            yawns_per_hour = (
                self.monitoring_data["yawns_detected"] / duration * 3600 
                if duration else 0
            )
            drowsiness_events_per_hour = (
                self.monitoring_data["drowsiness_events"] / duration * 3600 
                if duration else 0
            )
            bad_posture_events_per_hour = (
                self.monitoring_data["bad_posture_events"] / duration * 3600 
                if duration else 0
            )

            score = self._calculate_session_score(duration)

            return {
                "start_time": format_timestamp(self.monitoring_data["start_time"]),
                "stop_time": format_timestamp(self.monitoring_data.get("stop_time")),
                "session_duration_min": round(duration / 60, 2),
                "time_face_visible_min": round(total_seen_time / 60, 2),
                "avg_distance_cm": round(avg_distance, 2),
                "time_good_distance_min": round(self.monitoring_data["good_distance_time"] / 60, 2),
                "avg_pitch_deg": round(avg_pitch, 2),
                "bad_posture_time_min": round(self.monitoring_data["bad_posture_time"] / 60, 2),
                "bad_posture_events": self.monitoring_data["bad_posture_events"],
                "bad_posture_events_per_hour": round(bad_posture_events_per_hour, 2),
                "max_good_posture_streak_sec": round(self.monitoring_data["max_good_posture_streak"], 2),
                "avg_brightness": round(avg_brightness, 2),
                "max_brightness": round(self.monitoring_data["max_brightness"], 2),
                "high_brightness_time_min": round(self.monitoring_data["high_brightness_time"] / 60, 2),
                "high_brightness_events": self.monitoring_data["high_brightness_events"],
                "face_missing_time_min": round(self.monitoring_data["face_missing_time"] / 60, 2),
                "drowsiness_time_min": round(self.monitoring_data["drowsiness_time"] / 60, 2),
                "drowsiness_events": self.monitoring_data["drowsiness_events"],
                "drowsiness_events_per_hour": round(drowsiness_events_per_hour, 2),
                "yawns_detected": self.monitoring_data["yawns_detected"],
                "yawns_per_hour": round(yawns_per_hour, 2),
                "session_score": score
            }

    def _calculate_session_score(self, duration: float) -> float:
        if duration <= 0:
            return 0.0

        score = 100.0
        score -= (self.monitoring_data["bad_posture_time"] / duration) * 30
        score -= (self.monitoring_data["high_brightness_time"] / duration) * 20
        score -= (self.monitoring_data["face_missing_time"] / duration) * 10
        score -= self.monitoring_data["yawns_detected"] * 5
        score -= (self.monitoring_data["drowsiness_time"] / duration) * 25
        score -= self.monitoring_data["drowsiness_events"] * 3

        return round(max(0, min(100, score)), 2)

    def _reset_session_data(self):
        self.monitoring_data = {
            "start_time": None,
            "stop_time": None,
            "total_duration": 0,
            "total_frames": 0,
            "frames_with_face": 0,
            "distance_sum": 0,
            "good_distance_time": 0,
            "pitch_sum": 0,
            "bad_posture_time": 0,
            "bad_posture_events": 0,
            "max_good_posture_streak": 0,
            "current_good_posture_streak": 0,
            "last_posture_good": True,
            "brightness_sum": 0,
            "high_brightness_time": 0,
            "high_brightness_events": 0,
            "max_brightness": 0,
            "face_missing_time": 0,
            "drowsiness_time": 0,
            "drowsiness_events": 0,
            "yawns_detected": 0,
            "_brightness_state": False,
            "_drowsiness_state": False,
            "_yawn_state": False,
        }

    @property
    def is_active(self) -> bool:
        return self.monitoring_active
