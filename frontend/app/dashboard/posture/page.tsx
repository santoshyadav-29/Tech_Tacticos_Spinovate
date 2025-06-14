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

type PostureStatus = {
  posture_angle_unhealthy: boolean;
  multiple_posture_angles_unhealthy: boolean;
  distance_too_close: boolean;
  excessive_yawning: boolean;
  yawn_and_drowsy: boolean;
  insufficient_blinks: boolean;
};

function playBeep(duration = 1000, volume = 0.5) {
  try {
    const ctx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      ctx.close();
    }, duration);
  } catch (e) {
    // Ignore audio errors
  }
}

function showWindowNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") new Notification(title, { body });
    });
  }
}

// Priority order and sound alert only for the first two
const PRIORITY_ERRORS: {
  key: keyof PostureStatus;
  title: string;
  body: string;
  sound: boolean;
}[] = [
  {
    key: "distance_too_close",
    title: "Distance Too Close",
    body: "You are sitting too close to the screen.",
    sound: true,
  },
  {
    key: "posture_angle_unhealthy",
    title: "Unhealthy Posture Detected",
    body: "Please correct your posture angle.",
    sound: true,
  },
  {
    key: "multiple_posture_angles_unhealthy",
    title: "Multiple Angles Unhealthy",
    body: "Multiple posture angles are unhealthy. Adjust your sitting position.",
    sound: false,
  },
  {
    key: "excessive_yawning",
    title: "Excessive Yawning",
    body: "You are yawning excessively. Consider taking a break.",
    sound: false,
  },
  {
    key: "yawn_and_drowsy",
    title: "Yawning & Drowsiness",
    body: "Yawning and drowsiness detected. Please stay alert.",
    sound: false,
  },
  {
    key: "insufficient_blinks",
    title: "Insufficient Blinks",
    body: "You are not blinking enough. Blink more to protect your eyes.",
    sound: false,
  },
];

export default function PosturePage() {
  const router = useRouter();
  const [isMonitoring, setIsMonitoring] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("isMonitoring") === "true";
    }
    return false;
  });

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

  const handleStartMonitoring = () => {
    startMonitoring();
    setIsMonitoring(true);
    localStorage.setItem("isMonitoring", "true");
  };

  const handleEndSession = () => {
    stopMonitoring();
    stopCamera();
    setIsMonitoring(false);
    localStorage.setItem("isMonitoring", "false");
    router.push("/dashboard");
  };

  useEffect(() => {
    const stored = localStorage.getItem("isMonitoring");
    if (stored === "true" && !isMonitoring) {
      setIsMonitoring(true);
    }
  }, []);

  // Posture alerts fetching
  const [data, setData] = useState<PostureStatus | null>(null);
  const lastAlertRef = useRef<{ [key: string]: boolean }>({});

  // Request notification permission on component mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("http://127.0.0.1:8000/alerts/check")
        .then((res) => res.json())
        .then((json) => setData(json))
        .catch((err) => console.error("Failed to fetch posture data:", err));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!data) return;

    // Only alert for the highest priority error at a time
    for (const err of PRIORITY_ERRORS) {
      if (data[err.key]) {
        if (!lastAlertRef.current[err.key]) {
          showWindowNotification(err.title, err.body);
          if (err.sound) playBeep(700, 0.5);
          lastAlertRef.current[err.key] = true;
        }
        // Reset lower priority errors so they can be triggered next time
        PRIORITY_ERRORS.forEach((e) => {
          if (e.key !== err.key) lastAlertRef.current[e.key] = false;
        });
        break;
      } else {
        lastAlertRef.current[err.key] = false;
      }
    }
  }, [data]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col">
      <header className="w-full px-6 py-4 flex items-center justify-between bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-blue-800 tracking-tight">
          Posture Analysis
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 font-medium">
            Tech Tacticos Spinovate
          </span>
        </div>
      </header>

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
