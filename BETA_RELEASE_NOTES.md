# Beta Release Updates - Spinovate

## 🎉 New Features Implemented

### 1. Client-Side Webcam Processing ✅
- **WebSocket Integration**: Replaced server-side camera capture with client-side webcam access
- **Real-time Processing**: Video frames are captured in the browser and sent to backend via WebSocket
- **Better Privacy**: Camera never leaves the client device
- **Location**: 
  - Backend: `backend/app/api/routes/websocket.py`
  - Frontend: `frontend/components/WebSocketVideoCapture.tsx`

### 2. Calibration System ✅
- **Personalized Thresholds**: Users can calibrate the system for their unique posture
- **Three Scenarios**:
  - Good Posture: Ideal sitting position
  - Neutral: Natural comfortable position  
  - Looking Down: Maximum acceptable head tilt
- **Smart Threshold Calculation**: Automatically calculates personalized pitch, distance, and EAR thresholds
- **Location**:
  - Backend Service: `backend/app/services/calibration_service.py`
  - Backend API: `backend/app/api/routes/calibration.py`
  - Frontend Page: `frontend/app/dashboard/calibration/page.tsx`

### 3. Simplified Dashboard ✅
- **Minimal Data Display**: Shows only essential metrics
  - Posture Score (0-100)
  - Neck Angle Score
  - Distance Score
  - Blink Rate
  - Total Blinks
- **Clean UI**: Removed clutter, focused on actionable insights
- **Real-time Alerts**: Visual alerts for posture issues, drowsiness, low blink rate
- **Location**: `frontend/app/dashboard/posture-simple/page.tsx`

## 🚀 How to Use

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the backend**:
   ```bash
   python -m app.main
   ```
   Backend will start on `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Create environment file**:
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` and set:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

4. **Run the frontend**:
   ```bash
   npm run dev
   ```
   Frontend will start on `http://localhost:3000`

## 📋 User Flow

### First Time Users
1. Visit `http://localhost:3000/dashboard/posture-simple`
2. Grant webcam permissions
3. See calibration banner - click "Calibrate Now"
4. Complete 3 calibration scenarios:
   - Sit with good posture → Start Capture → Hold for 3 seconds
   - Sit in neutral position → Start Capture → Hold for 3 seconds
   - Look down → Start Capture → Hold for 3 seconds
5. Calibration complete! Redirected to monitoring
6. System now uses personalized thresholds

### Returning Users
1. Visit `http://localhost:3000/dashboard/posture-simple`
2. Start monitoring immediately with personalized settings
3. View real-time metrics:
   - Posture Score with status (Good/Warning/Poor)
   - Blink Rate (blinks per minute)
   - Session Duration
4. Receive alerts when posture degrades

## 🔧 API Endpoints

### Calibration
- `POST /calibration/start/{user_id}` - Initialize calibration session
- `POST /calibration/capture/{user_id}/{scenario}` - Capture scenario data
- `POST /calibration/complete/{user_id}` - Finalize and calculate thresholds
- `GET /calibration/thresholds/{user_id}` - Get user's thresholds
- `GET /calibration/status/{user_id}` - Get calibration progress
- `DELETE /calibration/reset/{user_id}` - Reset calibration

### WebSocket
- `WS /ws/video` - Real-time video processing
  - Send: `{"user_id": "...", "frame": "base64_image", "timestamp": 123456}`
  - Receive: `MinimalDashboardResponse` with posture scores and blink detection

## 📊 Data Models

### MinimalDashboardResponse
```typescript
{
  posture_score: {
    overall: number,    // 0-100
    neck: number,       // 0-100
    distance: number,   // 0-100
    status: string      // "good" | "warning" | "poor"
  },
  blink_detection: {
    blink_detected: boolean,
    blink_count: number,
    blink_rate: number,  // per minute
    ear_value: number
  },
  alert: string | null,
  timestamp: number,
  posture_angles: Record<string, number>
}
```

## 🎯 Key Changes from Previous Version

| Feature | Old Implementation | New Implementation |
|---------|-------------------|-------------------|
| Webcam | Server-side capture | Client-side capture |
| Communication | HTTP streaming | WebSocket bidirectional |
| Thresholds | Fixed for all users | Personalized per user |
| Dashboard | Complex with many metrics | Simplified, essential only |
| User Experience | One-size-fits-all | Calibrated to individual |

## ⚠️ Known Issues / Next Steps

1. **Persistence**: Calibration data currently in-memory - will be lost on server restart
   - **Fix**: Implement database storage (SQLite/PostgreSQL)

2. **Multi-user**: Current implementation uses localStorage for user_id
   - **Fix**: Implement proper authentication system

3. **WebSocket Reconnection**: Basic retry logic implemented
   - **Enhancement**: Add exponential backoff

4. **Error Handling**: Basic error messages
   - **Enhancement**: More detailed error states and recovery options

## 🧪 Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend connects to backend WebSocket
- [ ] Webcam permission requested and granted
- [ ] Video feed displays in browser
- [ ] Calibration flow completes all 3 scenarios
- [ ] Personalized thresholds calculated correctly
- [ ] Real-time posture score updates
- [ ] Blink detection works accurately
- [ ] Alerts trigger appropriately
- [ ] Session duration tracks correctly

## 📁 File Structure

```
backend/
├── app/
│   ├── api/routes/
│   │   ├── websocket.py          # NEW: WebSocket endpoint
│   │   └── calibration.py        # NEW: Calibration API
│   ├── services/
│   │   └── calibration_service.py # NEW: Calibration logic
│   └── models/
│       └── schemas.py             # UPDATED: New models added

frontend/
├── components/
│   └── WebSocketVideoCapture.tsx  # NEW: Client-side capture
├── app/dashboard/
│   ├── posture-simple/
│   │   └── page.tsx              # NEW: Simplified dashboard
│   └── calibration/
│       └── page.tsx              # NEW: Calibration flow
└── .env.local.example            # NEW: Environment config
```

## 🎓 For Developers

### Adding New Calibration Scenarios
1. Update scenarios in `calibration.py` → `start_calibration()`
2. Add threshold calculation logic in `calibration_service.py` → `calculate_personalized_thresholds()`
3. Update frontend scenario list in `calibration/page.tsx`

### Customizing Dashboard Metrics
1. Modify `MinimalDashboardResponse` model in `schemas.py`
2. Update WebSocket processing in `websocket.py` → `process_frame()`
3. Update frontend display in `posture-simple/page.tsx`

### Adjusting Alert Thresholds
1. Default thresholds in `UserThresholds` model (schemas.py)
2. Alert logic in `websocket.py` → `WebSocketVideoProcessor.process_frame()`
3. Frontend alert display in `posture-simple/page.tsx`

---

## 📞 Support

For issues or questions about the beta release, contact the development team.

**Ready for Beta Testing!** 🚀
