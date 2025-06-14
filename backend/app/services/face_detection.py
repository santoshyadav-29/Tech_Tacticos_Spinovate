import cv2
import mediapipe as mp
import numpy as np
from typing import Optional, Tuple
from app.core.config import settings
from app.utils.calculations import get_face_width_pixels

class FaceDetectionService:
    """Service for face detection and distance measurement."""
    
    def __init__(self):
        self.mp_face_detection = mp.solutions.face_detection.FaceDetection(
            model_selection=1, 
            min_detection_confidence=0.6
        )
    
    def detect_face_and_measure_distance(
        self, 
        rgb_image: np.ndarray, 
        frame: np.ndarray
    ) -> Tuple[Optional[float], Optional[float]]:
        """
        Detect face and calculate distance and brightness.
        
        Returns:
            Tuple of (distance, brightness) or (None, None) if no face detected
        """
        h, w = frame.shape[:2]
        results = self.mp_face_detection.process(rgb_image)
        
        if not results.detections:
            return None, None
            
        for detection in results.detections:
            bbox = detection.location_data.relative_bounding_box
            face_width_px = get_face_width_pixels(bbox, w)
            
            if face_width_px <= 0:
                continue
                
            # Calculate distance
            distance = (settings.FOCAL_LENGTH * settings.REAL_WIDTH) / face_width_px
            
            # Draw bounding box
            x1 = int(bbox.xmin * w)
            y1 = int(bbox.ymin * h)
            x2 = int((bbox.xmin + bbox.width) * w)
            y2 = int((bbox.ymin + bbox.height) * h)
            
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 1)
            cv2.putText(
                frame, f"Distance: {distance:.2f} cm", (x1, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1
            )
            
            # Calculate brightness
            face_roi = frame[y1:y2, x1:x2]
            brightness = None
            if face_roi.size > 0:
                gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
                brightness = np.mean(gray)
            
            return distance, brightness
            
        return None, None