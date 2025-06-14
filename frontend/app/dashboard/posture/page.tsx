"use client";
import React, { useEffect, useMemo, useState } from "react";
import { usePostureDetection } from "@/app/hooks/usePostureDetection";
import { VideoCapture } from "@/components/VideoCapture";
import { AngleStats } from "@/components/AngleStats";
// import { StickFigure } from "@/components/StickFigure"; // if you modularize it

import { computeAngles, getFeedback } from "@/app/utils/postureUtils"; // optional: extract these too
import { startMonitoring, stopCamera, stopMonitoring } from "@/app/hooks/monitoringReportSection";
import { useRouter } from "next/navigation";

export default function PosturePage() {
  const router = useRouter();
  const [isMonitoring, setIsMonitoring] = useState(() => {
      if (typeof window !== "undefined") {
        return localStorage.getItem("isMonitoring") === "true";
      }
      return false;
    });

  // Use usePostureDetection only when isMonitoring is true
  const { pitch, distance, postureAngles } = usePostureDetection(isMonitoring);

  // Map backend keys to new display names, keeping values the same
  const angleNameMap: Record<string, string> = {
    "Degree of Anteversion of Cervical Spine (y1)": "Cervical",
    "T1 Slope (y2)": "T1Slope",
    "Upper Thoracic Kyphosis Angle (y3)": "UpperThoracic",
    "Middle and Lower Thoracic Kyphosis Angle (y4)": "MidLowerThoracic",
    "T8-T12-L3 Angle (new)": "T8T12L3",
    "Lumbar Lordosis Angle (y5)": "LumbarLordosis",
  };

  // Remap postureAngles keys for display
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

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col">
      <header className="w-full px-6 py-4 flex items-center justify-between bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-blue-800 tracking-tight">
          Posture Analysis
        </h1>
        <span className="text-gray-500 font-medium">
          Tech Tacticos Spinovate
        </span>
      </header>

      {/* Control Buttons Section */}
      <section className="w-full flex justify-center py-6">
        <div className="flex gap-4">
          {!isMonitoring ? (
            <button
              onClick={handleStartMonitoring}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Monitoring
            </button>
          ) : (
            <button
              onClick={handleEndSession}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6 6m0-6l-6 6" />
              </svg>
              End Session
            </button>
          )}
        </div>
      </section>

      <main className="flex-1 flex flex-col md:flex-row gap-8 px-6 py-8 max-w-7xl mx-auto w-full">
        {/* Camera Feed Section */}
        <div className="flex-1 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Live Feed</h2>
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
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 font-medium">Camera is off</p>
                <p className="text-gray-400 text-sm">Click "Start Monitoring" to begin</p>
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
