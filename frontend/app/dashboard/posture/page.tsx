"use client";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { usePostureDetection } from "@/app/hooks/usePostureDetection";
import { VideoCapture } from "@/components/VideoCapture";
import { AngleStats } from "@/components/AngleStats";
import { computeAngles, getFeedback } from "@/app/utils/postureUtils";
import {
  startMonitoring,
  stopCamera,
  stopMonitoring,
  useMonitoringReport,
} from "@/app/hooks/monitoringReportSection";
import { useRouter } from "next/navigation";

// Alert interface to match backend
interface AlertData {
  posture_angle_unhealthy: boolean;
  multiple_posture_angles_unhealthy: boolean;
  distance_too_close: boolean;
  excessive_yawning: boolean;
  yawn_and_drowsy: boolean;
  insufficient_blinks: boolean;
}

export default function PosturePage() {

const videoRef = useRef<HTMLVideoElement | null>(null);
  // List available video input devices (webcams)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  useEffect(() => {
    const MY_WEBCAM_ID = 'SplitCam Virtual Camera'; // Replace with your webcam's label

    async function getDevices() {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        // Find device by label (since you know the label)
        const preferredDevice = videoDevices.find(d => d.label === MY_WEBCAM_ID);
        setSelectedDeviceId(preferredDevice ? preferredDevice.deviceId : (videoDevices[0]?.deviceId || ''));
      } catch (err) {
        console.error('Error listing devices:', err);
      }
    }
    getDevices();
  }, []);

  useEffect(() => {
    let stream;
    async function getWebcam() {
      if (!selectedDeviceId) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedDeviceId } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
      }
    }
    getWebcam();
    // Cleanup: stop the stream on unmount or device change
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream && typeof stream.getTracks === "function") {
          const tracks = stream.getTracks();
          tracks.forEach(track => track.stop());
        }
      }
    };
  }, [selectedDeviceId]);

  const router = useRouter();
  const [isMonitoring, setIsMonitoring] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("isMonitoring") === "true";
    }
    return false;
  });

  // Stack to track bad posture events (max size 3)
  const [postureEventStack, setPostureEventStack] = useState<number[]>([]);
  const lastBadPostureEvents = useRef<number>(0);

  // Alert states
  const [alerts, setAlerts] = useState<AlertData>({
    posture_angle_unhealthy: false,
    multiple_posture_angles_unhealthy: false,
    distance_too_close: false,
    excessive_yawning: false,
    yawn_and_drowsy: false,
    insufficient_blinks: false
  });
  
  const [activeAlerts, setActiveAlerts] = useState<string[]>([]);
  const alertCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Track which alerts have been notified to prevent spam
  const notifiedAlerts = useRef<Set<string>>(new Set());
  const alertCooldowns = useRef<Map<string, number>>(new Map());

  // Audio element for alert sound
  const alertAudio = useRef<HTMLAudioElement | null>(null);

  // Use the monitoring report hook to fetch data
  const report = useMonitoringReport(isMonitoring, 2000);
  const { pitch, distance, postureAngles } = usePostureDetection(isMonitoring);

  const angleNameMap: Record<string, string> = {
    "Degree of Anteversion of Cervical Spine (y1)": "Cervical",
    "T1 Slope (y2)": "T1Slope",
    "Upper Thoracic Kyphosis Angle (y3)": "UpperThoracic",
    "Middle and Lower Thoracic Kyphosis Angle (y4)": "MidLowerThoracic",
    "T8-T12-L3 Angle (new)": "T8T12L3",
    "Lumbar Lordosis Angle (y5)": "LumbarLordosis",
  };

  const remappedAngles = useMemo(() => {
    if (!postureAngles) return {};
    const out: Record<string, number> = {};
    Object.entries(postureAngles).forEach(([key, value]) => {
      const mapped = angleNameMap[key] || key;
      out[mapped] = value;
    });
    return out;
  }, [postureAngles]);

  const angles = useMemo(
    () => computeAngles(distance, pitch),
    [distance, pitch]
  );

  const feedback = useMemo(
    () => getFeedback(distance, pitch, angles),
    [distance, pitch, angles]
  );

  // Alert message mapping
  const alertMessages: Record<keyof AlertData, string> = {
    posture_angle_unhealthy: "Poor posture angle detected! Please adjust your position.",
    multiple_posture_angles_unhealthy: "Multiple posture angles are unhealthy! Immediate correction needed.",
    distance_too_close: "You're sitting too close to the screen! Move back for better posture.",
    excessive_yawning: "Excessive yawning detected! Consider taking a break.",
    yawn_and_drowsy: "Drowsiness alert! You appear tired - take a break.",
    insufficient_blinks: "Insufficient blinking detected! Remember to blink regularly to avoid eye strain."
  };

  // Alert severity levels
  const alertSeverity: Record<keyof AlertData, 'low' | 'medium' | 'high'> = {
    posture_angle_unhealthy: 'medium',
    multiple_posture_angles_unhealthy: 'high',
    distance_too_close: 'medium',
    excessive_yawning: 'low',
    yawn_and_drowsy: 'high',
    insufficient_blinks: 'low'
  };

  // Initialize audio element
  useEffect(() => {
    alertAudio.current = new Audio("/sounds/alert.mp3");
    alertAudio.current.preload = 'auto';
    
    // Set volume to a reasonable level
    alertAudio.current.volume = 0.7;
    
    return () => {
      if (alertAudio.current) {
        alertAudio.current.pause();
        alertAudio.current = null;
      }
    };
  }, []);

  // Function to play alert sound
  const playAlertSound = (severity: 'low' | 'medium' | 'high') => {
    if (alertAudio.current) {
      try {
        // Reset audio to beginning and play
        alertAudio.current.currentTime = 0;
        alertAudio.current.play().catch((error) => {
          console.log("Audio playback failed:", error);
        });
      } catch (error) {
        console.log("Audio setup failed:", error);
      }
    }
  };

  // Function to check if alert should be shown (not in cooldown)
  const shouldShowAlert = (alertType: string): boolean => {
    const now = Date.now();
    const cooldownEnd = alertCooldowns.current.get(alertType);
    
    if (!cooldownEnd || now > cooldownEnd) {
      return true;
    }
    return false;
  };

  // Function to set alert cooldown
  const setAlertCooldown = (alertType: string, duration: number = 10000) => {
    const now = Date.now();
    alertCooldowns.current.set(alertType, now + duration);
  };

  // Function to fetch alerts from backend
  const fetchAlerts = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/alerts/check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const alertData: AlertData = await response.json();
        setAlerts(alertData);
        
        // Update active alerts array
        const newActiveAlerts = Object.entries(alertData)
          .filter(([_, isActive]) => isActive)
          .map(([alertType, _]) => alertType);
        
        setActiveAlerts(newActiveAlerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  // Function to send notification for backend alerts
  const sendAlertNotification = (alertType: keyof AlertData) => {
    // Check if we should show this alert (not in cooldown)
    if (!shouldShowAlert(alertType)) {
      return;
    }

    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        const message = alertMessages[alertType];
        const severity = alertSeverity[alertType];
        
        new Notification(`${severity === 'high' ? '🚨' : severity === 'medium' ? '⚠️' : '💡'} Health Alert!`, {
          body: message,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: `alert-${alertType}`,
          requireInteraction: severity === 'high',
        });

        // Play alert sound for all alerts
        playAlertSound(severity);

        // Set cooldown for this alert type
        const cooldownDuration = severity === 'high' ? 15000 : severity === 'medium' ? 12000 : 10000;
        setAlertCooldown(alertType, cooldownDuration);
      }
    }
  };

  // Effect to handle alert changes and notifications
  useEffect(() => {
    if (isMonitoring) {
      // Check for new alerts that should trigger notifications
      Object.entries(alerts).forEach(([alertType, isActive]) => {
        if (isActive) {
          sendAlertNotification(alertType as keyof AlertData);
        }
      });

      // Clean up cooldowns for inactive alerts
      Object.entries(alerts).forEach(([alertType, isActive]) => {
        if (!isActive) {
          // Remove from cooldown if alert is no longer active
          // This allows immediate notification if the same alert becomes active again later
          const now = Date.now();
          const cooldownEnd = alertCooldowns.current.get(alertType);
          if (cooldownEnd && now > cooldownEnd - 5000) { // Allow reset 5 seconds before cooldown ends
            alertCooldowns.current.delete(alertType);
          }
        }
      });
    }
  }, [alerts, isMonitoring]);

  // Function to send window notification
  const sendPostureNotification = () => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("Posture Alert! 🚨", {
          body: "Three consecutive bad posture events detected. Please adjust your posture!",
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: "posture-alert",
          requireInteraction: true,
        });

        // Play alert sound for posture notification
        playAlertSound('high');
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            sendPostureNotification();
          }
        });
      }
    }
  };

  // Effect to track bad posture events and manage the stack
  useEffect(() => {
    if (report && report.bad_posture_events !== undefined) {
      const currentBadEvents = report.bad_posture_events;

      // Check if there's a new bad posture event
      if (currentBadEvents > lastBadPostureEvents.current) {
        const newEvents = currentBadEvents - lastBadPostureEvents.current;

        setPostureEventStack((prevStack) => {
          const updatedStack = [...prevStack];

          // Add new events to the stack
          for (let i = 0; i < newEvents; i++) {
            updatedStack.push(Date.now());
          }

          // Keep only the last 3 events
          const trimmedStack = updatedStack.slice(-3);

          // Check if we have 3 consecutive events
          if (trimmedStack.length === 3) {
            sendPostureNotification();
            // Clear the stack after notification
            return [];
          }

          return trimmedStack;
        });

        lastBadPostureEvents.current = currentBadEvents;
      }
    }
  }, [report?.bad_posture_events]);

  // Request notification permission on component mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Set up alert checking interval when monitoring starts
  useEffect(() => {
    if (isMonitoring) {
      // Fetch alerts immediately
      fetchAlerts();
      
      // Set up interval to check alerts every 2 seconds
      alertCheckInterval.current = setInterval(fetchAlerts, 2000);
    } else {
      // Clear interval when monitoring stops
      if (alertCheckInterval.current) {
        clearInterval(alertCheckInterval.current);
        alertCheckInterval.current = null;
      }
      // Reset alerts and cooldowns
      setAlerts({
        posture_angle_unhealthy: false,
        multiple_posture_angles_unhealthy: false,
        distance_too_close: false,
        excessive_yawning: false,
        yawn_and_drowsy: false,
        insufficient_blinks: false
      });
      setActiveAlerts([]);
      // Clear notification cooldowns
      notifiedAlerts.current.clear();
      alertCooldowns.current.clear();
    }

    // Cleanup on unmount
    return () => {
      if (alertCheckInterval.current) {
        clearInterval(alertCheckInterval.current);
      }
    };
  }, [isMonitoring]);

  const handleStartMonitoring = () => {
    startMonitoring();
    setIsMonitoring(true);
    localStorage.setItem("isMonitoring", "true");
    // Reset tracking variables
    setPostureEventStack([]);
    lastBadPostureEvents.current = 0;
    // Clear notification cooldowns for fresh start
    notifiedAlerts.current.clear();
    alertCooldowns.current.clear();
  };

  const handleEndSession = () => {
    stopMonitoring();
    stopCamera();
    setIsMonitoring(false);
    localStorage.setItem("isMonitoring", "false");
    // Reset tracking variables
    setPostureEventStack([]);
    lastBadPostureEvents.current = 0;
    // Clear notification cooldowns
    notifiedAlerts.current.clear();
    alertCooldowns.current.clear();
    router.push("/dashboard");
  };

  useEffect(() => {
    const stored = localStorage.getItem("isMonitoring");
    if (stored === "true" && !isMonitoring) {
      setIsMonitoring(true);
    }
  }, []);

  // Get alert severity color
  const getAlertColor = (alertType: keyof AlertData) => {
    const severity = alertSeverity[alertType];
    switch (severity) {
      case 'high': return 'bg-red-500 border-red-600';
      case 'medium': return 'bg-orange-500 border-orange-600';
      case 'low': return 'bg-yellow-500 border-yellow-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col">
      <header className="w-full px-6 py-4 flex items-center justify-between bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-blue-800 tracking-tight">
          Posture Analysis
        </h1>
        <div className="flex items-center gap-4">
          {/* Notification Status Indicator */}
          {isMonitoring && (
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-gray-600">
                  Events: {postureEventStack.length}/3
                </span>
              </div>
              {/* Active Alerts Counter */}
              {activeAlerts.length > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-600 font-semibold">
                    {activeAlerts.length} Alert{activeAlerts.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {report && (
                <span className="text-gray-500">
                  Total Bad Events: {report.bad_posture_events}
                </span>
              )}
            </div>
          )}
          <span className="text-gray-500 font-medium">
            Tech Tacticos Spinovate
          </span>
        </div>
      </header>

      {/* Active Alerts Banner */}
      {isMonitoring && activeAlerts.length > 0 && (
        <div className="w-full bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Active Health Alerts
            </h3>
            <div className="flex flex-wrap gap-2">
              {activeAlerts.map((alertType) => (
                <div
                  key={alertType}
                  className={`px-3 py-1 rounded-full text-white text-sm font-medium border-2 ${getAlertColor(alertType as keyof AlertData)}`}
                >
                  {alertMessages[alertType as keyof AlertData]}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Control Buttons Section */}
      <section className="w-full flex justify-center py-6">
        <div className="flex gap-4">
          {!isMonitoring ? (
            <button
              onClick={handleStartMonitoring}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Start Monitoring
            </button>
          ) : (
            <button
              onClick={handleEndSession}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 9l6 6m0-6l-6 6"
                />
              </svg>
              End Session
            </button>
          )}
        </div>
      </section>

      <main className="flex-1 flex flex-col md:flex-row gap-8 px-6 py-8 max-w-7xl mx-auto w-full">
        {/* Camera Feed Section */}
        <div className="flex-1 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Live Feed
          </h2>
          {isMonitoring ? (
            <div className="relative">
              <img
                src="http://127.0.0.1:8000/video/stream"
                alt="Live Webcam Feed"
                className="w-full h-auto rounded-lg shadow-sm"
              />
              <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                LIVE
              </div>
              {/* Posture Event Stack Indicator */}
              {postureEventStack.length > 0 && (
                <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  ⚠️ {postureEventStack.length}/3
                </div>
              )}
              {/* Active Alerts on Video */}
              {activeAlerts.length > 0 && (
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-red-900 bg-opacity-80 text-white p-2 rounded-lg">
                    <div className="text-xs font-semibold mb-1">🚨 ACTIVE ALERTS:</div>
                    <div className="text-xs space-y-1">
                      {activeAlerts.slice(0, 2).map((alertType) => (
                        <div key={alertType} className="truncate">
                          • {alertMessages[alertType as keyof AlertData]}
                        </div>
                      ))}
                      {activeAlerts.length > 2 && (
                        <div className="text-xs opacity-80">
                          +{activeAlerts.length - 2} more alerts
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-500 font-medium">Camera is off</p>
                <p className="text-gray-400 text-sm">
                  Click "Start Monitoring" to begin
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stats Section */}
        {isMonitoring && <AngleStats angles={remappedAngles} />}
      </main>


      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40, background: '#f0f0f0', padding: 20, borderRadius: 8 }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: 640, height: 480, background: '#000', borderRadius: 8 }}
      />
    </div>



      {/* Feedback Section */}
      {isMonitoring && (
        <section className="w-full flex justify-center mt-2 mb-8">
          <div className="bg-white rounded-xl shadow px-8 py-6 max-w-2xl w-full flex flex-col items-center">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">
              Posture Feedback
            </h3>
            <ul className="list-disc text-gray-700 text-base pl-6">
              {feedback.map((msg, i) => (
                <li
                  key={i}
                  className={
                    msg.startsWith("Great")
                      ? "text-green-600 font-semibold"
                      : "text-red-600"
                  }
                >
                  {msg}
                </li>
              ))}
            </ul>

            {/* Real-time monitoring stats */}
            {report && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg w-full">
                <h4 className="font-semibold text-gray-700 mb-2">
                  Session Stats
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Bad Posture Events:</span>
                    <span className="ml-2 font-semibold text-red-600">
                      {report.bad_posture_events}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Session Score:</span>
                    <span className="ml-2 font-semibold text-blue-600">
                      {report.session_score}/100
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Bad Posture Time:</span>
                    <span className="ml-2 font-semibold text-orange-600">
                      {report.bad_posture_time_min.toFixed(1)} min
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Session Duration:</span>
                    <span className="ml-2 font-semibold text-green-600">
                      {report.session_duration_min.toFixed(1)} min
                    </span>
                  </div>
                </div>
                
                {/* Alert Status Summary */}
                {activeAlerts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Active Alerts:</span>
                      <span className="text-red-600 font-semibold text-sm">
                        {activeAlerts.length} active
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="w-full py-4 text-center text-gray-400 text-xs border-t bg-white">
        &copy; {new Date().getFullYear()} Tech Tacticos Spinovate. All rights
        reserved.
      </footer>
    </div>
  );
}