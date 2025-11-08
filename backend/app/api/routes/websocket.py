"""
WebSocket endpoints for real-time video processing from client webcam.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import cv2
import numpy as np
import base64
import json
import time
from typing import Dict, Optional
from app.services.drowsiness_detection import DrowsinessDetectionService
from app.services.calibration_service import calibration_service
from app.models.schemas import PostureScore, BlinkDetection, MinimalDashboardResponse, UserThresholds

router = APIRouter()


class WebSocketVideoProcessor:
    """Process video frames received via WebSocket from client browser."""
    
    def __init__(self):
        self.drowsiness_service = DrowsinessDetectionService()
        self.blink_counter = 0
        self.last_blink_time = time.time()
        self.blink_timestamps = []
    
    def calculate_posture_score(
        self, 
        pitch_angle: Optional[float],
        roll_angle: Optional[float],
        distance: Optional[float],
        thresholds: UserThresholds
    ) -> PostureScore:
        """
        Calculate posture scores based on angles and thresholds.
        
        NEW BEHAVIOR: Only show negative scores when thresholds are EXCEEDED.
        Within threshold = 100 (perfect), exceeding threshold = declining score.
        
        Returns scores from 0-100 where 100 is perfect posture.
        """
        neck_score = 100.0
        roll_score = 100.0
        distance_score = 100.0
        
        # Calculate neck score based on pitch angle
        if pitch_angle is not None:
            pitch_deviation = abs(pitch_angle)
            print(f"DEBUG Neck: pitch_angle={pitch_angle}, deviation={pitch_deviation}, threshold={thresholds.pitch_threshold}")
            
            if pitch_deviation <= thresholds.pitch_threshold:
                # Within threshold = perfect score (100)
                neck_score = 100.0
            else:
                # Exceeding threshold = score decreases proportionally
                # Score drops from 100 to 0 as deviation increases beyond threshold
                excess = pitch_deviation - thresholds.pitch_threshold
                # Allow some grace: score drops to 0 when deviation is 2x the threshold
                max_excess = thresholds.pitch_threshold  # Same as threshold value
                penalty = min(100, (excess / max_excess) * 100)
                neck_score = max(0, 100 - penalty)
        else:
            print(f"DEBUG Neck: pitch_angle is None!")
        
        # Calculate roll score (side-to-side tilt)
        if roll_angle is not None:
            roll_deviation = abs(roll_angle)
            print(f"DEBUG Roll: roll_angle={roll_angle}, deviation={roll_deviation}, threshold={thresholds.roll_threshold}")
            
            if roll_deviation <= thresholds.roll_threshold:
                # Within threshold = perfect score (100)
                roll_score = 100.0
            else:
                # Exceeding threshold = score decreases proportionally
                excess = roll_deviation - thresholds.roll_threshold
                max_excess = thresholds.roll_threshold
                penalty = min(100, (excess / max_excess) * 100)
                roll_score = max(0, 100 - penalty)
        else:
            print(f"DEBUG Roll: roll_angle is None!")
        
        # Calculate distance score
        if distance is not None:
            if thresholds.distance_min <= distance <= thresholds.distance_max:
                # Within threshold range = perfect distance
                distance_score = 100.0
            elif distance < thresholds.distance_min:
                # Too close - score decreases as you get closer
                # Allow grace: score drops to 0 at 50% of min distance
                min_acceptable = thresholds.distance_min * 0.5
                if distance <= min_acceptable:
                    distance_score = 0.0
                else:
                    # Linear interpolation between min_acceptable and distance_min
                    distance_score = ((distance - min_acceptable) / 
                                    (thresholds.distance_min - min_acceptable)) * 100
            else:
                # Too far - score decreases as you get farther
                # Allow grace: score drops to 0 at 1.5x max distance
                max_acceptable = thresholds.distance_max * 1.5
                if distance >= max_acceptable:
                    distance_score = 0.0
                else:
                    # Linear interpolation between distance_max and max_acceptable
                    distance_score = 100 - (((distance - thresholds.distance_max) / 
                                            (max_acceptable - thresholds.distance_max)) * 100)
        
        # Overall score is average of ALL components including roll
        overall_score = (neck_score + roll_score + distance_score) / 3
        
        # Determine status based on calibrated behavior
        if overall_score >= 90:
            status = "good"  # Within calibrated thresholds
        elif overall_score >= 60:
            status = "warning"  # Slightly exceeding thresholds
        else:
            status = "poor"  # Significantly exceeding thresholds
        
        return PostureScore(
            overall=round(overall_score, 1),
            neck=round(neck_score, 1),
            roll=round(roll_score, 1),
            distance=round(distance_score, 1),
            status=status
        )
    
    def calculate_blink_rate(self) -> float:
        """Calculate blinks per minute based on recent history."""
        current_time = time.time()
        # Keep only blinks from last 60 seconds
        self.blink_timestamps = [t for t in self.blink_timestamps if current_time - t < 60]
        
        if len(self.blink_timestamps) == 0:
            return 0.0
        
        # Calculate rate
        time_span = current_time - min(self.blink_timestamps) if self.blink_timestamps else 1
        return (len(self.blink_timestamps) / time_span) * 60 if time_span > 0 else 0.0
    
    def process_frame(
        self, 
        frame: np.ndarray, 
        user_id: str
    ) -> Optional[MinimalDashboardResponse]:
        """
        Process a single frame and return minimal dashboard data.
        
        Args:
            frame: Image frame from webcam
            user_id: User identifier for personalized thresholds
            
        Returns:
            MinimalDashboardResponse with posture and blink data
        """
        try:
            # Convert to RGB for MediaPipe
            rgb_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Get user thresholds
            thresholds = calibration_service.get_user_thresholds(user_id)
            
            # Log calibration status
            if not thresholds.calibrated:
                print(f"WARNING: User {user_id} is not calibrated. Using default thresholds.")
            else:
                print(f"Using calibrated thresholds for user {user_id}: pitch={thresholds.pitch_threshold}, distance_min={thresholds.distance_min}, distance_max={thresholds.distance_max}")
            
            # Process with drowsiness detection service
            result = self.drowsiness_service.process_frame(rgb_image, frame)
            
            if result[0] is None:  # No face detected
                return None
            
            pitch_angle, ear, mar, yaw_angle, roll_angle, drowsiness_detected, yawn_detected, blink_detected, posture_angles = result
            
            print(f"DEBUG: pitch_angle={pitch_angle}, roll_angle={roll_angle}")
            
            # Update blink tracking
            if blink_detected:
                self.blink_counter += 1
                self.blink_timestamps.append(time.time())
            
            # Get distance - we need to call face detection directly since it's not returned
            distance, brightness = self.drowsiness_service.face_detection_service.detect_face_and_measure_distance(rgb_image, frame)
            
            # Debug logging for distance issues
            print(f"Distance: {distance} cm, Thresholds: min={thresholds.distance_min}, max={thresholds.distance_max}")
            
            # Calculate posture score including roll (head tilt)
            posture_score = self.calculate_posture_score(pitch_angle, roll_angle, distance, thresholds)
            
            print(f"Posture Score - Overall: {posture_score.overall}, Neck: {posture_score.neck}, Roll: {posture_score.roll}, Distance: {posture_score.distance}")
            
            # Create blink detection data
            blink_rate = self.calculate_blink_rate()
            blink_detection = BlinkDetection(
                blink_detected=blink_detected,
                blink_count=self.blink_counter,
                blink_rate=round(blink_rate, 1),
                ear_value=round(ear, 3) if ear else None
            )
            
            # Generate alert if needed
            alert = None
            if posture_score.status == "poor":
                alert = "Poor posture detected - adjust your position"
            elif drowsiness_detected:
                alert = "Drowsiness detected - take a break"
            elif yawn_detected:
                alert = "Yawning detected - consider resting"
            elif blink_rate < 10:
                alert = "Low blink rate - remember to blink regularly"
            
            return MinimalDashboardResponse(
                posture_score=posture_score,
                blink_detection=blink_detection,
                alert=alert,
                timestamp=time.time(),
                posture_angles=posture_angles,
                # Include raw metrics for calibration
                pitch_angle=pitch_angle,
                roll_angle=roll_angle,
                distance=distance,
                ear_value=ear
            )
            
        except Exception as e:
            print(f"Error processing frame: {e}")
            return None


# Global processor instance
processor = WebSocketVideoProcessor()


@router.websocket("/ws/video")
async def websocket_video_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for receiving video frames from client.
    
    Client should send JSON messages with:
    {
        "user_id": "unique_user_id",
        "frame": "base64_encoded_jpeg_image",
        "timestamp": 1234567890.123
    }
    
    Server responds with MinimalDashboardResponse as JSON.
    """
    await websocket.accept()
    print(f"WebSocket client connected from {websocket.client}")
    
    try:
        while True:
            try:
                # Receive data from client with timeout
                data = await websocket.receive_text()
                
                # Handle ping messages
                if data == "ping":
                    await websocket.send_text("pong")
                    continue
                
                message = json.loads(data)
                
                # Extract frame data
                user_id = message.get('user_id', 'default')
                frame_data = message.get('frame', '')
                
                if not frame_data:
                    await websocket.send_json({"error": "No frame data received"})
                    continue
                
                # Decode base64 frame
                try:
                    # Remove data URL prefix if present
                    if ',' in frame_data:
                        frame_data = frame_data.split(',')[1]
                    
                    # Decode base64 to image
                    img_bytes = base64.b64decode(frame_data)
                    nparr = np.frombuffer(img_bytes, np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    
                    if frame is None:
                        await websocket.send_json({"error": "Failed to decode frame"})
                        continue
                    
                except Exception as e:
                    print(f"Frame decode error: {e}")
                    await websocket.send_json({"error": f"Frame decode error: {str(e)}"})
                    continue
                
                # Process the frame
                try:
                    result = processor.process_frame(frame, user_id)
                    
                    if result is None:
                        # No face detected
                        await websocket.send_json({
                            "status": "no_face",
                            "message": "No face detected in frame"
                        })
                    else:
                        # Send results back to client
                        await websocket.send_json(result.dict())
                except Exception as e:
                    print(f"Frame processing error: {e}")
                    # Send error but don't crash the connection
                    await websocket.send_json({
                        "error": "Processing error",
                        "message": str(e)
                    })
                    
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                await websocket.send_json({"error": "Invalid JSON format"})
            except WebSocketDisconnect:
                # Client disconnected, break the loop
                print(f"Client disconnected from WebSocket")
                break
            except Exception as e:
                error_msg = str(e)
                # Check if it's a disconnect-related error
                if "disconnect" in error_msg.lower() or "closed" in error_msg.lower():
                    print(f"Connection closed: {e}")
                    break
                print(f"Error in message handling: {e}")
                # For other errors, try to continue
                continue
    
    except WebSocketDisconnect:
        print(f"Client disconnected from WebSocket")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass
        print("WebSocket connection closed")
