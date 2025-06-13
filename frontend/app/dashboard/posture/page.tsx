// posture/page.tsx
"use client";
import React, { useRef, useState } from "react";
import Image from "next/image";

// Generate random points along a "spine" path for demo/animation
function generateSpinePoints(tilt = 0) {
  // tilt: -30 (left) to 30 (right)
  const baseX = 130;
  const baseY = 60;
  const stepY = 60;
  const stepX = 10 + tilt; // tilt controls the "lean"
  return [
    { label: "C2_C7_vert", value: 21.7, x: baseX, y: baseY, color: "#ff4d4f" },
    {
      label: "C7_T3_vert",
      value: 26.5,
      x: baseX + stepX,
      y: baseY + stepY,
      color: "#ff4d4f",
    },
    {
      label: "C7_T3_T8",
      value: 160.4,
      x: baseX + stepX * 2,
      y: baseY + stepY * 2,
      color: "#ff4d4f",
    },
    {
      label: "T3_T8_T12",
      value: 153.4,
      x: baseX + stepX * 3,
      y: baseY + stepY * 3,
      color: "#ffb300",
    },
    {
      label: "T8_T12_L3",
      value: 178.5,
      x: baseX + stepX * 4,
      y: baseY + stepY * 4,
      color: "#00b894",
    },
    {
      label: "T12_L3_S",
      value: 170.3,
      x: baseX + stepX * 5,
      y: baseY + stepY * 5,
      color: "#00b894",
    },
  ];
}

const dummyResult = {
  score: 72,
  feedback: [
    "Neck angle is slightly forward.",
    "Upper back is rounded.",
    "Lower back alignment is good.",
  ],
};

