# Calibration & WebSocket System Implementation

## Overview
This document describes the fixes and improvements made to the Spinovate posture monitoring system to properly utilize calibrated thresholds and implement WebSocket-based video processing.

## Problems Solved

### 1. Calibrated Thresholds Not Being Used Correctly
**Problem:** The calibrated thresholds were being calculated but not applied correctly in the posture score calculation. The system was showing declining scores even within acceptable ranges, rather than only showing negative scores when thresholds were exceeded.

**Solution:** Updated the `calculate_posture_score` method in `backend/app/api/routes/websocket.py` to:
- Show 100% score when measurements are within calibrated thresholds
- Only deduct points when thresholds are exceeded
- Apply proportional penalties based on how much the threshold is exceeded

**Key Changes:**
```python
# Before: Score declined even within threshold
if pitch_deviation > thresholds.pitch_threshold:
    neck_score = max(0, 100 - (pitch_deviation / thresholds.pitch_threshold * 100))
else:
    neck_score = 100 - (pitch_deviation / thresholds.pitch_threshold * 20)  # Still loses points!

# After: Perfect score within threshold
if pitch_deviation <= thresholds.pitch_threshold:
    neck_score = 100.0  # Perfect!
else:
    # Only lose points when exceeding threshold
    excess = pitch_deviation - thresholds.pitch_threshold
    max_excess = thresholds.pitch_threshold
    penalty = min(100, (excess / max_excess) * 100)
    neck_score = max(0, 100 - penalty)
```

### 2. Frontend Using Backend Camera Instead of WebSocket
**Problem:** The system was using the backend's camera directly via `/video/stream` endpoint, which meant:
- Users couldn't use their own webcam
- System only worked if backend had camera access
- Not suitable for web deployment

**Solution:** Modified `frontend/app/dashboard/posture-simple/page.tsx` to use the `WebSocketVideoCapture` component:
- Captures video from user's browser webcam
- Sends frames to backend via WebSocket
- Receives processed data back in real-time
- More scalable and web-friendly architecture

## How the System Works Now

### Calibration Flow

1. **User Starts Calibration** (`/dashboard/calibration`)
   - System initializes webcam
   - User completes 3 scenarios:
     - Good Posture (ideal position)
     - Neutral Posture (comfortable working position)
     - Looking Down (maximum acceptable tilt)

2. **Data Capture** (For each scenario)
   - Frontend captures frame from webcam
   - Sends to backend via WebSocket at `/ws/video`
   - Backend processes frame and returns metrics (pitch_angle, distance, ear)
   - Frontend sends metrics to `/calibration/capture/{user_id}/{scenario}`
   - Backend stores calibration data

3. **Threshold Calculation** (`/calibration/complete/{user_id}`)
   - Called after all scenarios are captured
   - `CalibrationService.calculate_personalized_thresholds()` computes:
     - `pitch_threshold`: Based on good_posture angle × 1.5
     - `distance_min/max`: Good posture distance ± 10cm
     - `ear_threshold`: Good posture EAR × 0.85
   - Thresholds stored in memory (user_id as key)

### Monitoring Flow

1. **User Starts Monitoring** (`/dashboard/posture-simple`)
   - Checks calibration status from `/calibration/status/{user_id}`
   - Shows calibration banner if not calibrated
   - Starts WebSocket connection to `/ws/video`
   - Activates webcam

2. **Real-Time Processing**
   - Frontend captures frames at 5 FPS (every 200ms)
   - Sends frame to backend via WebSocket as base64 JPEG
   - Backend processes each frame:
     ```python
     1. Decode base64 → numpy array
     2. Get user thresholds from CalibrationService
     3. Process with DrowsinessDetectionService (pitch, EAR, MAR, etc.)
     4. Calculate posture score using calibrated thresholds
     5. Return MinimalDashboardResponse as JSON
     ```

3. **Score Display**
   - Frontend receives dashboard data via WebSocket
   - Displays posture score (0-100%)
   - Shows status: "good" (90+), "warning" (60-90), "poor" (<60)
   - Updates in real-time

## Calibrated vs Default Thresholds

### Default Thresholds (Uncalibrated Users)
```python
pitch_threshold = 15.0 degrees
distance_min = 40.0 cm
distance_max = 60.0 cm
ear_threshold = 0.23
```

### Calibrated Thresholds (Example)
```python
# User with smaller frame sitting closer
pitch_threshold = 8.5 degrees  # Based on their good posture
distance_min = 35.0 cm         # Closer than default
distance_max = 45.0 cm         # Personalized range
ear_threshold = 0.21           # Their eye shape
```

## New Posture Score Logic

### Neck Score
- **Within Threshold**: 100% (perfect)
- **Exceeding Threshold**: Linear decline from 100% to 0% as deviation reaches 2x threshold
- Example:
  - Threshold = 10°, Current = 8° → Score = 100%
  - Threshold = 10°, Current = 15° → Score = 50%
  - Threshold = 10°, Current = 20° → Score = 0%

