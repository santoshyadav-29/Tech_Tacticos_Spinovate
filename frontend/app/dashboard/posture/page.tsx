"use client";
import React, { useMemo } from "react";
import { usePostureDetection } from "@/app/hooks/usePostureDetection";
import { VideoCapture } from "@/components/VideoCapture";
import { AngleStats } from "@/components/AngleStats";
// import { StickFigure } from "@/components/StickFigure"; // if you modularize it

import { computeAngles, getFeedback } from "@/app/utils/postureUtils"; // optional: extract these too

export default function PosturePage() {
  const { videoRef, pitch, distance, videoSrc } = usePostureDetection();

  const angles = useMemo(
    () => computeAngles(distance, pitch),
    [distance, pitch]
  );
  const feedback = useMemo(
    () => getFeedback(distance, pitch, angles),
    [distance, pitch, angles]
  );

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
      <main className="flex-1 flex flex-col md:flex-row gap-8 px-6 py-8 max-w-7xl mx-auto w-full">
        <VideoCapture
          videoRef={videoRef}
          pitch={pitch}
          distance={distance}
          videoSrc={videoSrc}
        />
        {/* <StickFigure angles={angles} /> */}
        <AngleStats angles={angles} />
      </main>

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

      <footer className="w-full py-4 text-center text-gray-400 text-xs border-t bg-white">
        &copy; {new Date().getFullYear()} Tech Tacticos Spinovate. All rights
        reserved.
      </footer>
    </div>
  );
}