const PosturePage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [tilt, setTilt] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [error, setError] = useState<string>("");

  // Animate tilt for demo
  React.useEffect(() => {
    if (!animating) return;
    let frame = 0;
    let direction = 1;
    const animate = () => {
      setTilt((prev) => {
        if (prev >= 30) direction = -1;
        if (prev <= -30) direction = 1;
        return prev + direction * 2;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [animating]);

  // Open webcam
  const handleOpenCamera = async () => {
    setError("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported by this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for metadata before playing and setting cameraOpen
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraOpen(true);
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      if (
        errorMessage.includes("Permission denied") ||
        errorMessage.includes("NotAllowedError")
      ) {
        setError(
          "Camera access denied. Please allow camera permissions and try again."
        );
      } else if (
        errorMessage.includes("NotFoundError") ||
        errorMessage.includes("DevicesNotFoundError")
      ) {
        setError("No camera found. Please connect a camera and try again.");
      } else if (errorMessage.includes("NotReadableError")) {
        setError(
          "Camera is being used by another application. Please close other apps and try again."
        );
      } else {
        setError(`Unable to access camera: ${errorMessage}`);
      }
      setCameraOpen(false);
    }
  };

  // Close webcam
  const handleCloseCamera = () => {
    setError("");
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  };

  // For demo, animate the posture line
  const handleStartAnimation = () => setAnimating(true);
  const handleStopAnimation = () => setAnimating(false);

  const points = generateSpinePoints(tilt);

  return (
    <div className="flex flex-col md:flex-row gap-8 p-6">
      {/* Camera Section */}
      <div className="flex-1 flex flex-col items-center bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold text-[#0d3b66] mb-4">
          Posture Detection
        </h2>
        <div className="flex gap-4 mb-4">
          <button
            onClick={handleOpenCamera}
            disabled={cameraOpen}
            className="px-6 py-2 bg-[#27a1ff] text-white rounded-lg font-semibold shadow hover:bg-[#0d3b66] transition disabled:opacity-50"
          >
            Open Camera
          </button>
          <button
            onClick={handleCloseCamera}
            disabled={!cameraOpen}
            className="px-6 py-2 bg-[#f44336] text-white rounded-lg font-semibold shadow hover:bg-[#b71c1c] transition disabled:opacity-50"
          >
            Close Camera
          </button>
        </div>
        {error && (
          <div className="w-full max-w-md mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        <div className="w-full flex justify-center">
          <div className="relative w-[320px] h-[240px] bg-[#eaf3fb] rounded-lg overflow-hidden border border-[#b2b8d6]">
            <video
              ref={videoRef}
              width={320}
              height={240}
              className="object-cover w-full h-full"
              autoPlay
              playsInline
              muted
              style={{ display: cameraOpen ? "block" : "none" }}
            />
            {!cameraOpen && (
              <div className="flex items-center justify-center w-full h-full text-[#b2b8d6] absolute inset-0 bg-[#eaf3fb]">
                Camera is off
              </div>
            )}
          </div>
        </div>

        {/* Animation controls for demo */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleStartAnimation}
            disabled={animating}
            className="px-4 py-1 bg-[#27a1ff] text-white rounded shadow hover:bg-[#0d3b66] transition disabled:opacity-50"
          >
            Animate Posture
          </button>
          <button
            onClick={handleStopAnimation}
            disabled={!animating}
            className="px-4 py-1 bg-[#f44336] text-white rounded shadow hover:bg-[#b71c1c] transition disabled:opacity-50"
          >
            Stop Animation
          </button>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <span className="text-[#0d3b66]">Tilt:</span>
          <input
            type="range"
            min={-30}
            max={30}
            value={tilt}
            onChange={(e) => setTilt(Number(e.target.value))}
            className="w-32"
            disabled={animating}
          />
          <span className="text-[#0d3b66]">{tilt}°</span>
        </div>
      </div>

      {/* Result Section */}
      <div className="flex-1 flex flex-col items-center bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold text-[#0d3b66] mb-4">
          Analysis Result
        </h2>
        {/* Posture Score */}
        <div className="mb-4 flex flex-col items-center">
          <span className="text-5xl font-extrabold text-[#27a1ff]">
            {dummyResult.score}
          </span>
          <span className="text-lg text-[#0d3b66] font-medium">
            Posture Score
          </span>
        </div>
        {/* Spine Visualization */}
        <div className="relative w-[260px] h-[400px] mx-auto mb-6">
          {/* Spine image */}
          <Image
            width={180}
            height={400}
            src="/spine.png"
            alt="Spine"
            className="absolute left-1/2 top-0 -translate-x-1/2 z-0 transition-transform duration-300"
            style={{
              transform: `translateX(-50%) rotate(${tilt / 6}deg)`,
            }}
            draggable={false}
          />
          {/* Overlay lines and points */}
          <svg className="absolute left-0 top-0 w-full h-full z-10 pointer-events-none">
            {/* Draw lines between points */}
            {points.map((pt, idx) =>
              idx < points.length - 1 ? (
                <line
                  key={idx}
                  x1={points[idx].x}
                  y1={points[idx].y}
                  x2={points[idx + 1].x}
                  y2={points[idx + 1].y}
                  stroke="#27a1ff"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                />
              ) : null
            )}
            {/* Draw points */}
            {points.map((pt, idx) => (
              <circle
                key={pt.label}
                cx={pt.x}
                cy={pt.y}
                r="10"
                fill={pt.color}
                stroke="#fff"
                strokeWidth="3"
              />
            ))}
            {/* Draw labels */}
            {points.map((pt, idx) => (
              <text
                key={pt.label + "_label"}
                x={pt.x + 15}
                y={pt.y}
                fill="#0d3b66"
                fontSize="14"
                fontWeight="bold"
                alignmentBaseline="middle"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                {pt.label}
              </text>
            ))}
          </svg>
        </div>
        {/* Feedback */}
        <div className="w-full">
          <h3 className="text-lg font-semibold text-[#0d3b66] mb-2">
            Feedback
          </h3>
          <ul className="list-disc pl-6 text-[#144e7a]">
            {dummyResult.feedback.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PosturePage;