### Distance Score
- **Within Range**: 100% (perfect)
- **Too Close**: Linear decline from 100% to 0% between min and 50% of min
- **Too Far**: Linear decline from 100% to 0% between max and 150% of max

### Overall Score
- Average of neck and distance scores
- Status determined by overall:
  - ≥90% = "good" (green)
  - 60-89% = "warning" (yellow)
  - <60% = "poor" (red)

## API Endpoints

### Calibration Endpoints
- `POST /calibration/start/{user_id}` - Initialize calibration session
- `POST /calibration/capture/{user_id}/{scenario}` - Capture scenario data
- `POST /calibration/complete/{user_id}` - Calculate thresholds
- `GET /calibration/status/{user_id}` - Get calibration status
- `GET /calibration/thresholds/{user_id}` - Get user thresholds
- `DELETE /calibration/reset/{user_id}` - Reset calibration

### WebSocket Endpoint
- `WS /ws/video` - Real-time video processing
  - Receives: `{user_id, frame (base64), timestamp}`
  - Sends: `MinimalDashboardResponse` with scores and metrics

### Legacy Endpoints (Still Available)
- `GET /video/stream?user_id={user_id}` - Backend camera stream (deprecated for web use)
- `GET /video/metrics` - Current metrics

## Files Modified

### Backend
1. `backend/app/api/routes/websocket.py`
   - Fixed `calculate_posture_score()` to properly use calibrated thresholds
   - Added logging for calibration status
   - Updated score calculation logic

2. `backend/app/services/calibration_service.py`
   - Already had proper threshold calculation
   - No changes needed

### Frontend
1. `frontend/app/dashboard/posture-simple/page.tsx`
   - Replaced backend camera stream with WebSocketVideoCapture component
   - Added calibration status check from backend
   - Added camera error handling
   - Updated UI to show calibration guidance

2. `frontend/app/dashboard/calibration/page.tsx`
   - Already working correctly
   - No changes needed

3. `frontend/components/WebSocketVideoCapture.tsx`
   - Already working correctly
   - No changes needed

## Testing the System

### 1. Test Calibration
```bash
# Start backend
cd backend
python -m app.main

# Start frontend
cd frontend
npm run dev
```

1. Go to `http://localhost:3000/dashboard/calibration`
2. Complete all 3 scenarios
3. Verify thresholds are calculated (check backend logs)

### 2. Test Monitoring
1. Go to `http://localhost:3000/dashboard/posture-simple`
2. Click "Start Monitoring"
3. Grant webcam permission
4. Verify:
   - Score shows 100% when posture is good
   - Score only decreases when exceeding thresholds
   - Calibration banner disappears after calibrating

### 3. Verify Threshold Application
Check backend logs for:
```
Using calibrated thresholds for user_xxx: pitch=X.X, distance_min=X.X, distance_max=X.X
DEBUG Neck: pitch_angle=X.X, deviation=X.X, threshold=X.X
```

## Benefits

### For Users
1. **Personalized Experience**: System adapts to individual body measurements
2. **Accurate Tracking**: No false alerts from generic thresholds
3. **Better Motivation**: Clear feedback when posture is actually good

### For System
1. **Scalable Architecture**: WebSocket allows multiple concurrent users
2. **Web-Ready**: Works in any browser with webcam
3. **No Backend Camera Required**: Each user uses their own camera

## Future Improvements

1. **Persistent Storage**: Store thresholds in database instead of memory
2. **Threshold Adjustment**: Allow users to fine-tune thresholds after calibration
3. **Multi-Camera Support**: Handle different cameras for same user
4. **Calibration Expiry**: Suggest re-calibration after X days
5. **Posture Angle Thresholds**: Also calibrate the 6 posture angles (currently hardcoded)

## Troubleshooting

### Score Always Shows Low
- **Cause**: User not calibrated or thresholds too strict
- **Fix**: Complete calibration or reset and recalibrate

### WebSocket Connection Failed
- **Cause**: Backend not running or CORS issue
- **Fix**: Ensure backend is running on port 8000

### Camera Not Working
- **Cause**: Browser permissions or HTTPS required
- **Fix**: Grant camera permission or use HTTPS in production

### Thresholds Not Applied
- **Cause**: User ID mismatch
- **Fix**: Check localStorage `user_id` matches backend logs

## Summary

The system now properly:
✅ Calculates personalized thresholds from calibration data
✅ Only shows negative scores when thresholds are exceeded
✅ Uses WebSocket for client camera instead of backend camera
✅ Provides real-time feedback based on calibrated measurements
✅ Guides uncalibrated users to complete calibration
✅ Maintains calibration state across sessions
