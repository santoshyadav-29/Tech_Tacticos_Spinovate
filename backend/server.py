import time
from fastapi import FastAPI
from fastapi.responses import StreamingResponse, JSONResponse
import cv2
import mediapipe as mp
import numpy as np
import threading

app = FastAPI()

# MediaPipe modules
mp_face_detection = mp.solutions.face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.6)
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True)
mp_drawing = mp.solutions.drawing_utils

# Capture source
cap = cv2.VideoCapture(0)  # Use 0 for webcam or replace with IP stream

# Calibration constants
KNOWN_DISTANCE = 50.0   # cm
REAL_WIDTH = 16.0       # cm (human head average)
FOCAL_LENGTH = 650      # Adjusted focal length

# Shared variables
latest_data = {"distance": None, "pitch": None, "brightness": None, "ear": None, "mar": None, "yaw": None}
monitoring_active = False
monitoring_data = {}
lock = threading.Lock()

# Threshold variables for monitoring
GOOD_DISTANCE_MIN = 40
GOOD_DISTANCE_MAX = 60
BRIGHTNESS_HIGH_THRESHOLD = 140
PITCH_BAD_POSTURE_THRESHOLD = 15
VIDEO_FPS = 15

# Constants for Fatigue Detection
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
MOUTH = [61, 81, 13, 311, 308, 402, 14, 178]

EAR_THRESH = 0.25
MAR_THRESH = 0.75
MAR_THRESH_NON_FRONTAL = 0.9
YAW_ANGLE_THRESH = 20  # degrees
EAR_CONSEC_FRAMES = 25  # Require longer closure for drowsiness
YAWN_CONSEC_FRAMES = 15  # Require longer open mouth for yawn

# State counters for drowsiness detection
eye_counter = 0
yawn_counter = 0

# Helper functions
def euclidean(p1, p2):
    return np.linalg.norm(np.array(p1) - np.array(p2))

def aspect_ratio(landmarks, indices):
    top = euclidean(landmarks[indices[1]], landmarks[indices[5]]) + euclidean(landmarks[indices[2]], landmarks[indices[4]])
    bottom = 2 * euclidean(landmarks[indices[0]], landmarks[indices[3]])
    return top / bottom if bottom != 0 else 0

def vector_angle(v1, v2):
    v1_u = v1 / np.linalg.norm(v1)
    v2_u = v2 / np.linalg.norm(v2)
    dot = np.dot(v1_u, v2_u)
    angle = np.arccos(np.clip(dot, -1.0, 1.0))
    return np.degrees(angle) - 90

def to_3d(landmarks, idx, w, h):
    pt = landmarks[idx]
    return np.array([pt.x * w, pt.y * h, pt.z * w])

def get_face_width_px(bbox, image_width):
    return bbox.width * image_width

