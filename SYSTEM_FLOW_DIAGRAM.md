# System Flow Diagram

## 🔄 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                             │
└─────────────────────────────────────────────────────────────────┘

Step 1: CALIBRATION (One-time setup)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌──────────────┐
│   Browser    │  Navigate to /dashboard/calibration
│   (Client)   │
└──────┬───────┘
       │ 1. Request calibration start
       ▼
┌──────────────────┐
│  POST /calibration/start/{user_id}
│  Backend API     │
└──────┬───────────┘
       │ 2. Returns scenarios to complete
       ▼
┌──────────────┐
│   Browser    │  Shows 3 scenarios:
│   (Client)   │  - Good Posture
│              │  - Neutral Posture
│              │  - Looking Down
└──────┬───────┘
       │ 3. For each scenario...
       │
       ├─── Scenario 1: Good Posture ────────────┐
       │                                          │
       │  ┌─────────────────────┐                │
       │  │ Webcam captures     │                │
       │  │ user in good        │                │
       │  │ posture (3 seconds) │                │
       │  └──────────┬──────────┘                │
       │             │ Frame (base64 JPEG)       │
       │             ▼                            │
       │  ┌─────────────────────────┐            │
       │  │ WS /ws/video            │            │
       │  │ WebSocket endpoint      │            │
       │  │ Processes frame         │            │
       │  └──────────┬──────────────┘            │
       │             │ Returns:                   │
       │             │ - pitch_angle: 8.5°       │
       │             │ - distance: 45cm          │
       │             │ - ear: 0.28               │
       │             ▼                            │
       │  ┌─────────────────────────────────┐    │
       │  │ POST /calibration/capture/      │    │
       │  │      {user_id}/good_posture     │    │
       │  │                                 │    │
       │  │ Stores calibration data         │    │
       │  └─────────────────────────────────┘    │
       │                                          │
       ├─── Scenario 2: Neutral Posture ─────────┤
       │     (Same process...)                    │
       │                                          │
       └─── Scenario 3: Looking Down ────────────┘

       │ 4. After all scenarios complete
       ▼
┌──────────────────────────────────┐
│ POST /calibration/complete/      │
│      {user_id}                   │
│                                  │
│ CalibrationService.calculate_    │
│ personalized_thresholds()        │
│                                  │
│ Calculations:                    │
│ ┌────────────────────────────┐  │
│ │ pitch_threshold =          │  │
│ │   good_posture.pitch × 1.5 │  │
│ │   = 8.5° × 1.5 = 12.75°   │  │
│ │                            │  │
│ │ distance_min =             │  │
│ │   good_posture.distance-10 │  │
│ │   = 45 - 10 = 35cm        │  │
│ │                            │  │
│ │ distance_max =             │  │
│ │   good_posture.distance+10 │  │
│ │   = 45 + 10 = 55cm        │  │
│ │                            │  │
│ │ ear_threshold =            │  │
│ │   good_posture.ear × 0.85  │  │
│ │   = 0.28 × 0.85 = 0.238   │  │
│ └────────────────────────────┘  │
│                                  │
│ Stored in memory:                │
│ user_thresholds[user_id] =       │
│   UserThresholds(...)            │
└──────────────────────────────────┘

       │ 5. Calibration complete!
       ▼
     ✅ User is now calibrated



Step 2: MONITORING (Real-time tracking)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌──────────────┐
│   Browser    │  Navigate to /dashboard/posture-simple
│   (Client)   │
└──────┬───────┘
       │ 1. Check calibration status
       ▼
┌──────────────────────────────────┐
│ GET /calibration/status/{user_id}│
└──────┬───────────────────────────┘
       │ Returns: { calibrated: true, ... }
       ▼
┌──────────────┐
│   Browser    │  Shows "Start Monitoring" button
│   (Client)   │
└──────┬───────┘
       │ 2. User clicks "Start Monitoring"
       │ 3. Activates webcam
       │ 4. Opens WebSocket connection
       ▼
