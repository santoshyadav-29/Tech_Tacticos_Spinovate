import time
import cv2
import threading
from typing import Generator, Dict, Any, Optional
from app.core.config import settings
from app.core.exceptions import CameraNotAvailableException
from app.services.face_detection import FaceDetectionService
from app.services.drowsiness_detection import DrowsinessDetectionService
from app.services.monitoring import MonitoringService
from app.services.alert_service import AlertService
from app.services.calibration_service import calibration_service

class VideoStreamService:
    """Service for video streaming and processing."""
    
    def __init__(self):
        self.cap = None
        self.face_detection_service = FaceDetectionService()
        self.drowsiness_service = DrowsinessDetectionService()
        self.monitoring_service = MonitoringService()
        self.alert_service = AlertService()  # You can adjust n_seconds as needed
        self.latest_data: Dict[str, Any] = {
            "distance": None, "pitch": None, "brightness": None,
            "ear": None, "mar": None, "yaw": None, "posture_angles": None
        }
        self.lock = threading.Lock()
        self.camera_initialized = False  # For lazy initialization
        self.current_user_id: Optional[str] = None  # Track current user for thresholds
    
    def _initialize_camera(self):
        """Initialize camera capture."""
        if self.camera_initialized:
            return
        self.cap = cv2.VideoCapture(settings.CAMERA_INDEX)
        # self.cap = cv2.VideoCapture("http://172.16.3.222:4747/video")
        if not self.cap.isOpened():
            raise CameraNotAvailableException()
        self.camera_initialized = True
    
    def close_camera(self):
        """Close the camera resource."""
        if self.cap is not None:
            self.cap.release()
            self.cap = None
            self.camera_initialized = False
    
    def set_user(self, user_id: str):
        """Set the current user for personalized thresholds."""
        self.current_user_id = user_id
        print(f"Video stream service set to user: {user_id}")
    
    def generate_frames(self, local: bool = False, user_id: Optional[str] = None) -> Generator[bytes, None, None]:
        """Generate video frames with computer vision processing."""
        if user_id:
            self.set_user(user_id)
        
        self._initialize_camera()
        frame_interval = 1.0 / settings.VIDEO_FPS
        
        while True:
            if self.cap is None or not self.cap.isOpened():
                # print("Camera is not initialized or already closed.")
                break
            start_time = time.time()
            ret, frame = self.cap.read()
            
            if not ret:
                break
            
            # Process frame
            processed_data = self._process_frame(frame)
            
            # Update monitoring if active
            if self.monitoring_service.is_active:
                self.monitoring_service.update_metrics(
                    processed_data["distance"],
                    processed_data["pitch"], 
                    processed_data["brightness"],
                    processed_data["drowsiness_detected"],
                    processed_data["yawn_detected"],
                    processed_data["blink_detected"],
                )
            
            # Handle local display or streaming
            if local:
                cv2.imshow("Camera Feed", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
            else:
                _, buffer = cv2.imencode(".jpg", frame)
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + 
                       buffer.tobytes() + b'\r\n')
            
            # FPS limiting
            elapsed = time.time() - start_time
            sleep_time = frame_interval - elapsed
            if sleep_time > 0 and not local:
                time.sleep(sleep_time)
    
    def _process_frame(self, frame) -> Dict[str, Any]:
        """Process a single frame with all computer vision algorithms."""
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Initialize return data
        data = {
            "distance": None, "pitch": None, "brightness": None,
            "ear": None, "mar": None, "yaw": None,
            "drowsiness_detected": False, "yawn_detected": False, "blink_detected": False
        }
        
        # Face detection and distance measurement
        distance, brightness = self.face_detection_service.detect_face_and_measure_distance(rgb, frame)
        data["distance"] = distance
        data["brightness"] = brightness
        
        # Drowsiness detection and posture analysis
        pf_result = self.drowsiness_service.process_frame(rgb, frame)
        # Handle both 6, 7, or 8 return values for backward compatibility
        if len(pf_result) == 8:
            pitch, ear, mar, yaw, drowsiness, yawn, blink_detected, posture_angles = pf_result
        elif len(pf_result) == 7:
            pitch, ear, mar, yaw, drowsiness, yawn, blink_detected = pf_result
            posture_angles = None
        elif len(pf_result) == 6:
            pitch, ear, mar, yaw, drowsiness, yawn = pf_result
            blink_detected = False
            posture_angles = None
        else:
            # Unexpected output, set all to None/False
            pitch = ear = mar = yaw = drowsiness = yawn = None
            blink_detected = False
            posture_angles = None
        data.update({
            "pitch": pitch, "ear": ear, "mar": mar, "yaw": yaw,
            "drowsiness_detected": drowsiness, "yawn_detected": yawn, "blink_detected": blink_detected
        })
        
        # Update shared data
        with self.lock:
            self.latest_data.update({
                "distance": round(distance, 2) if distance else None,
                "pitch": round(pitch, 2) if pitch else None,
                "brightness": round(brightness, 2) if brightness else None,
                "ear": round(ear, 2) if ear else None,
                "mar": round(mar, 2) if mar else None,
                "yaw": round(yaw, 2) if yaw else None,
                "posture_angles": posture_angles if posture_angles else None
            })
        
        # Get calibrated thresholds for current user
        if self.current_user_id:
            user_thresholds = calibration_service.get_user_thresholds(self.current_user_id)
            distance_threshold = user_thresholds.distance_min
            print(f"Using calibrated thresholds for {self.current_user_id}: distance_min={user_thresholds.distance_min}, distance_max={user_thresholds.distance_max}, pitch={user_thresholds.pitch_threshold}")
        else:
            distance_threshold = settings.GOOD_DISTANCE_MIN
            print(f"WARNING: No user_id set, using default thresholds")
        
        # Alert logic - use hardcoded posture angle thresholds for now
        # TODO: These should also be calibrated per user
        posture_thresholds = {
            "Degree of Anteversion of Cervical Spine (y1)": (25, 34),
            "T1 Slope (y2)": (30, 50),
            "Upper Thoracic Kyphosis Angle (y3)": (140, 158),
            "Middle and Lower Thoracic Kyphosis Angle (y4)": (154, 155.5),
            "T8-T12-L3 Angle (new)": (175, 180.3),
            "Lumbar Lordosis Angle (y5)": (170, 174),
        }
        self.alert_service.update(
            posture_angles=posture_angles,
            distance=distance,
            yawn=bool(yawn),
            drowsy=bool(drowsiness),
            blink=bool(blink_detected),
            posture_thresholds=posture_thresholds,
            distance_threshold=distance_threshold,  # Use calibrated threshold
            yawn_threshold=10,  # Example: 3 yawns in n seconds
            blink_threshold=1  # Example: at least 3 blinks in n seconds
        )
        
        return data
    
    def get_latest_data(self) -> Dict[str, Any]:
        """Get latest processed data."""
        with self.lock:
            return self.latest_data.copy()
    
    def get_drowsiness_status(self) -> Dict[str, Any]:
        """Get detailed drowsiness status."""
        eye_counter, yawn_counter = self.drowsiness_service.get_counters()
        
        with self.lock:
            return {
                "ear": self.latest_data["ear"],
                "mar": self.latest_data["mar"],
                "yaw": self.latest_data["yaw"],
                "eye_counter": eye_counter,
                "yawn_counter": yawn_counter,
                "drowsiness_alert": eye_counter >= settings.EAR_CONSEC_FRAMES,
                "yawn_alert": yawn_counter >= settings.YAWN_CONSEC_FRAMES
            }
    
    def start_monitoring(self) -> Dict[str, str]:
        """Start monitoring session."""
        # Reset drowsiness counters
        self.drowsiness_service.reset_counters()
        return self.monitoring_service.start_monitoring()
    
    def stop_monitoring(self) -> Dict[str, str]:
        """Stop monitoring session."""
        return self.monitoring_service.stop_monitoring()
    
    def get_report(self) -> Dict[str, Any]:
        """Generate monitoring report."""
        return self.monitoring_service.generate_report()
    
    def cleanup(self):
        """Cleanup resources."""
        self.close_camera()
        cv2.destroyAllWindows()

    def get_and_reset_alerts(self) -> Dict[str, bool]:
        return self.alert_service.get_and_reset_alerts()