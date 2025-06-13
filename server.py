import cv2
import mediapipe as mp
import numpy as np
import math

# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False,
                                  max_num_faces=1,
                                  refine_landmarks=True,
                                  min_detection_confidence=0.5,
                                  min_tracking_confidence=0.5)

# Drawing utils
mp_drawing = mp.solutions.drawing_utils

# Eye and mouth landmark indices for MediaPipe Face Mesh
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
MOUTH = [61, 81, 13, 311, 308, 402, 14, 178]

def euclidean(p1, p2):
    return np.linalg.norm(np.array(p1) - np.array(p2))

def aspect_ratio(landmarks, indices):
    top = euclidean(landmarks[indices[1]], landmarks[indices[5]]) + euclidean(landmarks[indices[2]], landmarks[indices[4]])
    bottom = 2 * euclidean(landmarks[indices[0]], landmarks[indices[3]])
    return top / bottom if bottom != 0 else 0

# Thresholds
EAR_THRESH = 0.25
MAR_THRESH = 0.75
EAR_CONSEC_FRAMES = 20

# State counters
eye_counter = 0
yawn_counter = 0

# Start webcam
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break
    h, w = frame.shape[:2]
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = face_mesh.process(rgb)

    if result.multi_face_landmarks:
        for face_landmarks in result.multi_face_landmarks:
            landmarks = [(int(pt.x * w), int(pt.y * h)) for pt in face_landmarks.landmark]

            # EAR calculation
            left_ear = aspect_ratio(landmarks, LEFT_EYE)
            right_ear = aspect_ratio(landmarks, RIGHT_EYE)
            ear = (left_ear + right_ear) / 2.0

            # MAR (mouth aspect ratio)
            mar = aspect_ratio(landmarks, MOUTH)

            # Detect fatigue
            if ear < EAR_THRESH:
                eye_counter += 1
            else:
                eye_counter = 0

            if mar > MAR_THRESH:
                yawn_counter += 1
            else:
                yawn_counter = 0

            if eye_counter >= EAR_CONSEC_FRAMES:
                cv2.putText(frame, "DROWSINESS ALERT!", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)

            if yawn_counter > 15:
                cv2.putText(frame, "YAWNING ALERT!", (10, 60),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)

            # Show EAR/MAR values
            cv2.putText(frame, f"EAR: {ear:.2f}", (450, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)
            cv2.putText(frame, f"MAR: {mar:.2f}", (450, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)

            # Optional: Draw facial landmarks
            mp_drawing.draw_landmarks(
                frame, face_landmarks, mp_face_mesh.FACEMESH_TESSELATION,
                landmark_drawing_spec=None,
                connection_drawing_spec=mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=1, circle_radius=1)
            )

    cv2.imshow("Fatigue Detection", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
