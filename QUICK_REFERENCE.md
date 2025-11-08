# Quick Reference: Calibration & WebSocket System

## What Changed?

### 🎯 Problem 1: Calibrated Thresholds Not Working Correctly
**Before:** System showed declining scores even when within acceptable range
**After:** System shows 100% score when within calibrated thresholds, only negative when exceeding

### 🎥 Problem 2: Backend Camera Instead of User Camera
**Before:** System used backend's camera via `/video/stream`
**After:** System uses user's browser webcam via WebSocket

---

## Key Concepts

### Calibrated Thresholds = Your Personal "Good Posture"
- **Good Posture Scenario**: Your ideal position → becomes target
- **System Behavior**: 100% score when matching your calibrated posture
- **Alerts**: Only trigger when you exceed YOUR thresholds, not generic ones

### Why This Matters
Different users have different bodies:
- Tall person: Natural head angle might be 12°
- Short person: Natural head angle might be 7°
- Using 15° generic threshold: Short person gets false alerts!
- Using calibrated threshold: Each person gets accurate tracking

---

## How to Use

### Step 1: Calibrate (First Time)
1. Go to `/dashboard/calibration`
2. Complete 3 scenarios (takes ~1 minute):
   - **Good Posture**: Sit upright, back straight, look at camera
   - **Neutral Posture**: Your comfortable working position
   - **Looking Down**: Tilt head down (like looking at keyboard)
3. System calculates YOUR personal thresholds
4. Done! Now monitoring will be personalized

### Step 2: Monitor Your Posture
1. Go to `/dashboard/posture-simple`
2. Click "Start Monitoring"
3. Grant webcam permission
4. System tracks using YOUR calibrated thresholds
5. See real-time scores and alerts

---

## Understanding Scores

### Posture Score (0-100%)
- **100% = Perfect**: You're within your calibrated range ✅
- **90-99% = Great**: Slightly off but still good
- **60-89% = Warning**: Starting to exceed thresholds ⚠️
- **0-59% = Poor**: Significantly exceeding thresholds ❌

### Status Colors
- 🟢 **Green (Good)**: 90%+ - Keep it up!
- 🟡 **Yellow (Warning)**: 60-89% - Adjust slightly
- 🔴 **Red (Poor)**: <60% - Correct posture now

---

## Technical Details

### Calibration Data Stored
For each scenario, we capture:
```json
{
  "pitch_angle": 8.5,    // Head tilt in degrees
  "distance": 45.0,      // Distance from camera in cm
  "ear": 0.28            // Eye Aspect Ratio (for blink detection)
}
```

### Thresholds Calculated
From your calibration data:
```python
pitch_threshold = good_posture_angle × 1.5
distance_min = good_posture_distance - 10cm
distance_max = good_posture_distance + 10cm
ear_threshold = good_posture_ear × 0.85
```

### Example Calculation
Your good posture: pitch = 10°
```
Threshold = 10° × 1.5 = 15°

Your scores:
- pitch = 8°  → 100% (within threshold)
- pitch = 12° → 100% (within threshold)
- pitch = 15° → 100% (at threshold)
- pitch = 18° → 80% (exceeding threshold)
- pitch = 22° → 40% (significantly exceeding)
```

---

## File Locations

### Backend Files
- `backend/app/api/routes/websocket.py` - WebSocket video processing
- `backend/app/api/routes/calibration.py` - Calibration endpoints
- `backend/app/services/calibration_service.py` - Threshold calculation

### Frontend Files
- `frontend/app/dashboard/calibration/page.tsx` - Calibration UI
- `frontend/app/dashboard/posture-simple/page.tsx` - Monitoring UI
- `frontend/components/WebSocketVideoCapture.tsx` - WebSocket camera component

---

## API Endpoints

### Calibration
- `POST /calibration/start/{user_id}` - Start calibration
- `POST /calibration/capture/{user_id}/{scenario}` - Save scenario data
- `POST /calibration/complete/{user_id}` - Calculate thresholds
- `GET /calibration/status/{user_id}` - Check if calibrated

### WebSocket
- `WS /ws/video` - Real-time video processing
  - Send: Frame from webcam (base64 JPEG)
  - Receive: Posture scores and metrics

---

## Troubleshooting

### "Low Score Even with Good Posture"
→ Recalibrate: Your body position might have changed

### "WebSocket Not Connecting"
→ Check backend is running: `python -m app.main` in backend folder

### "Camera Not Working"
→ Grant browser camera permission (check address bar icon)

### "Calibration Banner Always Shows"
→ Complete calibration at `/dashboard/calibration`

---

## Testing Checklist

✅ Complete calibration (all 3 scenarios)
✅ Start monitoring with good posture → Score = 100%
✅ Tilt head forward slightly → Score stays 100%
✅ Tilt head forward a lot → Score decreases
✅ Return to good posture → Score returns to 100%
✅ WebSocket connection indicator shows green
✅ Calibration banner disappears after calibrating

---

## Developer Notes

### In-Memory Storage
Currently thresholds are stored in memory (dict keyed by user_id).
**Production**: Migrate to database (PostgreSQL, MongoDB, etc.)

### User ID Generation
```javascript
// Frontend generates: user_TIMESTAMP_RANDOM
const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
// Stored in localStorage: "user_id"
```

### WebSocket Frame Rate
- Frames sent: 5 FPS (every 200ms)
- Adjustable in `WebSocketVideoCapture.tsx` line 276

### Score Calculation Parameters
Adjustable in `websocket.py`:
- `max_excess`: How far beyond threshold before score = 0
- Status thresholds: 90% (good), 60% (warning)

---

## Next Steps

1. ✅ System now uses calibrated thresholds correctly
2. ✅ Frontend uses WebSocket with user's camera
3. 🔜 Add database for persistent storage
4. 🔜 Add re-calibration reminders
5. 🔜 Calibrate posture angles (currently hardcoded)

---

## Support

Check logs:
- **Backend**: Terminal running `python -m app.main`
- **Frontend**: Browser console (F12)

Look for:
```
Using calibrated thresholds for user_xxx: pitch=X.X, ...
DEBUG Neck: pitch_angle=X.X, deviation=X.X, threshold=X.X
```

This confirms thresholds are being applied!
