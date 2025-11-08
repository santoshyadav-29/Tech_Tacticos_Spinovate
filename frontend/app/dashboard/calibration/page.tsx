"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Camera, ArrowRight } from "lucide-react";

interface Scenario {
  id: string;
  name: string;
  description: string;
  duration: number;
}

interface CalibrationResponse {
  user_id: string;
  scenarios: Scenario[];
  instructions: string;
  status: string;
}

export default function CalibrationPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [completedScenarios, setCompletedScenarios] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const initializeWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      setError("Failed to access webcam");
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCalibrationSession = async (uid: string) => {
    try {
      const response = await fetch(`${API_URL}/calibration/start/${uid}`, {
        method: "POST",
      });
      const data: CalibrationResponse = await response.json();
      setScenarios(data.scenarios);
    } catch (err) {
      setError("Failed to start calibration session");
    }
  };

  // Get user ID and start calibration
  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    if (storedUserId) {
      setUserId(storedUserId);
      startCalibrationSession(storedUserId);
    } else {
      setError("No user ID found. Please go back to the main page.");
    }

    // Initialize webcam immediately when page loads
    initializeWebcam();

    return () => {
      // Cleanup: Stop webcam if active
      stopWebcam();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const connectAndCaptureData = async (scenario: Scenario) => {
    return new Promise<void>((resolve, reject) => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = API_URL.replace(/^https?:\/\//, "");
      const wsUrl = `${protocol}//${host}/ws/video`;

      const ws = new WebSocket(wsUrl);
      let dataReceived = false;

      ws.onopen = () => {
        const frame = captureFrame();
        if (frame) {
          ws.send(
            JSON.stringify({
              user_id: userId,
              frame: frame,
              timestamp: Date.now() / 1000,
            })
          );
        }
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        if (data.posture_score && !dataReceived) {
          dataReceived = true;
          
          console.log("Calibration data received:", data);
          
          // Send calibration data to backend using raw metrics
          try {
            await fetch(`${API_URL}/calibration/capture/${userId}/${scenario.id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pitch_angle: data.pitch_angle || data.posture_angles?.["Degree of Anteversion of Cervical Spine (y1)"],
                distance: data.distance, // Use actual distance value from backend
                ear: data.ear_value || data.blink_detection.ear_value,
              }),
            });

            ws.close();
            resolve();
          } catch (err) {
            ws.close();
            reject(err);
          }
        }
      };

      ws.onerror = () => {
        reject(new Error("WebSocket connection failed"));
      };

      setTimeout(() => {
        ws.close();
        if (!dataReceived) {
          reject(new Error("Timeout waiting for data"));
        }
      }, 10000);
    });
  };

  const startScenarioCapture = async () => {
    const scenario = scenarios[currentScenarioIndex];
    setIsCapturing(true);
    
    setCountdown(scenario.duration);

    // Countdown
    for (let i = scenario.duration; i > 0; i--) {
      setCountdown(i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Capture data
    try {
      await connectAndCaptureData(scenario);
      setCompletedScenarios([...completedScenarios, scenario.id]);
      setIsCapturing(false);
      setCountdown(0);

      // Move to next scenario or complete
      if (currentScenarioIndex < scenarios.length - 1) {
        setCurrentScenarioIndex(currentScenarioIndex + 1);
      } else {
        await completeCalibration();
      }
    } catch (err) {
      setError("Failed to capture calibration data");
      setIsCapturing(false);
      setCountdown(0);
    }
  };

  const completeCalibration = async () => {
    try {
      await fetch(`${API_URL}/calibration/complete/${userId}`, {
        method: "POST",
      });
      localStorage.setItem("is_calibrated", "true");
      setIsComplete(true);
    } catch (err) {
      setError("Failed to complete calibration");
    }
  };

  const currentScenario = scenarios[currentScenarioIndex];

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.push("/dashboard/posture-simple")}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Calibration Complete!</h2>
          <p className="text-gray-600 mb-6">
            Your personalized posture thresholds have been set. You'll now get more accurate tracking tailored to your body.
          </p>
          <button
            onClick={() => router.push("/dashboard/posture-simple")}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
          >
            Start Monitoring <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Posture Calibration</h1>
          <p className="text-gray-600 mt-2">
            Complete these scenarios to personalize your posture tracking
          </p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-600">Progress</span>
            <span className="text-sm font-medium text-blue-600">
              {completedScenarios.length} / {scenarios.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${(completedScenarios.length / scenarios.length) * 100}%`,
              }}
            />
          </div>
          <div className="mt-4 flex gap-2">
            {scenarios.map((scenario, index) => (
              <div
                key={scenario.id}
                className={`flex-1 h-2 rounded ${
                  completedScenarios.includes(scenario.id)
                    ? "bg-green-500"
                    : index === currentScenarioIndex
                    ? "bg-blue-500"
                    : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Video */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              Camera View
            </h3>
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {isCapturing && countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-white text-8xl font-bold">{countdown}</div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            {currentScenario && (
              <>
                <h3 className="font-semibold text-2xl mb-2 text-gray-900">
                  {currentScenario.name}
                </h3>
                <p className="text-gray-600 mb-6">{currentScenario.description}</p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-900 mb-2">Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
                    <li>Position yourself according to the description above</li>
                    <li>Click "Start Capture" when ready</li>
                    <li>Hold the position for {currentScenario.duration} seconds</li>
                    <li>Stay still during the countdown</li>
                  </ol>
                </div>

                <button
                  onClick={startScenarioCapture}
                  disabled={isCapturing}
                  className={`w-full px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                    isCapturing
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isCapturing ? "Capturing..." : "Start Capture"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
