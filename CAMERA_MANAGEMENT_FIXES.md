# Camera Management Fixes

## Issues Fixed

### Issue 1: Webcam Opening and Closing Rapidly in Posture-Simple Page ❌→✅

**Problem:** The `handleDataUpdate` and `handleCameraError` callback functions were being recreated on every render, causing the WebSocketVideoCapture component to restart the camera repeatedly.

**Root Cause:** 
- Callback functions passed to `VideoCapture` were not memoized
- `useEffect` in `WebSocketVideoCapture.tsx` had callback functions in dependencies
- Each render created new function references, triggering the effect

**Solution:**
1. Wrapped callbacks in `useCallback` to maintain stable references
2. Simplified `useEffect` dependency array to only depend on `isActive`
3. Added eslint-disable comment to acknowledge intentional dependency exclusion

**Files Changed:**
- `frontend/app/dashboard/posture-simple/page.tsx`
  - Added `useCallback` import
  - Wrapped `handleDataUpdate` in `useCallback`
  - Wrapped `handleCameraError` in `useCallback`

- `frontend/components/WebSocketVideoCapture.tsx`
  - Removed callback functions from `useEffect` dependencies
  - Only depends on `isActive` prop now
  - Added eslint-disable comment for clarity

**Result:** Camera now stays open consistently while monitoring is active, closes properly when stopped.

---

### Issue 2: Calibration Page Not Releasing Camera After Completion ❌→✅

**Problem:** After completing all calibration scenarios, the browser tab showed the camera was still active even though the user was on the completion screen.

**Root Cause:** 
- Webcam was initialized in the initial `useEffect`
- Cleanup only happened on component unmount (when navigating away)
- Camera remained active when showing completion or error screens

**Solution:**
1. Stop webcam immediately when calibration completes
2. Stop webcam when an error occurs
3. Ensure proper cleanup in all exit scenarios

**Files Changed:**
- `frontend/app/dashboard/calibration/page.tsx`
  - Added `stopWebcam()` call in `completeCalibration()` function
  - Added new `useEffect` to stop webcam when error state changes
  - Camera now releases immediately on completion or error

**Result:** Camera indicator in browser turns off as soon as calibration completes or encounters an error.

---

## Code Changes Summary

### posture-simple/page.tsx
```typescript
// BEFORE
const handleDataUpdate = (data: DashboardData) => {
  setDashboardData(data);
  setLastUpdate(new Date());
};

// AFTER
const handleDataUpdate = useCallback((data: DashboardData) => {
  setDashboardData(data);
  setLastUpdate(new Date());
}, []); // Stable reference
```

### calibration/page.tsx
```typescript
// BEFORE
const completeCalibration = async () => {
  await fetch(...);
  localStorage.setItem("is_calibrated", "true");
  setIsComplete(true);
};

// AFTER
const completeCalibration = async () => {
  await fetch(...);
  localStorage.setItem("is_calibrated", "true");
  stopWebcam(); // ✅ Release camera immediately
  setIsComplete(true);
};

// ALSO ADDED
useEffect(() => {
  if (error) {
    stopWebcam(); // ✅ Release camera on error
  }
}, [error]);
```

### WebSocketVideoCapture.tsx
```typescript
// BEFORE
useEffect(() => {
  if (isActive) {
    startWebcam();
    connectWebSocket();
  } else {
    stopWebcam();
    disconnectWebSocket();
  }
}, [isActive, startWebcam, stopWebcam, connectWebSocket, disconnectWebSocket]);
// ❌ Functions in deps cause infinite loop

// AFTER
useEffect(() => {
  if (isActive) {
    startWebcam();
    connectWebSocket();
  } else {
    stopWebcam();
    disconnectWebSocket();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isActive]); // ✅ Only depend on the prop
```

---

## Testing

### Test 1: Posture Monitoring Camera Stability
1. Go to `/dashboard/posture-simple`
2. Click "Start Monitoring"
3. Grant camera permission
4. **Expected:** Camera opens once and stays open
5. **Expected:** No flickering or reopening
6. Click "Stop Monitoring"
7. **Expected:** Camera closes immediately

### Test 2: Calibration Camera Release
1. Go to `/dashboard/calibration`
2. Grant camera permission (camera opens)
3. Complete all 3 scenarios
4. **Expected:** Camera indicator turns off when completion screen shows
5. Check browser tab - should NOT show camera icon
6. Navigate away - no lingering camera access

### Test 3: Calibration Error Camera Release
1. Go to `/dashboard/calibration`
2. Remove user_id from localStorage to trigger error
3. **Expected:** Camera stops immediately when error shows
4. Check browser tab - should NOT show camera icon

---

## Technical Details

### React useCallback
Memoizes function references to prevent unnecessary re-renders:
```typescript
// Without useCallback - new function every render
const handleData = (data) => { ... }

// With useCallback - same function reference
const handleData = useCallback((data) => { ... }, [])
```

### useEffect Dependencies
Best practices:
- **Include:** Values that should trigger the effect
- **Exclude:** Stable functions (useCallback) that don't need to trigger
- **Use eslint-disable:** When intentionally excluding for stability

### Camera Lifecycle
```
Calibration:
  Mount → Start Camera
  Complete → Stop Camera ✅
  Error → Stop Camera ✅
  Unmount → Stop Camera ✅

Monitoring:
  isActive=true → Start Camera
  isActive=false → Stop Camera
  Unmount → Stop Camera
```

---

## Benefits

1. **Better UX:** No camera flickering during monitoring
2. **Privacy:** Camera releases immediately when done
3. **Performance:** Fewer re-renders and effect triggers
4. **Browser Compliance:** Proper cleanup of media streams
5. **Cleaner Code:** Proper use of React hooks

---

## Files Modified
- ✅ `frontend/app/dashboard/posture-simple/page.tsx`
- ✅ `frontend/app/dashboard/calibration/page.tsx`
- ✅ `frontend/components/WebSocketVideoCapture.tsx`

All changes tested with no TypeScript/React errors.
