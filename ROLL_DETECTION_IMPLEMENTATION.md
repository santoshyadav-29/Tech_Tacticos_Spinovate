# Head Tilt (Roll) Detection Implementation

## Overview
Added detection for side-to-side head tilt (roll angle) to complement the existing up/down (pitch) detection. This provides more comprehensive posture monitoring.

---

## What Was Added

### 1. Roll Angle Detection
**What it detects:** Head tilting to the left or right side
- **Positive roll:** Head tilted to the right
- **Negative roll:** Head tilted to the left
- **Zero roll:** Head upright (ideal)

### 2. Integration with Existing System
The roll detection is fully integrated while **preserving all existing functionality**:
- ✅ Pitch detection (up/down) still works
- ✅ Distance detection still works
- ✅ Calibration system extended to include roll
- ✅ Score calculation includes roll as third component
- ✅ All existing flows preserved

---

## Technical Implementation

### Backend Changes

#### 1. DrowsinessDetectionService (`drowsiness_detection.py`)

**New Method: `_calculate_roll()`**
```python
def _calculate_roll(self, landmarks, w: int, h: int) -> float:
    """
    Calculate head roll angle (side-to-side tilt).
    Uses the angle between eye line and horizontal plane.
    """
    left_eye = landmarks_to_3d(landmarks, 33, w, h)
    right_eye = landmarks_to_3d(landmarks, 263, w, h)
    
    delta_y = right_eye[1] - left_eye[1]  # Vertical difference
    delta_x = right_eye[0] - left_eye[0]  # Horizontal difference
    
    roll_angle_rad = np.arctan2(delta_y, delta_x)
    return np.degrees(roll_angle_rad)
```

**Updated Return Signature:**
```python
# OLD: Returns 8 values
(pitch, ear, mar, yaw, drowsiness, yawn, blink, posture_angles)

# NEW: Returns 9 values
(pitch, ear, mar, yaw, roll, drowsiness, yawn, blink, posture_angles)
```

**Updated Visualization:**
- Table now shows roll angle alongside pitch and yaw
- Increased table height to accommodate new metric row

#### 2. Calibration System

**CalibrationData Schema:**
```python
class CalibrationData(BaseModel):
    pitch_angle: Optional[float] = None
    roll_angle: Optional[float] = None  # NEW
    distance: Optional[float] = None
    ear: Optional[float] = None
```

**UserThresholds Schema:**
```python
class UserThresholds(BaseModel):
    pitch_threshold: float = 15.0
    roll_threshold: float = 15.0  # NEW
    distance_min: float = 40.0
    distance_max: float = 60.0
```

**Threshold Calculation Logic:**
```python
if good_posture.roll_angle is not None:
    base_roll = abs(good_posture.roll_angle)
    # Allow 15 degrees of tilt from good posture
    user_data.roll_threshold = max(base_roll + 15.0, 15.0)
```

#### 3. Score Calculation

**Updated PostureScore:**
```python
class PostureScore(BaseModel):
    overall: float
    neck: float    # Pitch score
    roll: float    # NEW: Roll score
    distance: float
    status: str
```

**Score Calculation Logic:**
```python
# Roll Score Calculation
if roll_deviation <= thresholds.roll_threshold:
    roll_score = 100.0  # Perfect - head upright
else:
    excess = roll_deviation - thresholds.roll_threshold
    penalty = min(100, (excess / thresholds.roll_threshold) * 100)
    roll_score = max(0, 100 - penalty)

# Overall Score = Average of 3 components
overall_score = (neck_score + roll_score + distance_score) / 3
```

#### 4. WebSocket Response

**MinimalDashboardResponse:**
```python
class MinimalDashboardResponse(BaseModel):
    posture_score: PostureScore  # Includes roll score
    blink_detection: BlinkDetection
    alert: Optional[str] = None
    timestamp: float
    posture_angles: Optional[dict] = None
    # Raw metrics for calibration
    pitch_angle: Optional[float] = None
    roll_angle: Optional[float] = None  # NEW
    distance: Optional[float] = None
    ear_value: Optional[float] = None
```

