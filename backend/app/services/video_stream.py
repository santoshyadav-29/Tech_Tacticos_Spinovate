import time
import cv2
import threading
from typing import Generator, Dict, Any, Optional
from app.core.config import settings
from app.core.exceptions import CameraNotAvailableException
from app.services.face_detection import FaceDetectionService
from app.services.drowsiness_detection import DrowsinessDetectionService
from app.services.monitoring import MonitoringService

class VideoStreamService:
    """Service for video streaming and processing."""
    
    def __init__(self):
        self.cap = None
        self.face_detection_service = FaceDetectionService()
        self.drowsiness_service = DrowsinessDetectionService()
        self.monitoring_service = MonitoringService()
        self.latest_data: Dict[str, Any] = {
            "distance": None, "pitch": None, "brightness": None,
            "ear": None, "mar": None, "yaw": None, "posture_angles": None
        }
        self.lock = threading.Lock()
        self.camera_initialized = False  # For lazy initialization
    
    def _initialize_camera(self):
        """Initialize camera capture."""
        if self.camera_initialized:
            return
        self.cap = cv2.VideoCapture(settings.CAMERA_INDEX)
        if not self.cap.isOpened():
            raise CameraNotAvailableException()
        self.camera_initialized = True
    
    def close_camera(self):
        """Close the camera resource."""
        if self.cap is not None:
            self.cap.release()
            self.cap = None
            self.camera_initialized = False
    
    def generate_frames(self, local: bool = False) -> Generator[bytes, None, None]:
        """Generate video frames with computer vision processing."""
        self._initialize_camera()
        frame_interval = 1.0 / settings.VIDEO_FPS
        
        while True:
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
                    processed_data["yawn_detected"]
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
            "drowsiness_detected": False, "yawn_detected": False
        }
        
        # Face detection and distance measurement
        distance, brightness = self.face_detection_service.detect_face_and_measure_distance(rgb, frame)
        data["distance"] = distance
        data["brightness"] = brightness
        
        # Drowsiness detection and posture analysis
        pitch, ear, mar, yaw, drowsiness, yawn, posture_angles = self.drowsiness_service.process_frame(rgb, frame)
        data.update({
            "pitch": pitch, "ear": ear, "mar": mar, "yaw": yaw,
            "drowsiness_detected": drowsiness, "yawn_detected": yawn
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