┌─────────────────────────────────────────────────────┐
│            REAL-TIME MONITORING LOOP                 │
│  (Every 200ms = 5 frames per second)                │
│                                                      │
│  ┌───────────────┐                                  │
│  │  Webcam       │                                  │
│  │  Captures     │                                  │
│  │  Frame        │                                  │
│  └───────┬───────┘                                  │
│          │ base64 JPEG (60% quality)                │
│          ▼                                           │
│  ┌───────────────────────────────────┐              │
│  │ WebSocket Message                 │              │
│  │ {                                 │              │
│  │   user_id: "user_123...",        │              │
│  │   frame: "data:image/jpeg;...",  │              │
│  │   timestamp: 1234567890.123      │              │
│  │ }                                 │              │
│  └───────┬───────────────────────────┘              │
│          │ Sent via WebSocket                       │
│          ▼                                           │
│  ┌─────────────────────────────────────────┐        │
│  │ WS /ws/video (Backend)                  │        │
│  │                                         │        │
│  │ 1. Decode base64 → numpy array         │        │
│  │ 2. Get user thresholds:                │        │
│  │    calibration_service.get_user_       │        │
│  │    thresholds(user_id)                 │        │
│  │    → pitch_threshold: 12.75°           │        │
│  │    → distance_min: 35cm                │        │
│  │    → distance_max: 55cm                │        │
│  │                                         │        │
│  │ 3. Process frame:                      │        │
│  │    DrowsinessDetectionService          │        │
│  │    .process_frame()                    │        │
│  │    → pitch_angle: 10.2°                │        │
│  │    → ear: 0.26                         │        │
│  │    → mar: 0.45                         │        │
│  │    → yaw: 2.3°                         │        │
│  │                                         │        │
│  │ 4. Get distance:                       │        │
│  │    FaceDetectionService                │        │
│  │    .detect_face_and_measure_distance() │        │
│  │    → distance: 42cm                    │        │
│  │                                         │        │
│  │ 5. Calculate posture score:            │        │
│  │    ┌─────────────────────────────────┐ │        │
│  │    │ NECK SCORE:                     │ │        │
│  │    │ pitch_deviation = |10.2°| = 10.2│ │        │
│  │    │ threshold = 12.75°              │ │        │
│  │    │ 10.2° ≤ 12.75° ✅              │ │        │
│  │    │ → neck_score = 100%             │ │        │
│  │    │                                 │ │        │
│  │    │ DISTANCE SCORE:                 │ │        │
│  │    │ distance = 42cm                 │ │        │
│  │    │ min = 35cm, max = 55cm          │ │        │
│  │    │ 35 ≤ 42 ≤ 55 ✅               │ │        │
│  │    │ → distance_score = 100%         │ │        │
│  │    │                                 │ │        │
│  │    │ OVERALL:                        │ │        │
│  │    │ (100 + 100) / 2 = 100%         │ │        │
│  │    │ status = "good" 🟢             │ │        │
│  │    └─────────────────────────────────┘ │        │
│  │                                         │        │
│  │ 6. Return response:                    │        │
│  │    MinimalDashboardResponse            │        │
│  └─────────┬───────────────────────────────┘        │
│            │ JSON response via WebSocket            │
│            ▼                                         │
│  ┌───────────────────────────────────┐              │
│  │ Response:                         │              │
│  │ {                                 │              │
│  │   posture_score: {                │              │
│  │     overall: 100.0,               │              │
│  │     neck: 100.0,                  │              │
│  │     distance: 100.0,              │              │
│  │     status: "good"                │              │
│  │   },                              │              │
│  │   blink_detection: { ... },       │              │
│  │   alert: null,                    │              │
│  │   timestamp: 1234567890.123       │              │
│  │ }                                 │              │
│  └───────┬───────────────────────────┘              │
│          │                                           │
│          ▼                                           │
│  ┌───────────────────────────────────┐              │
│  │ Browser Updates UI:               │              │
│  │                                   │              │
│  │ ┌─────────────────────────────┐   │              │
│  │ │ Posture Score: 100% 🟢      │   │              │
│  │ │ Status: Good                 │   │              │
│  │ │ Blink Rate: 15/min          │   │              │
│  │ └─────────────────────────────┘   │              │
│  └───────────────────────────────────┘              │
│                                                      │
│  ⟲ Loop repeats every 200ms...                     │
└─────────────────────────────────────────────────────┘