### Frontend Changes

#### Calibration Page
**Updated capture to include roll_angle:**
```typescript
await fetch(`${API_URL}/calibration/capture/${userId}/${scenario.id}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    pitch_angle: data.pitch_angle,
    roll_angle: data.roll_angle,  // NEW
    distance: data.distance,
    ear: data.ear_value,
  }),
});
```

---

## How Roll Detection Works

### Mathematical Explanation

```
Given two eye positions:
  Left Eye: (x1, y1)
  Right Eye: (x2, y2)

Roll Angle = arctan2(y2 - y1, x2 - x1)

Example:
  ┌─────────────────┐
  │  Left    Right  │  Head Upright
  │   ●────────●    │  Roll ≈ 0°
  └─────────────────┘

  ┌─────────────────┐
  │  Left           │  Head Tilted Right
  │   ●             │  Roll ≈ +15°
  │       Right     │
  │         ●       │
  └─────────────────┘

  ┌─────────────────┐
  │       Right     │  Head Tilted Left
  │         ●       │  Roll ≈ -15°
  │  Left           │
  │   ●             │
  └─────────────────┘
```

### Real-World Scenarios

**Good Posture (Roll ≈ 0°)**
- Head aligned vertically
- Both shoulders level
- Looking straight ahead
- **Score: 100%**

**Slight Tilt (Roll ≈ 10°)**
- Leaning to one side
- Reading from angled document
- Still within threshold
- **Score: 100%** (if threshold is 15°)

**Excessive Tilt (Roll ≈ 25°)**
- Head resting on hand
- Slouching sideways
- Exceeds threshold
- **Score: 40-60%** (warning/poor)

---

## Score Calculation Flow

### Before (2 Components):
```
Overall Score = (Neck Score + Distance Score) / 2

Example:
  Neck: 100%
  Distance: 80%
  Overall: (100 + 80) / 2 = 90% → "good"
```

### After (3 Components):
```
Overall Score = (Neck Score + Roll Score + Distance Score) / 3

Example:
  Neck: 100%
  Roll: 60%  ← NEW
  Distance: 80%
  Overall: (100 + 60 + 80) / 3 = 80% → "warning"
```

**Impact:** More comprehensive evaluation, but roll issues now affect overall score!

---

## Calibration Process

### What User Does:
1. **Good Posture:** Sit upright, head level
   - System captures: pitch ≈ 5°, roll ≈ 0°
   
2. **Neutral Posture:** Natural working position
   - System captures: pitch ≈ 10°, roll ≈ 2°

3. **Looking Down:** Tilt head forward
   - System captures: pitch ≈ 20°, roll ≈ 1°

### What System Calculates:
```python
# From good_posture (roll ≈ 0°)
roll_threshold = max(0 + 15.0, 15.0) = 15°

