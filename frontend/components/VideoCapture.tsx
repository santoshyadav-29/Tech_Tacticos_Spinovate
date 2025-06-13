import React, { useState, useRef } from "react";

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
  videoSrc: string | null;
  pitch: number;
  distance: number;
}

export const VideoCapture: React.FC<Props> = ({
  videoRef,
  videoSrc,
  pitch,
  distance,
}) => {
  return (
    <section className="flex flex-col items-center md:w-1/3 w-full">
      <div className="rounded-2xl overflow-hidden shadow-lg border bg-black w-full max-w-xs aspect-[4/3]">
        <video
          ref={videoRef}
          autoPlay={!videoSrc}
          loop={!!videoSrc}
          muted
          className="w-full h-full object-cover"
          src={videoSrc || undefined}
        />
      </div>
      <div className="mt-6 bg-white rounded-xl shadow px-6 py-4 w-full max-w-xs flex flex-col items-center">
        <div className="flex items-center gap-2 text-gray-700">
          <span className="font-semibold">Distance:</span>
          <span className="font-mono">{distance.toFixed(1)} cm</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700 mt-1">
          <span className="font-semibold">Pitch:</span>
          <span className="font-mono">{pitch.toFixed(1)}°</span>
        </div>
      </div>
    </section>
  );
};

export function usePostureDetection() {
  const [pitch, setPitch] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  async function analyzePosture(imageData: Blob) {
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", imageData);

      const res = await fetch("/api/posture", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Backend error");

      const data = await res.json();
      setPitch(data.pitch);
      setDistance(data.distance);
      setVideoSrc(data.videoUrl);
    } catch (err) {
      setError("Could not connect to posture analysis backend.");
      setPitch(null);
      setDistance(null);
      setVideoSrc(null);
    }
  }

  return { videoRef, pitch, distance, videoSrc, error, analyzePosture };
}
