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

# Video source
cap = cv2.VideoCapture("http://172.16.3.114:4747/video")

# Constants
REAL_WIDTH = 16.0  # cm
FOCAL_LENGTH = 650  # approx.
latest_data = {"distance": None, "pitch": None, "posture_angles": {}}
lock = threading.Lock()

# Compute posture angles
def compute_posture_angles(x1, x2):
    coefficients = {
        'Degree of Anteversion of Cervical Spine (y1)': [-0.345462593, 0.0973337751, -0.00116986691, 0.0145517549, 49.3331444],
        'T1 Slope (y2)': [-1.39473277, 0.0907350841, 0.00493042464, 0.00227851532, 96.5556857],
        'Upper Thoracic Kyphosis Angle (y3)': [0.375504742, -0.538277117, 0.0000972785515, -0.00399718675, 133.6831],
        'Middle and Lower Thoracic Kyphosis Angle (y4)': [-0.202113942, 0.0260799211, 0.000956194272, 0.000809022888, 162.575115],
        'T8-T12-L3 Angle (new)': [0.185880321, 0.188846675, -0.00180326046, -0.00245368196, 174.338503] ,

        'Lumbar Lordosis Angle (y5)': [-0.231200126, 0.0320771938, 0.00107482760, -0.00260748300, 180.932086]
    }

    results = {}
    for angle_name, (a1, a2, a3, a4, a5) in coefficients.items():
        y = a1 * x1 + a2 * x2 + a3 * (x1 ** 2) + a4 * (x2 ** 2) + a5
        results[angle_name] = round(y, 2)

    return results

# Utility functions
def vector_angle(v1, v2):
    v1_u = v1 / np.linalg.norm(v1)
    v2_u = v2 / np.linalg.norm(v2)
    angle = np.arccos(np.clip(np.dot(v1_u, v2_u), -1.0, 1.0))
    return np.degrees(angle) - 90

def to_3d(landmarks, idx, w, h):
    pt = landmarks[idx]
    return np.array([pt.x * w, pt.y * h, pt.z * w])

def get_face_width_px(bbox, image_width):
    return bbox.width * image_width

def generate_frames():
    global latest_data

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        detection_results = mp_face_detection.process(rgb)
        if detection_results.detections:
            for detection in detection_results.detections:
                bbox = detection.location_data.relative_bounding_box
                face_width_px = get_face_width_px(bbox, w)

                if face_width_px > 0:
                    distance = (FOCAL_LENGTH * REAL_WIDTH) / face_width_px
                    with lock:
                        latest_data["distance"] = round(distance, 2)

                    x1 = int(bbox.xmin * w)
                    y1 = int(bbox.ymin * h)
                    x2 = int((bbox.xmin + bbox.width) * w)
                    y2 = int((bbox.ymin + bbox.height) * h)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(frame, f"Distance: {distance:.2f} cm", (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

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

            if latest_data["distance"] is not None:
                angles = compute_posture_angles(latest_data["distance"], latest_data["pitch"])
                with lock:
                    latest_data["posture_angles"] = angles

            # Draw pitch
            cv2.putText(frame, f"Pitch: {pitch_angle:.2f} deg", (30, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
            cv2.line(frame, (int(left_eye[0]), int(left_eye[1])), (int(right_eye[0]), int(right_eye[1])), (0, 255, 255), 2)

        # Draw posture angles
        y_offset = 70
        with lock:
            for name, value in latest_data["posture_angles"].items():
                cv2.putText(frame, f"{name}: {value:.2f}°", (30, y_offset),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 200, 255), 1)
                y_offset += 20

        # Display frame and yield
        _, buffer = cv2.imencode(".jpg", frame)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

@app.get("/video/")
async def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/posture/")
async def get_posture():
    with lock:
        return JSONResponse(content={
            "distance": latest_data["distance"],
            "pitch": latest_data["pitch"],
            "posture_angles": latest_data["posture_angles"]
        })

if __name__ == "__main__":
    import uvicorn
    import threading

    def run_server():
        uvicorn.run(app, host="127.0.0.1", port=8000)

    threading.Thread(target=run_server, daemon=True).start()

    # Keep OpenCV window open for debugging (optional)
    for _ in generate_frames():
        pass
    cv2.destroyAllWindows()