def generate_frames(local=False):
    global latest_data, monitoring_active, monitoring_data, eye_counter, yawn_counter

    frame_interval = 1.0 / VIDEO_FPS 
    while True:
        start_time = time.time()
        ret, frame = cap.read()
        if not ret:
            break

        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        distance = None
        pitch_angle = None
        brightness = None
        ear = None
        mar = None
        yaw_angle = None
        drowsiness_detected = False
        yawn_detected = False

        # --- Face Detection ---
        detection_results = mp_face_detection.process(rgb)
        if detection_results.detections:
            for detection in detection_results.detections:
                bbox = detection.location_data.relative_bounding_box
                face_width_px = get_face_width_px(bbox, w)

                if face_width_px > 0:
                    distance = (FOCAL_LENGTH * REAL_WIDTH) / face_width_px
                    with lock:
                        latest_data["distance"] = round(distance, 2)

                    # Draw bounding box
                    x1 = int(bbox.xmin * w)
                    y1 = int(bbox.ymin * h)
                    x2 = int((bbox.xmin + bbox.width) * w)
                    y2 = int((bbox.ymin + bbox.height) * h)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 1)
                    cv2.putText(frame, f"Distance: {distance:.2f} cm", (x1, y1 - 5),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

                    # Brightness estimation
                    face_roi = frame[y1:y2, x1:x2]
                    if face_roi.size > 0:
                        gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
                        brightness = np.mean(gray)
                        with lock:
                            latest_data["brightness"] = round(brightness, 2)

                        if brightness > BRIGHTNESS_HIGH_THRESHOLD:
                            cv2.putText(frame, f"⚠ Brightness Too High! ({brightness:.2f})", (30, 80),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        # --- Face Mesh (Pitch + Drowsiness Detection) ---
        mesh_results = face_mesh.process(rgb)
        if mesh_results.multi_face_landmarks:
            for face_landmarks in mesh_results.multi_face_landmarks:
                lm = face_landmarks.landmark
                
                # Convert landmarks to pixel coordinates
                landmarks_2d = [(int(pt.x * w), int(pt.y * h)) for pt in lm]
                landmarks_3d = [(pt.x * w, pt.y * h, pt.z * w) for pt in lm]

                # --- Pitch Calculation ---
                left_eye = to_3d(lm, 33, w, h)
                right_eye = to_3d(lm, 263, w, h)
                chin = to_3d(lm, 152, w, h)

                eye_mid = (left_eye + right_eye) / 2
                eye_vec = right_eye - left_eye
                vertical_vec = chin - eye_mid
                normal = np.cross(eye_vec, vertical_vec)

                ground_plane = np.array([0, -1, 0])
                pitch_angle = vector_angle(normal, ground_plane)

                with lock:
                    latest_data["pitch"] = round(pitch_angle, 2)

                # --- Drowsiness Detection ---
                # EAR calculation
                left_ear = aspect_ratio(landmarks_2d, LEFT_EYE)
                right_ear = aspect_ratio(landmarks_2d, RIGHT_EYE)
                ear = (left_ear + right_ear) / 2.0

                # MAR calculation
                mar = aspect_ratio(landmarks_2d, MOUTH)

                # Yaw estimation using 3D landmarks
                left_eye_outer_3d = np.array(landmarks_3d[LEFT_EYE[0]])
                right_eye_outer_3d = np.array(landmarks_3d[RIGHT_EYE[3]])
                eye_vector = right_eye_outer_3d - left_eye_outer_3d
                yaw_angle_rad = np.arctan2(eye_vector[2], eye_vector[0])
                yaw_angle = np.degrees(yaw_angle_rad)
                is_frontal = abs(yaw_angle) < YAW_ANGLE_THRESH

                # Update shared data
                with lock:
                    latest_data["ear"] = round(ear, 2)
                    latest_data["mar"] = round(mar, 2)
                    latest_data["yaw"] = round(yaw_angle, 2)

                # Detect fatigue (robust logic)
                if ear > 0 and ear < EAR_THRESH:
                    eye_counter += 1
                else:
                    eye_counter = 0

                # Yawn detection: allow in non-frontal, but require higher MAR
                if (is_frontal and mar > MAR_THRESH) or (not is_frontal and mar > MAR_THRESH_NON_FRONTAL):
                    yawn_counter += 1
                else:
                    yawn_counter = 0

                # Check for alerts
                alert_y = 30  # Start y position for alerts
                alert_gap = 35  # Vertical gap between alerts
                font_scale = 0.7
                font_thickness = 2
                alert_color = (0, 0, 255)

                if eye_counter >= EAR_CONSEC_FRAMES:
                    drowsiness_detected = True
                    cv2.putText(frame, "DROWSINESS ALERT!", (10, alert_y),
                                cv2.FONT_HERSHEY_SIMPLEX, font_scale, alert_color, font_thickness)
                    alert_y += alert_gap

                if yawn_counter >= YAWN_CONSEC_FRAMES:
                    yawn_detected = True
                    cv2.putText(frame, "YAWNING ALERT!", (10, alert_y),
                                cv2.FONT_HERSHEY_SIMPLEX, font_scale, alert_color, font_thickness)
                    alert_y += alert_gap

                # Move table to bottom right corner, make it semi-transparent, and reduce size
                table_width = 300
                table_height = 5 * 20 + 18
                table_x = w - table_width - 20
                table_y = h - table_height - 20
                row_height = 20
                col1_x = table_x + 8
                col2_x = table_x + 140
                font_scale = 0.42
                font_thickness = 1
                alert_color = (0, 0, 255)
                ok_color = (0, 200, 0)
                metric_color = (255, 255, 255)
                label_color = (200, 200, 0)

                # Draw semi-transparent table background
                overlay = frame.copy()
                cv2.rectangle(overlay, (table_x, table_y), (table_x + table_width, table_y + table_height), (30, 30, 30), -1)
                cv2.rectangle(overlay, (table_x, table_y), (table_x + table_width, table_y + table_height), (80, 80, 80), 1)
                alpha = 0.5
                frame = cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0)

                # Table headers
                cv2.putText(frame, "ALERTS", (col1_x, table_y + 15), cv2.FONT_HERSHEY_SIMPLEX, font_scale + 0.07, label_color, font_thickness + 1)
                cv2.putText(frame, "METRICS", (col2_x, table_y + 15), cv2.FONT_HERSHEY_SIMPLEX, font_scale + 0.07, label_color, font_thickness + 1)

                # Alerts
                row = 1
                if eye_counter >= EAR_CONSEC_FRAMES:
                    cv2.putText(frame, "DROWSINESS ALERT!", (col1_x, table_y + row * row_height + 15),
                                cv2.FONT_HERSHEY_SIMPLEX, font_scale, alert_color, font_thickness + 1)
                else:
                    cv2.putText(frame, "Drowsiness: OK", (col1_x, table_y + row * row_height + 15),
                                cv2.FONT_HERSHEY_SIMPLEX, font_scale, ok_color, font_thickness)
                row += 1
                if yawn_counter >= YAWN_CONSEC_FRAMES:
                    cv2.putText(frame, "YAWNING ALERT!", (col1_x, table_y + row * row_height + 15),
                                cv2.FONT_HERSHEY_SIMPLEX, font_scale, alert_color, font_thickness + 1)
                else:
                    cv2.putText(frame, "Yawning: OK", (col1_x, table_y + row * row_height + 15),
                                cv2.FONT_HERSHEY_SIMPLEX, font_scale, ok_color, font_thickness)
                row += 1
                if brightness is not None and brightness > BRIGHTNESS_HIGH_THRESHOLD:
                    cv2.putText(frame, f"Brightness High! ({brightness:.1f})", (col1_x, table_y + row * row_height + 15),
                                cv2.FONT_HERSHEY_SIMPLEX, font_scale, alert_color, font_thickness + 1)
                else:
                    cv2.putText(frame, f"Brightness: OK", (col1_x, table_y + row * row_height + 15),
                                cv2.FONT_HERSHEY_SIMPLEX, font_scale, ok_color, font_thickness)
                row += 1

                # Metrics
                row = 1
                cv2.putText(frame, f"Pitch: {pitch_angle:.2f} deg", (col2_x, table_y + row * row_height + 15),
                            cv2.FONT_HERSHEY_SIMPLEX, font_scale, metric_color, font_thickness)
                row += 1
                cv2.putText(frame, f"EAR: {ear:.2f}", (col2_x, table_y + row * row_height + 15),
                            cv2.FONT_HERSHEY_SIMPLEX, font_scale, metric_color, font_thickness)
                row += 1
                cv2.putText(frame, f"MAR: {mar:.2f}", (col2_x, table_y + row * row_height + 15),
                            cv2.FONT_HERSHEY_SIMPLEX, font_scale, metric_color, font_thickness)
                row += 1
                cv2.putText(frame, f"Yaw: {yaw_angle:.1f}", (col2_x, table_y + row * row_height + 15),
                            cv2.FONT_HERSHEY_SIMPLEX, font_scale, metric_color, font_thickness)
                row += 1
                if brightness is not None:
                    cv2.putText(frame, f"Brightness: {brightness:.1f}", (col2_x, table_y + row * row_height + 15),
                                cv2.FONT_HERSHEY_SIMPLEX, font_scale, metric_color, font_thickness)
                else:
                    cv2.putText(frame, "Brightness: None", (col2_x, table_y + row * row_height + 15),
                                cv2.FONT_HERSHEY_SIMPLEX, font_scale, metric_color, font_thickness)

                # Draw eye line for pitch visualization (keep as before)
                cv2.line(frame, (int(left_eye[0]), int(left_eye[1])),
                         (int(right_eye[0]), int(right_eye[1])), (0, 255, 255), 1)

        # --- Monitoring Logic ---
        if monitoring_active:
            current_time = time.time()
            elapsed = 1 / VIDEO_FPS

            monitoring_data["total_frames"] += 1
            monitoring_data["total_duration"] = current_time - monitoring_data["start_time"]

            face_detected = distance is not None
            if face_detected:
                monitoring_data["frames_with_face"] += 1

                # Distance monitoring
                monitoring_data["distance_sum"] += distance
                if GOOD_DISTANCE_MIN <= distance <= GOOD_DISTANCE_MAX:
                    monitoring_data["good_distance_time"] += elapsed

                # Brightness monitoring
                if brightness is not None:
                    monitoring_data["brightness_sum"] += brightness
                    monitoring_data["max_brightness"] = max(brightness, monitoring_data["max_brightness"])
                    if brightness > BRIGHTNESS_HIGH_THRESHOLD:
                        monitoring_data["high_brightness_time"] += elapsed
                        if not getattr(monitoring_data, "_brightness_state", False):
                            monitoring_data["high_brightness_events"] += 1
                            monitoring_data["_brightness_state"] = True
                    else:
                        monitoring_data["_brightness_state"] = False

                # Pitch monitoring
                if pitch_angle is not None:
                    monitoring_data["pitch_sum"] += abs(pitch_angle)
                    if abs(pitch_angle) > PITCH_BAD_POSTURE_THRESHOLD:
                        monitoring_data["bad_posture_time"] += elapsed
                        monitoring_data["current_good_posture_streak"] = 0
                        if monitoring_data["last_posture_good"]:
                            monitoring_data["bad_posture_events"] += 1
                        monitoring_data["last_posture_good"] = False
                    else:
                        monitoring_data["current_good_posture_streak"] += elapsed
                        monitoring_data["max_good_posture_streak"] = max(
                            monitoring_data["max_good_posture_streak"],
                            monitoring_data["current_good_posture_streak"]
                        )
                        monitoring_data["last_posture_good"] = True

                # Drowsiness monitoring
                if drowsiness_detected:
                    monitoring_data["drowsiness_time"] += elapsed
                    if not getattr(monitoring_data, "_drowsiness_state", False):
                        monitoring_data["drowsiness_events"] += 1
                        monitoring_data["_drowsiness_state"] = True
                else:
                    monitoring_data["_drowsiness_state"] = False

                # Yawn monitoring
                if yawn_detected:
                    if not getattr(monitoring_data, "_yawn_state", False):
                        monitoring_data["yawns_detected"] += 1
                        monitoring_data["_yawn_state"] = True
                else:
                    monitoring_data["_yawn_state"] = False

            else:
                # No face detected
                monitoring_data["face_missing_time"] += elapsed

        # --- Streaming or Local Display ---
        if local:
            cv2.imshow("Camera Feed", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        else:
            _, buffer = cv2.imencode(".jpg", frame)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

        # --- FPS limiting ---
        elapsed = time.time() - start_time
        sleep_time = frame_interval - elapsed
        # Only sleep if the frame processing was faster than the interval and the user is not in local mode
        if sleep_time > 0 and not local:
            time.sleep(sleep_time)

@app.get("/video/")
async def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/run-local/")
async def run_local():
    return StreamingResponse(generate_frames(local=True), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/distance/")
async def get_distance():
    with lock:
        return JSONResponse(content={
            "distance": latest_data["distance"],
            "pitch": latest_data["pitch"],
            "brightness": latest_data["brightness"],
            "ear": latest_data["ear"],
            "mar": latest_data["mar"],
            "yaw": latest_data["yaw"]
        })

@app.get("/drowsiness-status/")
async def get_drowsiness_status():
    """Get current drowsiness detection status"""
    with lock:
        return JSONResponse(content={
            "ear": latest_data["ear"],
            "mar": latest_data["mar"],
            "yaw": latest_data["yaw"],
            "eye_counter": eye_counter,
            "yawn_counter": yawn_counter,
            "drowsiness_alert": eye_counter >= EAR_CONSEC_FRAMES,
            "yawn_alert": yawn_counter >= YAWN_CONSEC_FRAMES
        })

# Monitoring Parts
@app.post("/start-monitoring/")
def start_monitoring():
    global monitoring_active, monitoring_data, eye_counter, yawn_counter
    if monitoring_active:
        return {"message": "Monitoring already started", "status": "already_started"}
    
    monitoring_active = True
    # Reset counters
    eye_counter = 0
    yawn_counter = 0
    
    monitoring_data = {
        "start_time": time.time(),
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
        "last_face_detected": time.time(),

        # Drowsiness metrics
        "drowsiness_time": 0,
        "drowsiness_events": 0,
        "yawns_detected": 0,
    }

    return {"message": "Monitoring started", "status": "started"}

@app.post("/stop-monitoring/")
def stop_monitoring():
    global monitoring_active
    if not monitoring_active:
        return {"message": "Monitoring already stopped", "status": "already_stopped"}
    monitoring_active = False
    return {"message": "Monitoring stopped", "status": "stopped"}

@app.get("/report/")
def generate_report():
    if not monitoring_data:
        return {"error": "No session data"}

    duration = monitoring_data["total_duration"]
    total_seen_time = duration - monitoring_data["face_missing_time"]
    avg_distance = monitoring_data["distance_sum"] / monitoring_data["frames_with_face"] if monitoring_data["frames_with_face"] else 0
    avg_pitch = monitoring_data["pitch_sum"] / monitoring_data["frames_with_face"] if monitoring_data["frames_with_face"] else 0
    avg_brightness = monitoring_data["brightness_sum"] / monitoring_data["frames_with_face"] if monitoring_data["frames_with_face"] else 0

    # Calculate session score
    score = 100
    score -= (monitoring_data["bad_posture_time"] / duration) * 30 if duration > 0 else 0
    score -= (monitoring_data["high_brightness_time"] / duration) * 20 if duration > 0 else 0
    score -= (monitoring_data["face_missing_time"] / duration) * 10 if duration > 0 else 0
    score -= monitoring_data["yawns_detected"] * 5
    score -= (monitoring_data["drowsiness_time"] / duration) * 25 if duration > 0 else 0
    score -= monitoring_data["drowsiness_events"] * 3
    score = round(max(0, min(100, score)), 2)

    return {
        "session_duration_min": round(duration / 60, 2),
        "time_face_visible_min": round(total_seen_time / 60, 2),
        "avg_distance_cm": round(avg_distance, 2),
        "time_good_distance_min": round(monitoring_data["good_distance_time"] / 60, 2),
        "avg_pitch_deg": round(avg_pitch, 2),
        "bad_posture_time_min": round(monitoring_data["bad_posture_time"] / 60, 2),
        "bad_posture_events": monitoring_data["bad_posture_events"],
        "max_good_posture_streak_sec": round(monitoring_data["max_good_posture_streak"], 2),
        "avg_brightness": round(avg_brightness, 2),
        "max_brightness": round(monitoring_data["max_brightness"], 2),
        "high_brightness_time_min": round(monitoring_data["high_brightness_time"] / 60, 2),
        "high_brightness_events": monitoring_data["high_brightness_events"],
        "face_missing_time_min": round(monitoring_data["face_missing_time"] / 60, 2),
        "drowsiness_time_min": round(monitoring_data["drowsiness_time"] / 60, 2),
        "drowsiness_events": monitoring_data["drowsiness_events"],
        "yawns_detected": monitoring_data["yawns_detected"],
        "session_score": score
    }