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
latest_data = {"distance": None, "pitch": None}
lock = threading.Lock()

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

def generate_frames(local=False):
    global latest_data

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Process Face Detection
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

        # Process Face Mesh for Pitch
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
            left_eye_2d = (int(left_eye[0]), int(left_eye[1]))
            right_eye_2d = (int(right_eye[0]), int(right_eye[1]))
            cv2.line(frame, left_eye_2d, right_eye_2d, (0, 255, 255), 2)
            cv2.putText(frame, f"Pitch: {pitch_angle:.2f} deg", (30, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

        # Show stream in window
        if local:
            cv2.imshow("Camera Feed", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        else:
            # MJPEG frame streaming
            _, buffer = cv2.imencode(".jpg", frame)
            yield (b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

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
            "pitch": latest_data["pitch"]
        })
