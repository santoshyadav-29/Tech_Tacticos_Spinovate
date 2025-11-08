"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface PostureScore {
  overall: number;
  neck: number;
  roll: number;
  distance: number;
  status: string;
}

interface BlinkDetection {
  blink_detected: boolean;
  blink_count: number;
  blink_rate: number;
  ear_value?: number;
}

interface DashboardData {
  posture_score: PostureScore;
  blink_detection: BlinkDetection;
  alert?: string;
  timestamp: number;
  posture_angles?: Record<string, number>;
  // Raw metrics for calibration
  pitch_angle?: number;
  roll_angle?: number;
  distance?: number;
  ear_value?: number;
}

interface Props {
  userId: string;
  onDataUpdate?: (data: DashboardData) => void;
  isActive?: boolean; // Controls whether camera/WebSocket are active
  onCameraError?: (error: string) => void;
}

export const VideoCapture: React.FC<Props> = ({ userId, onDataUpdate, isActive = false, onCameraError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;

  // Initialize webcam
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        setError(null);
      }
    } catch (err) {
      const errorMsg = "Failed to access webcam. Please grant camera permissions.";
      setError(errorMsg);
      if (onCameraError) {
        onCameraError(errorMsg);
      }
      console.error("Webcam error:", err);
    }
  }, [onCameraError]);

  // Stop webcam
  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    // Determine WebSocket URL based on environment
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "localhost:8000";
    // Remove http:// or https:// from API URL if present
    const host = apiUrl.replace(/^https?:\/\//, "");
    const wsUrl = `${protocol}//${host}/ws/video`;

    console.log("Attempting WebSocket connection to:", wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("✅ WebSocket connected successfully");
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0; // Reset reconnect counter on success
        
        // Start heartbeat/ping mechanism
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send("ping");
            } catch (err) {
              console.error("Failed to send ping:", err);
            }
          }
        }, 30000); // Send ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          // Handle pong responses
          if (event.data === "pong") {
            return;
          }
          
          const data = JSON.parse(event.data);
          
          // Handle error messages from server
          if (data.error) {
            console.warn("Server error:", data.error);
            return;
          }
          
          // Handle no face detection
          if (data.status === 'no_face') {
            // Still connected, just no face detected
            console.log("No face detected in frame");
            // Clear dashboard data to show "looking for face" message
            setDashboardData(null);
            return;
          }
          
          // Validate data has required fields before using
          if (data.posture_score && data.blink_detection) {
            console.log("Received valid data from WebSocket");
            setDashboardData(data);
            if (onDataUpdate) {
              onDataUpdate(data);
            }
          } else {
            console.log("Received incomplete data, waiting for face detection...");
            setDashboardData(null);
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket connection error. URL:", wsUrl);
        // Only set error if we're actually trying to connect (not during cleanup)
        if (isActive) {
          setError(`Cannot connect to backend at ${host}. Make sure the server is running.`);
        }
      };

      ws.onclose = (event) => {
        console.log(`WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`);
        setIsConnected(false);
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Only attempt to reconnect if still active and haven't exceeded max attempts
        if (isActive && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 16000);
          
          console.log(`Attempting to reconnect in ${backoffDelay / 1000}s... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, backoffDelay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError("Connection lost. Too many reconnection attempts. Please refresh the page.");
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      setError("Failed to connect to server. Is the backend running on port 8000?");
    }
  }, [isActive, onDataUpdate]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    // Clear reconnect timeout if any
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    reconnectAttemptsRef.current = 0; // Reset counter
  }, []);

  // Send frame to backend
  const sendFrame = useCallback(() => {
    if (
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN ||
      !videoRef.current ||
      !canvasRef.current
    ) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    try {
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to base64 JPEG with lower quality for smaller payload
      const frameData = canvas.toDataURL("image/jpeg", 0.6);

      // Send to backend
      wsRef.current.send(
        JSON.stringify({
          user_id: userId,
          frame: frameData,
          timestamp: Date.now() / 1000,
        })
      );
    } catch (err) {
      console.error("Failed to send frame:", err);
      // If send fails, connection might be broken
      if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
        setIsConnected(false);
      }
    }
  }, [userId]);

  // Start/stop frame sending
  useEffect(() => {
    if (isConnected && isCameraActive) {
      // Send frames every 200ms (5 FPS)
      intervalRef.current = setInterval(sendFrame, 200);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isConnected, isCameraActive, sendFrame]);

  // Control camera and WebSocket based on isActive prop
  useEffect(() => {
    console.log(`🔄 VideoCapture isActive changed: ${isActive}`);
    console.log(`   Current state - Camera: ${isCameraActive}, WebSocket: ${isConnected}`);
    
    if (isActive) {
      console.log("✅ Starting camera and WebSocket...");
      startWebcam();
      connectWebSocket();
    } else {
      console.log("❌ Stopping camera and WebSocket...");
      stopWebcam();
      disconnectWebSocket();
    }
    // Only depend on isActive to prevent infinite loops
    // The functions are stable due to useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    console.log("📦 VideoCapture component mounted");
    
    return () => {
      console.log("🗑️ VideoCapture component unmounting - cleaning up...");
      // Cleanup all resources
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Video Display */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg border bg-black w-full max-w-md aspect-video">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Connection Status Indicator */}
        <div className="absolute top-4 right-4">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
            title={isConnected ? "Connected" : "Disconnected"}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-500 bg-opacity-90 text-white px-3 py-3 text-sm">
            <div className="font-semibold mb-1">⚠️ Connection Error</div>
            <div>{error}</div>
            <div className="mt-2 text-xs opacity-90">
              To fix: Run <code className="bg-red-600 px-1 rounded">cd backend && python -m app.main</code>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Metrics */}
      {dashboardData && dashboardData.posture_score && dashboardData.blink_detection && (
        <div className="mt-4 bg-white rounded-xl shadow px-6 py-4 w-full max-w-md">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Posture Score</div>
              <div className="text-2xl font-bold text-blue-600">
                {(dashboardData.posture_score.overall ?? 0).toFixed(0)}%
              </div>
              <div
                className={`text-xs font-semibold uppercase ${
                  dashboardData.posture_score.status === "good"
                    ? "text-green-600"
                    : dashboardData.posture_score.status === "warning"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {dashboardData.posture_score.status}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Blink Rate</div>
              <div className="text-2xl font-bold text-purple-600">
                {(dashboardData.blink_detection.blink_rate ?? 0).toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">per minute</div>
            </div>
          </div>

          {/* Alert */}
          {dashboardData.alert && (
            <div className="mt-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              ⚠️ {dashboardData.alert}
            </div>
          )}
        </div>
      )}
      
      {/* No Face Detected Message */}
      {!dashboardData && isConnected && isCameraActive && (
        <div className="mt-4 bg-blue-50 rounded-xl shadow px-6 py-4 w-full max-w-md text-center">
          <div className="text-blue-600 font-semibold mb-2">👤 Looking for your face...</div>
          <div className="text-sm text-blue-700">
            Position yourself in the center of the camera frame
          </div>
        </div>
      )}
    </div>
  );
};
