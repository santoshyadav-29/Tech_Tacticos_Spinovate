# 🏗️ System Architecture & Flow

## Complete System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SPINOVATE SYSTEM                                  │
│                     Personalized Posture Monitoring                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐          ┌──────────────────────────────────────┐
│       FRONTEND           │          │            BACKEND                    │
│   (Next.js 15 + React)   │◄────────►│      (FastAPI + Python)              │
└──────────────────────────┘          └──────────────────────────────────────┘
           │                                          │
           │                                          │
    ┌──────▼──────┐                          ┌───────▼────────┐
    │   Browser   │                          │  WebSocket     │
    │   Webcam    │                          │  Server        │
    └──────┬──────┘                          └───────┬────────┘
           │                                          │
           │ Capture Frames                           │
           │ (5 FPS)                                  │
           │                                          │
           ▼                                          ▼
    ┌─────────────────┐                    ┌──────────────────┐
    │ WebSocket       │─────────────────►  │ Frame Processor  │
    │ Connection      │                    │ (MediaPipe +     │
    │                 │◄─────────────────  │  OpenCV)         │
    └─────────────────┘                    └──────────────────┘
           │                                          │
           │                                          │
           ▼                                          ▼
    ┌─────────────────┐                    ┌──────────────────┐
    │ UI Components   │                    │ Calibration      │
    │ - Posture Score │                    │ Service          │
    │ - Blink Rate    │                    │ - Store Data     │
    │ - Alerts        │                    │ - Calculate      │
    │ - Session Info  │                    │   Thresholds     │
    └─────────────────┘                    └──────────────────┘
```

---

## Detailed Component Flow

### 1. Calibration Flow

```
USER ACTIONS                  FRONTEND                    BACKEND
──────────────               ──────────                  ─────────

Visit app
    │
    ▼
Generate/Load user_id ───────►  localStorage
    │
    ▼
Check calibration status ─────►  GET /calibration/status/{user_id}
    │                                       │
    ▼                                       ▼
is_calibrated?                         Check UserThresholds
    │
    ├─ NO → Show banner
    │        "Calibrate Now"
    │           │
    │           ▼
    │   Click button ───────────►  Navigate to /calibration
    │                                      │
    │                                      ▼
    │                            POST /calibration/start/{user_id}
    │                                      │
    │                                      ▼
    │                              Return 3 scenarios:
    │                              - good_posture
    │                              - neutral
    │                              - looking_down
    │                                      │
    │           ┌──────────────────────────┘
    │           │
    │           ▼
    │   SCENARIO LOOP (3 times):
    │   ┌─────────────────────────────────────────────┐
    │   │ 1. Display instructions                     │
    │   │ 2. User positions body                      │
    │   │ 3. Click "Start Capture"                    │
    │   │ 4. Countdown: 3...2...1                     │
    │   │ 5. Capture webcam frame                     │
    │   │    - Convert to base64                      │
    │   │ 6. Send via WebSocket ──────────────────►   │
    │   │                              Process frame  │
    │   │                              Get: pitch,    │
    │   │                                    distance,│
    │   │                                    ear      │
    │   │    ◄─────────────────────────────┘          │
    │   │ 7. POST /calibration/capture/{user}/{scen}  │
    │   │    Body: {pitch, distance, ear} ──────────► │
    │   │                              Store in       │
    │   │                              calibration_   │
    │   │                              scenarios[]    │
    │   │    ◄────────────────────────────┘           │
    │   │ 8. Auto-advance to next scenario            │
    │   └─────────────────────────────────────────────┘
    │           │
    │           ▼
    │   All 3 scenarios complete
    │           │
    │           ▼
    │   POST /calibration/complete/{user_id} ────────►
    │                                   Calculate:
    │                                   - pitch_threshold
    │                                   - distance_min/max
    │                                   - ear_threshold
    │                                          │
    │           ◄───────────────────────────────
    │   Receive: {thresholds: {...}}
    │           │
    │           ▼
    │   Set localStorage:
    │   is_calibrated = "true"
    │           │
    │           ▼
    │   Show success screen
    │   "Calibration Complete! ✓"
    │           │
    │           ▼
    │   Navigate to dashboard
    │
    └─► YES → Load thresholds ─────────► GET /calibration/thresholds/{user_id}
              │                                      │
              ▼                                      ▼
        Start monitoring                    Return UserThresholds
```

---

### 2. Real-Time Monitoring Flow

```
FRONTEND                              BACKEND
─────────                            ────────

Initialize webcam
    │
    ▼
navigator.mediaDevices.getUserMedia()
    │
    ▼
videoRef.srcObject = stream
    │
    ▼
Connect WebSocket ──────────────────► Accept connection
ws://localhost:8000/ws/video              │
    │                                      ▼
    │                              Create WebSocketVideoProcessor
    │                                      │
    ▼                                      │
