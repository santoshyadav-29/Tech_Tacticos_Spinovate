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

# Capture source
cap = cv2.VideoCapture(0)  # Use 0 for webcam or replace with IP stream

# Calibration constants
KNOWN_DISTANCE = 50.0   # cm
REAL_WIDTH = 16.0       # cm (human head average)
FOCAL_LENGTH = 650      # Adjusted focal length

# Shared variables
latest_data = {"distance": None, "pitch": None, "brightness": None}
monitoring_active = False
monitoring_data = {}
lock = threading.Lock()

# Threshold variables for monitoring
GOOD_DISTANCE_MIN = 40
GOOD_DISTANCE_MAX = 60
BRIGHTNESS_HIGH_THRESHOLD = 140
PITCH_BAD_POSTURE_THRESHOLD = 15
VIDEO_FPS = 15

# Helper functions
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

import time

# Add these globals at top of your file
monitoring_active = False
monitoring_data = {}

def generate_frames(local=False):
    global latest_data, monitoring_active, monitoring_data

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
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(frame, f"Distance: {distance:.2f} cm", (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

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
                        else:
                            cv2.putText(frame, f"Brightness OK ({brightness:.2f})", (30, 80),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        # --- Face Mesh (Pitch) ---
        mesh_results = face_mesh.process(rgb)
        if mesh_results.multi_face_landmarks:
            lm = mesh_results.multi_face_landmarks[0].landmark

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

            # Draw eye line
            cv2.line(frame, (int(left_eye[0]), int(left_eye[1])),
                     (int(right_eye[0]), int(right_eye[1])), (0, 255, 255), 2)
            cv2.putText(frame, f"Pitch: {pitch_angle:.2f} deg", (30, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

        # --- Monitoring Logic ---
        if monitoring_active:
            current_time = time.time()
            elapsed = 1 / VIDEO_FPS

            monitoring_data["total_frames"] += 1
            monitoring_data["total_duration"] = current_time - monitoring_data["start_time"]

            face_detected = distance is not None
            if face_detected:
                monitoring_data["frames_with_face"] += 1

                # Distance
                monitoring_data["distance_sum"] += distance
                if GOOD_DISTANCE_MIN <= distance <= GOOD_DISTANCE_MAX:
                    monitoring_data["good_distance_time"] += elapsed

                # Brightness
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

                # Pitch
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
            else:
                # No face
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
        if sleep_time > 0:
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
            "brightness": latest_data["brightness"]
        })
    

# Monitoring Parts
@app.post("/start-monitoring/")
def start_monitoring():
    global monitoring_active, monitoring_data
    if monitoring_active:
        return {"message": "Monitoring already started", "status": "already_started"}
    monitoring_active = True
    
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

    score = 100
    score -= (monitoring_data["bad_posture_time"] / duration) * 30
    score -= (monitoring_data["high_brightness_time"] / duration) * 20
    score -= (monitoring_data["face_missing_time"] / duration) * 10
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
        "session_score": score
    }