# User can tilt head ±15° from their baseline
# Beyond 15°: Score starts declining
```

---

## Testing the Roll Detection

### Test 1: Upright Head
1. Sit with head level (looking straight at camera)
2. **Expected:** Roll ≈ 0°, Roll Score = 100%

### Test 2: Slight Tilt
1. Tilt head slightly to right (about 10°)
2. **Expected:** Roll ≈ 10°, Roll Score = 100% (within 15° threshold)

### Test 3: Excessive Tilt
1. Rest head on hand (about 30° tilt)
2. **Expected:** Roll ≈ 30°, Roll Score ≈ 50% (exceeds threshold)

### Test 4: Calibration Impact
1. Calibrate with slight natural tilt (roll = 5°)
2. Calculated threshold: 5 + 15 = 20°
3. Now you can tilt up to 20° before score drops
4. **Result:** Personalized to your natural posture!

---

## Visualization in Video Stream

### Backend Video Stream (if used):
The status table now shows:
```
METRICS
Pitch: 8.50 deg
Roll: -2.30 deg    ← NEW
Yaw: 1.2 deg
EAR: 0.27
MAR: 0.45
Brightness: 115.23
Blinks: 12
```

### Frontend Dashboard:
The PostureScore object includes:
```typescript
{
  posture_score: {
    overall: 95.0,
    neck: 100.0,     // Pitch score
    roll: 100.0,     // NEW: Roll score
    distance: 85.0,
    status: "good"
  }
}
```

---

## Backward Compatibility

### ✅ All Existing Features Preserved:

1. **Pitch Detection:** Still works exactly the same
2. **Distance Detection:** Unchanged
3. **Drowsiness Detection:** EAR/MAR/Blink tracking intact
4. **Yawn Detection:** Still uses yaw angle
5. **Posture Angles:** 6 spinal angles still calculated
6. **Existing Calibration:** Old data works (roll defaults to None)

### 🔄 Graceful Degradation:

```python
# If roll_angle is None (old data or error)
if roll_angle is not None:
    roll_score = calculate_roll_score(roll_angle)
else:
    roll_score = 100.0  # Don't penalize if unavailable
```

---

## Files Modified

### Backend:
1. ✅ `backend/app/services/drowsiness_detection.py`
   - Added `_calculate_roll()` method
   - Updated `process_frame()` return signature
   - Updated visualization table

2. ✅ `backend/app/models/schemas.py`
   - Added `roll_angle` to CalibrationData
   - Added `roll_threshold` to UserThresholds
   - Added `roll` to PostureScore
   - Added `roll_angle` to MinimalDashboardResponse

3. ✅ `backend/app/services/calibration_service.py`
   - Added `roll_angle` parameter to `store_calibration_frame()`
   - Added roll threshold calculation logic

4. ✅ `backend/app/api/routes/calibration.py`
   - Added `roll_angle` to CaptureRequest
   - Updated capture endpoint to include roll

5. ✅ `backend/app/api/routes/websocket.py`
   - Updated `calculate_posture_score()` to include roll
   - Updated score to average 3 components (neck + roll + distance)
   - Added roll_angle to WebSocket response

### Frontend:
6. ✅ `frontend/app/dashboard/calibration/page.tsx`
   - Updated calibration capture to send roll_angle

---

## Benefits

### 1. More Comprehensive Monitoring
- Detects bad posture that pitch/distance miss
- Identifies users leaning to one side
- Catches "head on hand" poor posture

### 2. Better Ergonomics
- Side tilting can cause neck strain
- Asymmetric posture leads to muscle imbalance
- Early detection prevents chronic issues

### 3. Personalized Calibration
- Some people naturally tilt slightly
- System adapts to individual baseline
- Reduces false alerts

---

## Example Use Cases

### Use Case 1: Developer Debugging
**Scenario:** Leaning to read side monitor
- Roll: 20°
- Exceeds threshold (15°)
- Alert: "Poor posture - straighten your head"
- **Action:** Adjust monitor position or posture

### Use Case 2: Reading Documents
**Scenario:** Paper document tilted on desk
- User tilts head to read: roll 12°
- Within threshold
- **Score: 100%** - No false alert

### Use Case 3: Fatigue Detection
**Scenario:** Tired user resting head on hand
- Roll: 35°
- Significantly exceeds threshold
- Combined with drowsiness detection
- **Alert:** "Poor posture + drowsiness - take a break"

---

## Summary

### What Changed:
✅ Added roll (side-to-side tilt) detection
✅ Integrated into calibration system
✅ Score calculation includes roll component
✅ WebSocket response includes roll data
✅ Visualization shows roll angle

### What Stayed the Same:
✅ Pitch detection unchanged
✅ Distance detection unchanged
✅ Drowsiness/yawn detection unchanged
✅ Existing calibration data compatible
✅ All APIs backward compatible

### Result:
**More comprehensive posture monitoring while maintaining all existing functionality!** 🎉