┌─────────────────────────────────────────────────────────────────┐
│              COMPARISON: OLD vs NEW BEHAVIOR                     │
└─────────────────────────────────────────────────────────────────┘

Scenario: User with calibrated threshold of 12°

┌─────────────────────┬─────────────────────┬─────────────────────┐
│   Current Pitch     │   OLD BEHAVIOR      │   NEW BEHAVIOR      │
├─────────────────────┼─────────────────────┼─────────────────────┤
│     5° (great)      │   87% (wtf?!)       │   100% ✅           │
│     8° (good)       │   73% (too low)     │   100% ✅           │
│    10° (good)       │   67% (false warn)  │   100% ✅           │
│    12° (at limit)   │   60% (at threshold)│   100% ✅           │
│    15° (exceeding)  │   40%               │    80% ⚠️           │
│    18° (bad)        │   20%               │    50% ⚠️           │
│    24° (very bad)   │    0%               │     0% ❌           │
└─────────────────────┴─────────────────────┴─────────────────────┘

OLD: Scores constantly declining, even with good posture
NEW: 100% score within threshold, only drops when exceeding


┌─────────────────────────────────────────────────────────────────┐
│              WHY THIS MATTERS: EXAMPLE USERS                     │
└─────────────────────────────────────────────────────────────────┘

User A: Tall person (180cm)
━━━━━━━━━━━━━━━━━━━━━━━━
Monitor positioned low → Natural head tilt = 12°
After calibration → pitch_threshold = 18°

Working posture: 15° → Score = 100% ✅
Without calibration → Would show 40% ❌ (false alert)

User B: Short person (160cm)
━━━━━━━━━━━━━━━━━━━━━━━━
Monitor positioned high → Natural head tilt = 5°
After calibration → pitch_threshold = 7.5°

Working posture: 10° → Score = 67% ⚠️ (needs adjustment)
Without calibration → Would show 67% but for wrong reason


┌─────────────────────────────────────────────────────────────────┐
│                    DATA STORAGE FLOW                             │
└─────────────────────────────────────────────────────────────────┘

In-Memory Storage (Current Implementation):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────┐
│ CalibrationService                     │
│                                        │
│ user_thresholds = {                    │
│   "user_123...": UserThresholds(       │
│     user_id="user_123...",             │
│     pitch_threshold=12.75,             │
│     distance_min=35.0,                 │
│     distance_max=55.0,                 │
│     ear_threshold=0.238,               │
│     calibrated=True,                   │
│     calibration_scenarios={            │
│       "good_posture": CalibrationData, │
│       "neutral": CalibrationData,      │
│       "looking_down": CalibrationData  │
│     }                                  │
│   ),                                   │
│   "user_456...": UserThresholds(...)   │
│ }                                      │
└────────────────────────────────────────┘
     ⚠️ Data lost on server restart!
     
For Production → Use Database:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────┐
│  PostgreSQL  │  OR  MongoDB  OR  Redis
│  Database    │
│              │
│ Table: user_calibrations
│ ┌──────────────────────────────┐
│ │ user_id (PK)                 │
│ │ pitch_threshold              │
│ │ distance_min                 │
│ │ distance_max                 │
│ │ ear_threshold                │
│ │ calibrated (boolean)         │
│ │ calibration_data (JSON)      │
│ │ created_at (timestamp)       │
│ │ updated_at (timestamp)       │
│ └──────────────────────────────┘
└──────────────┘
     ✅ Data persists across restarts


┌─────────────────────────────────────────────────────────────────┐
│                   KEY TAKEAWAYS                                  │
└─────────────────────────────────────────────────────────────────┘

1. ✅ Calibration creates personalized thresholds
2. ✅ Monitoring uses these thresholds for scoring
3. ✅ 100% score = within YOUR acceptable range
4. ✅ WebSocket = user's camera (not backend camera)
5. ✅ Real-time feedback at 5 FPS
6. ⚠️ Thresholds currently in memory (add database for production)
```