Start interval (200ms)                     │
    │                                      │
    │                                      │
┌───▼────────────────────────────┐         │
│ PROCESSING LOOP (Every 200ms)  │         │
├────────────────────────────────┤         │
│                                │         │
│ 1. Draw video to canvas        │         │
│ 2. Convert to base64 JPEG      │         │
│ 3. Create message:             │         │
│    {                           │         │
│      user_id: "user_123",      │         │
│      frame: "base64...",       │         │
│      timestamp: 1234567890     │         │
│    }                           │         │
│ 4. Send via WebSocket ─────────┼────────►│
│                                │          │
│                                │          ▼
│                                │   Receive frame
│                                │          │
│                                │          ▼
│                                │   Decode base64 → numpy array
│                                │          │
│                                │          ▼
│                                │   Convert BGR → RGB
│                                │          │
│                                │          ▼
│                                │   GET user thresholds
│                                │   calibration_service.get_user_thresholds(user_id)
│                                │          │
│                                │          ▼
│                                │   PROCESS FRAME:
│                                │   ┌──────────────────────────┐
│                                │   │ MediaPipe FaceMesh       │
│                                │   │ - Detect 468 landmarks   │
│                                │   │ - Calculate pitch angle  │
│                                │   │ - Calculate EAR (eyes)   │
│                                │   │ - Calculate MAR (mouth)  │
│                                │   │ - Calculate yaw angle    │
│                                │   └────────┬─────────────────┘
│                                │            │
│                                │            ▼
│                                │   ┌──────────────────────────┐
│                                │   │ Face Detection           │
│                                │   │ - Get face bbox          │
│                                │   │ - Calculate distance     │
│                                │   │ - Calculate brightness   │
│                                │   └────────┬─────────────────┘
│                                │            │
│                                │            ▼
│                                │   ┌──────────────────────────┐
│                                │   │ Posture Angles           │
│                                │   │ - Cervical spine         │
│                                │   │ - T1 slope               │
│                                │   │ - Thoracic kyphosis      │
│                                │   │ - Lumbar lordosis        │
│                                │   └────────┬─────────────────┘
│                                │            │
│                                │            ▼
│                                │   CALCULATE SCORES:
│                                │   ┌──────────────────────────┐
│                                │   │ neck_score = f(pitch,    │
│                                │   │   user.pitch_threshold)  │
│                                │   │                          │
│                                │   │ distance_score = f(dist, │
│                                │   │   user.dist_min/max)     │
│                                │   │                          │
│                                │   │ overall = avg(neck, dist)│
│                                │   │                          │
│                                │   │ status = good|warn|poor  │
│                                │   └────────┬─────────────────┘
│                                │            │
│                                │            ▼
│                                │   DETECT BLINKS:
│                                │   ┌──────────────────────────┐
│                                │   │ if EAR < user.ear_thresh:│
│                                │   │   blink_detected = true  │
│                                │   │   blink_count += 1       │
│                                │   │ calculate blink_rate     │
│                                │   └────────┬─────────────────┘
│                                │            │
│                                │            ▼
│                                │   GENERATE ALERTS:
│                                │   ┌──────────────────────────┐
│                                │   │ if overall < 50:         │
│                                │   │   alert = "Poor posture" │
│                                │   │ if drowsiness:           │
│                                │   │   alert = "Take break"   │
│                                │   │ if blink_rate < 10:      │
│                                │   │   alert = "Blink more"   │
│                                │   └────────┬─────────────────┘
│                                │            │
│                                │            ▼
│                                │   CREATE RESPONSE:
│                                │   {
│                                │     posture_score: {
│                                │       overall: 85,
│                                │       neck: 90,
│                                │       distance: 80,
│                                │       status: "good"
│                                │     },
│                                │     blink_detection: {
│                                │       blink_detected: false,
│                                │       blink_count: 45,
│                                │       blink_rate: 15.2,
│                                │       ear_value: 0.285
│                                │     },
│                                │     alert: null,
│                                │     timestamp: 1234567890,
│                                │     posture_angles: {...}
│                                │   }
│                                │            │
│ 5. Receive response ◄──────────┼────────────┘
│    {posture_score, blinks,...} │
│                                │
│ 6. Update UI:                  │
│    - Overall score: 85%        │
│    - Status: GOOD (green)      │
│    - Blink rate: 15.2/min      │
│    - Progress bar              │
│                                │
│ 7. Display alert if present    │
│    - Yellow banner at bottom   │
│    - "Poor posture detected"   │
│                                │
│ 8. Wait 200ms                  │
│    └──────► Repeat             │
└────────────────────────────────┘
```

---

## 3. Data Storage Architecture

```
FRONTEND (Browser)              BACKEND (Server Memory)
──────────────────              ────────────────────────

