import cv2
import mediapipe as mp
import numpy as np
from typing import Optional, Tuple, List
from app.core.config import settings
from app.utils.calculations import (
    calculate_aspect_ratio, 
    calculate_vector_angle, 
    landmarks_to_3d
)
from app.services.face_detection import FaceDetectionService
from app.services.posture_angles import PostureAngles

class DrowsinessDetectionService:
    """Service for drowsiness and posture detection."""
    
    # Landmark indices
    LEFT_EYE = [33, 160, 158, 133, 153, 144]
    RIGHT_EYE = [362, 385, 387, 263, 373, 380]
    MOUTH = [61, 81, 13, 311, 308, 402, 14, 178]
    
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False, 
            max_num_faces=1, 
            refine_landmarks=True
        )
        self.face_detection_service = FaceDetectionService()
        self.posture_angles = PostureAngles()
        self.eye_counter = 0
        self.yawn_counter = 0
    
    def process_frame(
        self, 
        rgb_image: np.ndarray, 
        frame: np.ndarray
    ) -> Tuple[Optional[float], Optional[float], Optional[float], Optional[float], bool, bool, Optional[dict]]:
        """
        Process frame for drowsiness detection and posture analysis.
        
        Returns:
            Tuple of (pitch_angle, ear, mar, yaw_angle, drowsiness_detected, yawn_detected)
        """
        h, w = frame.shape[:2]
        results = self.face_mesh.process(rgb_image)
        
        if not results.multi_face_landmarks:
            return None, None, None, None, False, False
            
        for face_landmarks in results.multi_face_landmarks:
            lm = face_landmarks.landmark
            
            # Convert landmarks
            landmarks_2d = [(int(pt.x * w), int(pt.y * h)) for pt in lm]
            landmarks_3d = [(pt.x * w, pt.y * h, pt.z * w) for pt in lm]
            
            # Calculate pitch
            pitch_angle = self._calculate_pitch(lm, w, h)
            
            # Calculate EAR and MAR
            ear = self._calculate_ear(landmarks_2d)
            mar = self._calculate_mar(landmarks_2d)
            
            # Calculate yaw
            yaw_angle = self._calculate_yaw(landmarks_3d)
            
            # Detect drowsiness and yawning
            drowsiness_detected, yawn_detected = self._detect_fatigue(ear, mar, yaw_angle)

            distance, brightness = self.face_detection_service.detect_face_and_measure_distance(rgb_image, frame)

            posture_angles = self.posture_angles.compute_posture_angles(distance, pitch_angle)
            
            # Draw visualizations
            self._draw_pitch_line(frame, lm, w, h)
            self._draw_status_table(frame, pitch_angle, ear, mar, yaw_angle, brightness,
                                  drowsiness_detected, yawn_detected, w, h, posture_angles)
            
            return pitch_angle, ear, mar, yaw_angle, drowsiness_detected, yawn_detected, posture_angles
            
        return None, None, None, None, False, False
    
    def _calculate_pitch(self, landmarks, w: int, h: int) -> float:
        """Calculate head pitch angle."""
        left_eye = landmarks_to_3d(landmarks, 33, w, h)
        right_eye = landmarks_to_3d(landmarks, 263, w, h)
        chin = landmarks_to_3d(landmarks, 152, w, h)
        
        eye_mid = (left_eye + right_eye) / 2
        eye_vec = right_eye - left_eye
        vertical_vec = chin - eye_mid
        normal = np.cross(eye_vec, vertical_vec)
        
        ground_plane = np.array([0, -1, 0])
        return calculate_vector_angle(normal, ground_plane)
    
    def _calculate_ear(self, landmarks_2d: List[Tuple[int, int]]) -> float:
        """Calculate Eye Aspect Ratio."""
        left_ear = calculate_aspect_ratio(landmarks_2d, self.LEFT_EYE)
        right_ear = calculate_aspect_ratio(landmarks_2d, self.RIGHT_EYE)
        return (left_ear + right_ear) / 2.0
    
    def _calculate_mar(self, landmarks_2d: List[Tuple[int, int]]) -> float:
        """Calculate Mouth Aspect Ratio."""
        return calculate_aspect_ratio(landmarks_2d, self.MOUTH)
    
    def _calculate_yaw(self, landmarks_3d: List[Tuple[float, float, float]]) -> float:
        """Calculate head yaw angle."""
        left_eye_outer_3d = np.array(landmarks_3d[self.LEFT_EYE[0]])
        right_eye_outer_3d = np.array(landmarks_3d[self.RIGHT_EYE[3]])
        eye_vector = right_eye_outer_3d - left_eye_outer_3d
        yaw_angle_rad = np.arctan2(eye_vector[2], eye_vector[0])
        return np.degrees(yaw_angle_rad)
    
    def _detect_fatigue(self, ear: float, mar: float, yaw_angle: float) -> Tuple[bool, bool]:
        """Detect drowsiness and yawning."""
        # Drowsiness detection
        if ear > 0 and ear < settings.EAR_THRESH:
            self.eye_counter += 1
        else:
            self.eye_counter = 0
            
        # Yawn detection
        is_frontal = abs(yaw_angle) < settings.YAW_ANGLE_THRESH
        if ((is_frontal and mar > settings.MAR_THRESH) or 
            (not is_frontal and mar > settings.MAR_THRESH_NON_FRONTAL)):
            self.yawn_counter += 1
        else:
            self.yawn_counter = 0
            
        drowsiness_detected = self.eye_counter >= settings.EAR_CONSEC_FRAMES
        yawn_detected = self.yawn_counter >= settings.YAWN_CONSEC_FRAMES
        
        return drowsiness_detected, yawn_detected
    
    def _draw_pitch_line(self, frame: np.ndarray, landmarks, w: int, h: int):
        """Draw line between eyes for pitch visualization."""
        left_eye = landmarks_to_3d(landmarks, 33, w, h)
        right_eye = landmarks_to_3d(landmarks, 263, w, h)
        cv2.line(frame, (int(left_eye[0]), int(left_eye[1])),
                (int(right_eye[0]), int(right_eye[1])), (0, 255, 255), 1)
    
    def _draw_status_table(self, frame: np.ndarray, pitch: float, ear: float, 
                          mar: float, yaw: float, brightness: float, drowsiness: bool, yawn: bool,
                          w: int, h: int, posture_angles: dict):
        """Draw status table on frame."""
        # Table configuration
        table_width = 600
        table_height = 6 * 20 + 18
        table_x = w - table_width - 20
        table_y = h - table_height - 20
        row_height = 20
        col1_x = table_x + 8
        col2_x = table_x + 140
        col3_x = table_x + 280
        font_scale = 0.42
        font_thickness = 1
        
        # Colors
        alert_color = (0, 0, 255)
        ok_color = (0, 200, 0)
        metric_color = (255, 255, 255)
        label_color = (200, 200, 0)
        
        # Draw semi-transparent background
        overlay = frame.copy()
        cv2.rectangle(overlay, (table_x, table_y), 
                     (table_x + table_width, table_y + table_height), 
                     (30, 30, 30), -1)
        cv2.rectangle(overlay, (table_x, table_y), 
                     (table_x + table_width, table_y + table_height), 
                     (80, 80, 80), 1)
        frame[:] = cv2.addWeighted(overlay, 0.5, frame, 0.5, 0)
        
        # Headers
        cv2.putText(frame, "ALERTS", (col1_x, table_y + 15), 
                   cv2.FONT_HERSHEY_SIMPLEX, font_scale + 0.07, 
                   label_color, font_thickness + 1)
        cv2.putText(frame, "METRICS", (col2_x, table_y + 15), 
                   cv2.FONT_HERSHEY_SIMPLEX, font_scale + 0.07, 
                   label_color, font_thickness + 1)
        cv2.putText(frame, "POSTURE", (col3_x, table_y + 15),
                   cv2.FONT_HERSHEY_SIMPLEX, font_scale + 0.07, 
                   label_color, font_thickness + 1)
        
        # Content rows
        row = 1
        # Alerts column
        alerts = [
            ("DROWSINESS ALERT!" if drowsiness else "Drowsiness: OK", 
             alert_color if drowsiness else ok_color),
            ("YAWNING ALERT!" if yawn else "Yawning: OK", 
             alert_color if yawn else ok_color)
        ]
        
        for alert_text, color in alerts:
            cv2.putText(frame, alert_text, (col1_x, table_y + row * row_height + 15),
                       cv2.FONT_HERSHEY_SIMPLEX, font_scale, color, font_thickness)
            row += 1
        
        # Metrics column
        row = 1
        metrics = [
            f"Pitch: {pitch:.2f} deg",
            f"EAR: {ear:.2f}",
            f"MAR: {mar:.2f}",
            f"Yaw: {yaw:.1f}",
            f"Brightness: {brightness:.2f}" if brightness is not None else "Brightness: N/A"
        ]
        
        for metric in metrics:
            cv2.putText(frame, metric, (col2_x, table_y + row * row_height + 15),
                       cv2.FONT_HERSHEY_SIMPLEX, font_scale, metric_color, font_thickness)
            row += 1
        # Posture column
        row = 1
        healthy_ranges = {
            "Degree of Anteversion of Cervical Spine (y1)": (25, 34),
            "T1 Slope (y2)": (30, 50),
            "Upper Thoracic Kyphosis Angle (y3)": (140, 158),
            "Middle and Lower Thoracic Kyphosis Angle (y4)": (154, 155.5),
            "T8-T12-L3 Angle (new)": (175, 180.3),
            "Lumbar Lordosis Angle (y5)": (170, 174),
        }
        for angle_name, angle_value in posture_angles.items():
            if angle_name in healthy_ranges:
                low, high = healthy_ranges[angle_name]
                color = (0, 200, 0) if low <= angle_value <= high else (0, 0, 255)
            else:
                color = metric_color
            cv2.putText(
                frame,
                f"{angle_name}: {angle_value:.2f} deg",
                (col3_x, table_y + row * row_height + 15),
                cv2.FONT_HERSHEY_SIMPLEX,
                font_scale - 0.12,
                color,
                font_thickness,
            )
            row += 1
    
    def get_counters(self) -> Tuple[int, int]:
        """Get current eye and yawn counters."""
        return self.eye_counter, self.yawn_counter
    
    def reset_counters(self):
        """Reset detection counters."""
        self.eye_counter = 0
        self.yawn_counter = 0