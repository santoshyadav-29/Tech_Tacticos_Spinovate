"use client";

import { useState, useEffect, useRef } from "react";
import { Activity, Eye, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface DashboardData {
  posture_score: {
    overall: number;
    neck: number;
    distance: number;
    status: string;
  };
  blink_detection: {
    blink_detected: boolean;
    blink_count: number;
    blink_rate: number;
    ear_value?: number;
  };
  alert?: string;
  timestamp: number;
  posture_angles?: Record<string, number>;
  // Raw metrics
  pitch_angle?: number;
  distance?: number;
  ear_value?: number;
}

export default function SimplifiedPosturePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate or retrieve user ID
  useEffect(() => {
    let storedUserId = localStorage.getItem("user_id");
    if (!storedUserId) {
      storedUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("user_id", storedUserId);
    }
    setUserId(storedUserId);

    // Check if user is calibrated
    const calibrated = localStorage.getItem("is_calibrated") === "true";
    setIsCalibrated(calibrated);

    // Set session start time
    setSessionStartTime(new Date());
  }, []);

  // Poll for metrics when monitoring
  useEffect(() => {
    if (isMonitoring) {
      console.log("Starting metrics polling...");
      
      // Poll metrics endpoint
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(`${API_URL}/video/metrics`);
          if (response.ok) {
            const data = await response.json();
            console.log("Received metrics:", data);
            
            // Create dashboard data from FaceMetrics
            // Since FaceMetrics doesn't have scores, we'll calculate simple ones
            const pitchScore = data.pitch !== null && data.pitch !== undefined 
              ? Math.max(0, 100 - Math.abs(data.pitch) * 2) 
              : 0;
            
            const distanceScore = data.distance !== null && data.distance !== undefined
              ? (data.distance >= 40 && data.distance <= 70 ? 100 : Math.max(0, 100 - Math.abs(data.distance - 55) * 3))
              : 0;
            
            const overallScore = (pitchScore + distanceScore) / 2;
            const status = overallScore >= 75 ? "good" : overallScore >= 50 ? "warning" : "poor";
            
            const dashboardData: DashboardData = {
              posture_score: {
                overall: Math.round(overallScore),
                neck: Math.round(pitchScore),
                distance: Math.round(distanceScore),
                status: status
              },
              blink_detection: {
                blink_detected: false,
                blink_count: 0,
                blink_rate: 0,
                ear_value: data.ear
              },
              alert: overallScore < 50 ? "Poor posture detected" : undefined,
              timestamp: Date.now() / 1000,
              pitch_angle: data.pitch,
              distance: data.distance,
              ear_value: data.ear
            };
            
            setDashboardData(dashboardData);
            setLastUpdate(new Date());
          } else {
            console.warn("Failed to fetch metrics:", response.status);
          }
        } catch (err) {
          console.error("Error polling metrics:", err);
        }
      }, 1000); // Poll every 1 second
    } else {
      // Clear polling when not monitoring
      if (pollingIntervalRef.current) {
        console.log("Stopping metrics polling...");
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isMonitoring]);

  // Handle data updates (kept for compatibility, but now using polling)
  const handleDataUpdate = (data: DashboardData) => {
    console.log("Dashboard data update:", data);
    setDashboardData(data);
    setLastUpdate(new Date());
  };

  // Calculate session duration
  const getSessionDuration = () => {
    if (!sessionStartTime) return "0m";
    const duration = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000 / 60);
    if (duration < 60) return `${duration}m`;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes}m`;
  };

  // Navigate to calibration
  const startCalibration = () => {
    router.push("/dashboard/calibration");
  };

  // Start monitoring session
  const startMonitoring = () => {
    setIsMonitoring(true);
    setSessionStartTime(new Date());
    setDashboardData(null); // Reset data
  };

  // Stop monitoring session
  const stopMonitoring = () => {
    setIsMonitoring(false);
    setDashboardData(null);
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Posture Monitoring</h1>
          <p className="text-gray-600 mt-1">Real-time posture and wellness tracking</p>
        </div>

        {/* Calibration Banner */}
        {!isCalibrated && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-900">Calibration Recommended</h3>
                <p className="text-sm text-yellow-700">
                  Personalize your experience for more accurate tracking
                </p>
              </div>
            </div>
            <button
              onClick={startCalibration}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
            >
              Calibrate Now
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Video Feed */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Live Monitoring
              {isMonitoring && lastUpdate && (
                <span className="ml-auto text-xs text-green-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                  Connected
                </span>
              )}
            </h2>
            
            {isMonitoring ? (
              <div className="relative">
                {/* Backend video stream with OpenCV processing - includes user_id for calibrated thresholds */}
                <img 
                  src={`${API_URL}/video/stream?user_id=${userId}`}
                  alt="Posture Monitoring Stream"
                  className="w-full h-auto rounded-lg"
                  onError={(e) => {
                    console.error("Video stream error:", e);
                  }}
                  onLoad={() => {
                    console.log("Video stream loaded successfully");
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Monitor</h3>
                  <p className="text-gray-600 mb-4">Click the button below to start tracking your posture</p>
                  <button
                    onClick={startMonitoring}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
                  >
                    Start Monitoring
                  </button>
                </div>
              </div>
            )}
            
            {isMonitoring && (
              <div className="mt-4">
                <button
                  onClick={stopMonitoring}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Stop Monitoring
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Metrics */}
          <div className="space-y-6">
            {/* Posture Score Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Posture Score
              </h2>
              
              {dashboardData ? (
                <div>
                  {/* Overall Score */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Overall</span>
                      <span
                        className={`text-4xl font-bold ${
                          dashboardData.posture_score.status === "good"
                            ? "text-green-600"
                            : dashboardData.posture_score.status === "warning"
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {dashboardData.posture_score.overall.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          dashboardData.posture_score.status === "good"
                            ? "bg-green-500"
                            : dashboardData.posture_score.status === "warning"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${dashboardData.posture_score.overall}%` }}
                      />
                    </div>
                    <div className="mt-2 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          dashboardData.posture_score.status === "good"
                            ? "bg-green-100 text-green-700"
                            : dashboardData.posture_score.status === "warning"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {dashboardData.posture_score.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Component Scores */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Neck Angle</span>
                      <span className="font-semibold">
                        {dashboardData.posture_score.neck.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Distance</span>
                      <span className="font-semibold">
                        {dashboardData.posture_score.distance.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Waiting for camera feed...
                </div>
              )}
            </div>

            {/* Blink Detection Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600" />
                Eye Wellness
              </h2>
              
              {dashboardData ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-purple-50 rounded-xl">
                    <div className="text-3xl font-bold text-purple-600">
                      {dashboardData.blink_detection.blink_rate.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Blinks/min</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {dashboardData.blink_detection.blink_rate < 10
                        ? "⚠️ Low"
                        : dashboardData.blink_detection.blink_rate < 20
                        ? "✓ Normal"
                        : "✓ Good"}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="text-3xl font-bold text-blue-600">
                      {dashboardData.blink_detection.blink_count}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Total Blinks</div>
                    <div className="text-xs text-gray-500 mt-1">This session</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Waiting for data...
                </div>
              )}
            </div>

            {/* Session Info */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="font-semibold mb-2">Session Duration</h3>
              <div className="text-3xl font-bold">{getSessionDuration()}</div>
            </div>
          </div>
        </div>

        {/* Alert Banner */}
        {dashboardData?.alert && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 max-w-md w-full mx-4">
            <div className="bg-yellow-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="font-semibold">{dashboardData.alert}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
