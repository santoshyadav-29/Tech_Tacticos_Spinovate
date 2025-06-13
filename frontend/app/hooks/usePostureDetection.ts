import { useState, useEffect, useRef } from "react";
import axios from "axios";

export function usePostureDetection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [pitch, setPitch] = useState(0);
  const [distance, setDistance] = useState(0);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    };
    startCamera().catch(console.error);
  }, []);

  // Send frame to backend
  useEffect(() => {
    const interval = setInterval(() => {
      if (!videoRef.current) return;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const video = videoRef.current;

      if (!ctx || !video.videoWidth || !video.videoHeight) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const formData = new FormData();
        formData.append("frame", blob);
        try {
          const res = await axios.post("/api/posture", formData);
          const { pitch, distance, videoUrl } = res.data;
          setPitch(pitch);
          setDistance(distance);
          if (videoUrl) setVideoSrc(videoUrl);
        } catch (err) {
          console.error("Backend error:", err);
        }
      }, "image/jpeg");
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return { videoRef, pitch, distance, videoSrc };
}
