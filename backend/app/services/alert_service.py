import time
from threading import Lock
from typing import Dict, Any, List, Optional

class AlertService:
    def __init__(
        self,
        posture_n_seconds: int = 5,
        multi_posture_n_seconds: int = 5,
        distance_n_seconds: int = 5,
        yawn_n_seconds: int = 5,
        drowsy_n_seconds: int = 5,
        blink_n_seconds: int = 10
    ):
        self.posture_n_seconds = posture_n_seconds
        self.multi_posture_n_seconds = multi_posture_n_seconds
        self.distance_n_seconds = distance_n_seconds
        self.yawn_n_seconds = yawn_n_seconds
        self.drowsy_n_seconds = drowsy_n_seconds
        self.blink_n_seconds = blink_n_seconds
        self.lock = Lock()
        self.reset_alerts()
        self.last_update = time.time()

    def reset_alerts(self):
        self.alerts = {
            "posture_angle_unhealthy": False,
            "multiple_posture_angles_unhealthy": False,
            "distance_too_close": False,
            "excessive_yawning": False,
            "yawn_and_drowsy": False,
            "insufficient_blinks": False
        }
        self.alert_timestamps = {k: None for k in self.alerts}
        self.timers = {
            "posture": {},
            "distance": None,
            "yawn": [],
            "drowsy": [],
            "blink": []
        }
        self.last_blink_time = time.time()

    def _set_alert(self, alert_name: str):
        self.alerts[alert_name] = True
        self.alert_timestamps[alert_name] = time.time()

    def _auto_reset_alerts(self):
        now = time.time()
        for k, v in self.alerts.items():
            if v and self.alert_timestamps[k] is not None:
                if now - self.alert_timestamps[k] >= 3:
                    self.alerts[k] = False
                    self.alert_timestamps[k] = None

    def update(
        self,
        posture_angles: Optional[dict],
        distance: Optional[float],
        yawn: bool,
        drowsy: bool,
        blink: bool,
        posture_thresholds: dict,
        distance_threshold: float,
        yawn_threshold: int,
        blink_threshold: int
    ):
        now = time.time()
        with self.lock:
            # Posture angle alerts
            unhealthy_angles = 0
            if posture_angles:
                for k, v in posture_angles.items():
                    if k in posture_thresholds and not posture_thresholds[k][0] <= v <= posture_thresholds[k][1]:
                        unhealthy_angles += 1
                        if k not in self.timers["posture"]:
                            self.timers["posture"][k] = now
                        elif now - self.timers["posture"][k] >= self.posture_n_seconds:
                            self._set_alert("posture_angle_unhealthy")
                    else:
                        self.timers["posture"].pop(k, None)
                if unhealthy_angles >= 3:
                    if "multi" not in self.timers["posture"]:
                        self.timers["posture"]["multi"] = now
                    elif now - self.timers["posture"]["multi"] >= self.multi_posture_n_seconds:
                        self._set_alert("multiple_posture_angles_unhealthy")
                else:
                    self.timers["posture"].pop("multi", None)
            # Distance alert
            if distance is not None and distance < distance_threshold:
                if self.timers["distance"] is None:
                    self.timers["distance"] = now
                elif now - self.timers["distance"] >= self.distance_n_seconds:
                    self._set_alert("distance_too_close")
            else:
                self.timers["distance"] = None
            # Yawn alert
            if yawn:
                self.timers["yawn"].append(now)
            self.timers["yawn"] = [t for t in self.timers["yawn"] if now - t <= self.yawn_n_seconds]
            if len(self.timers["yawn"]) >= yawn_threshold:
                self._set_alert("excessive_yawning")
            # Yawn + drowsy alert
            if yawn and drowsy:
                self.timers["drowsy"].append(now)
            self.timers["drowsy"] = [t for t in self.timers["drowsy"] if now - t <= self.drowsy_n_seconds]
            if len(self.timers["drowsy"]) >= yawn_threshold:
                self._set_alert("yawn_and_drowsy")
            # Blink alert
            if blink:
                self.last_blink_time = now
                self.timers["blink"].append(now)
            self.timers["blink"] = [t for t in self.timers["blink"] if now - t <= self.blink_n_seconds]
            if len(self.timers["blink"]) < blink_threshold and now - self.last_blink_time >= self.blink_n_seconds:
                self._set_alert("insufficient_blinks")
            # At the end of update, call auto-reset
            self._auto_reset_alerts()

    def get_alerts(self) -> Dict[str, bool]:
        with self.lock:
            self._auto_reset_alerts()
            return self.alerts.copy()

    def get_and_reset_alerts(self) -> Dict[str, bool]:
        with self.lock:
            self._auto_reset_alerts()
            result = self.alerts.copy()
            self.reset_alerts()
            return result