localStorage:                   calibration_service.user_thresholds:
├─ user_id                      {
│  "user_1234567890_abc123"       "user_1234567890_abc123": {
│                                   user_id: "user_...",
├─ is_calibrated                    pitch_threshold: 12.0,
│  "true"                           distance_min: 40.0,
│                                   distance_max: 60.0,
│                                   ear_threshold: 0.255,
                                    mar_threshold: 0.75,
                                    calibrated: true,
                                    calibration_scenarios: {
                                      "good_posture": {
                                        pitch_angle: 8.5,
                                        distance: 50.0,
                                        ear: 0.30,
                                        timestamp: "..."
                                      },
                                      "neutral": {...},
                                      "looking_down": {...}
                                    }
                                  }
                                }
```

**Note**: Backend storage is currently **in-memory**. Data is lost on server restart. Production will use PostgreSQL/MongoDB.

---

## 4. Navigation Structure

```
Spinovate App
│
├── Landing Page (/)
│   └── [Get Started] → /dashboard/posture-simple
│
├── Dashboard (/dashboard)
│   ├── Overview
│   └── Quick stats
│
├── Scan (/dashboard/posture)
│   ├── Original full-featured monitoring
│   └── Server-side camera (legacy)
│
├── Simple Monitor (/dashboard/posture-simple) ★ NEW ★
│   ├── Clean, minimal UI
│   ├── Client-side webcam
│   ├── Real-time posture score
│   ├── Blink detection
│   └── Calibration banner (if not calibrated)
│
├── Calibration (/dashboard/calibration) ★ NEW ★
│   ├── 3-scenario guided flow
│   ├── Instructions per scenario
│   ├── Countdown timer
│   ├── Progress tracking
│   └── Success confirmation
│
├── Exercise (/dashboard/excercise)
│   └── Posture correction exercises
│
└── Guide (/dashboard/guide)
    └── User documentation
```

---

## 5. Key Technologies

### Frontend Stack
```
Next.js 15
├── App Router
├── React 19
├── TypeScript
├── Tailwind CSS 4
├── Lucide React (icons)
├── Framer Motion (animations)
└── Axios (HTTP)

WebSocket Client
├── Native WebSocket API
├── Base64 encoding
├── Canvas API (frame capture)
└── MediaDevices API (webcam)
```

### Backend Stack
```
FastAPI
├── Async/await
├── WebSocket support
├── Pydantic validation
├── CORS middleware
└── Uvicorn server

Computer Vision
├── OpenCV (cv2)
├── MediaPipe (face mesh)
├── NumPy (calculations)
└── Python 3.11+

Services
├── DrowsinessDetectionService
├── FaceDetectionService
├── PostureAngles
├── CalibrationService
└── WebSocketVideoProcessor
```

---

## 6. Performance Metrics

```
Frontend:
├── Frame Rate: 5 FPS (200ms interval)
├── Video Resolution: 640x480
├── JPEG Quality: 80%
├── Base64 Overhead: ~33% size increase
└── WebSocket Latency: <50ms (local)

Backend:
├── MediaPipe Processing: ~50-100ms/frame
├── Face Detection: ~20ms
├── Angle Calculations: ~10ms
├── Total Processing: ~100-150ms/frame
└── WebSocket Send: <10ms

End-to-End:
└── Frame capture → Display result: ~150-200ms
    (Acceptable for real-time monitoring)
```

---

## 7. Error Handling

```
Frontend Errors:
├── No webcam → "Grant camera permissions"
├── WebSocket fail → "Cannot connect to backend"
├── No face detected → "No face detected in frame"
└── Calibration fail → "Failed to capture data"

Backend Errors:
├── Invalid frame → Send error JSON
├── No face in frame → Return status: "no_face"
├── Processing error → Log and send generic error
└── User not found → Return default thresholds
```

---

## 8. Future Architecture (Production)

```
┌─────────────┐
│   Frontend  │
│   (Vercel)  │
└──────┬──────┘
       │
       │ HTTPS/WSS
       │
┌──────▼──────────────────┐
│   Load Balancer         │
│   (NGINX/AWS ALB)       │
└──────┬──────────────────┘
       │
       ├──────────┬──────────┐
       │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌───▼────┐
  │Backend │ │Backend │ │Backend │
  │Server 1│ │Server 2│ │Server 3│
  └────┬───┘ └───┬────┘ └───┬────┘
       │         │          │
       └─────────┼──────────┘
                 │
        ┌────────▼─────────┐
        │  Redis Pub/Sub   │
        │  (WebSocket Sync)│
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │   PostgreSQL     │
        │   - UserThresholds│
        │   - Sessions     │
        │   - History      │
        └──────────────────┘
```

---

This comprehensive architecture ensures **scalable, accurate, and personalized** posture monitoring! 🚀
