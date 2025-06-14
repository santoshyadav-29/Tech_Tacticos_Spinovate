"use client";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { usePostureDetection } from "@/app/hooks/usePostureDetection";
import { VideoCapture } from "@/components/VideoCapture";
import { AngleStats } from "@/components/AngleStats";
import { computeAngles, getFeedback } from "@/app/utils/postureUtils";
import { Play, Square, AlertCircle, Loader2 } from "lucide-react";

// Error Boundary Component
class PostureErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PostureErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="text-red-500 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-red-700 mb-2">Something went wrong</h3>
            <p className="text-red-600 text-center mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Video Stream Component with Error Handling
const VideoStream: React.FC<{
  isMonitoring: boolean;
  onError: (error: string) => void;
}> = ({ isMonitoring, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const stopStream = useCallback(() => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setStreamError(null);
    } catch (error) {
      console.error('Error stopping stream:', error);
    }
  }, []);

  const startStream = useCallback(async () => {
    try {
      setIsLoading(true);
      setStreamError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';
      setStreamError(errorMessage);
      onError(errorMessage);
      console.error('Error starting stream:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    if (isMonitoring) {
      startStream();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isMonitoring, startStream, stopStream]);

  if (streamError) {
    return (
      <div className="w-full h-96 bg-red-50 border-2 border-red-200 rounded-lg flex flex-col items-center justify-center">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <p className="text-red-600 text-center mb-4">{streamError}</p>
        <button
          onClick={startStream}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry Camera Access
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <span className="ml-3 text-gray-600">Starting camera...</span>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-96 bg-gray-100 rounded-lg object-cover"
        onError={() => {
          const error = "Video playback error";
          setStreamError(error);
          onError(error);
        }}
      />
    </div>
  );
};

export default function PosturePage() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  // Safe hook usage with error handling
  const [postureData, setPostureData] = useState({
    pitch: 0,
    distance: 0,
    postureAngles: {}
  });

  const { pitch, distance, postureAngles } = useMemo(() => {
    try {
      // Only call the hook when monitoring is active
      if (isMonitoring) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return usePostureDetection();
      }
      return postureData;
    } catch (error) {
      console.error('Error in usePostureDetection:', error);
      setError('Failed to initialize posture detection');
      return postureData;
    }
  }, [isMonitoring, postureData]);

  // Update session duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isMonitoring && sessionStartTime) {
      interval = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring, sessionStartTime]);

  const handleStartMonitoring = useCallback(async () => {
    try {
      setError(null);
      setIsMonitoring(true);
      setSessionStartTime(new Date());
      setSessionDuration(0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start monitoring';
      setError(errorMessage);
      console.error('Error starting monitoring:', error);
    }
  }, []);

  const handleStopMonitoring = useCallback(() => {
    try {
      setIsMonitoring(false);
      setSessionStartTime(null);
      setSessionDuration(0);
    } catch (error) {
      console.error('Error stopping monitoring:', error);
    }
  }, []);

  const handleVideoError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsMonitoring(false);
  }, []);

  // Map backend keys to new display names
  const angleNameMap: Record<string, string> = {
    "Degree of Anteversion of Cervical Spine (y1)": "Cervical",
    "T1 Slope (y2)": "T1Slope",
    "Upper Thoracic Kyphosis Angle (y3)": "UpperThoracic",
    "Middle and Lower Thoracic Kyphosis Angle (y4)": "MidLowerThoracic",
    "T8-T12-L3 Angle (new)": "T8T12L3",
    "Lumbar Lordosis Angle (y5)": "LumbarLordosis",
  };

  const remappedAngles = useMemo(() => {
    try {
      if (!postureAngles) return {};
      const out: Record<string, number> = {};
      Object.entries(postureAngles).forEach(([key, value]) => {
        const mapped = angleNameMap[key] || key;
        out[mapped] = value;
      });
      return out;
    } catch (error) {
      console.error('Error remapping angles:', error);
      return {};
    }
  }, [postureAngles]);

  const angles = useMemo(() => {
    try {
      return computeAngles(distance, pitch);
    } catch (error) {
      console.error('Error computing angles:', error);
      return {};
    }
  }, [distance, pitch]);

  const feedback = useMemo(() => {
    try {
      return getFeedback(distance, pitch, angles);
    } catch (error) {
      console.error('Error generating feedback:', error);
      return ['Unable to generate feedback'];
    }
  }, [distance, pitch, angles]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <PostureErrorBoundary>
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col">
        <header className="w-full px-6 py-4 flex items-center justify-between bg-white shadow-sm">
          <h1 className="text-2xl font-bold text-blue-800 tracking-tight">
            Posture Analysis
          </h1>
          <div className="flex items-center space-x-4">
            {isMonitoring && (
              <div className="text-sm text-gray-600">
                Session: {formatDuration(sessionDuration)}
              </div>
            )}
            <span className="text-gray-500 font-medium">
              Tech Tacticos Spinovate
            </span>
          </div>
        </header>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="text-red-500 mr-3 flex-shrink-0" size={20} />
            <span className="text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex justify-center mt-6 space-x-4">
          {!isMonitoring ? (
            <button
              onClick={handleStartMonitoring}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Play size={20} className="mr-2" />
              Start Monitoring
            </button>
          ) : (
            <button
              onClick={handleStopMonitoring}
              className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <Square size={20} className="mr-2" />
              Stop Monitoring
            </button>
          )}
        </div>

        <main className="flex-1 flex flex-col lg:flex-row gap-8 px-6 py-8 max-w-7xl mx-auto w-full">
          {/* Video Stream */}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-blue-700 mb-4">Live Feed</h2>
            <VideoStream 
              isMonitoring={isMonitoring} 
              onError={handleVideoError}
            />
          </div>

          {/* Angle Stats */}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-blue-700 mb-4">Angle Analysis</h2>
            <PostureErrorBoundary fallback={
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-700">Unable to load angle statistics</p>
              </div>
            }>
              <AngleStats angles={remappedAngles} />
            </PostureErrorBoundary>
          </div>
        </main>

        {/* Feedback Section */}
        <section className="w-full flex justify-center mt-2 mb-8">
          <div className="bg-white rounded-xl shadow px-8 py-6 max-w-2xl w-full flex flex-col items-center">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">
              Posture Feedback
            </h3>
            <PostureErrorBoundary fallback={
              <p className="text-gray-500">Unable to generate feedback</p>
            }>
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
            </PostureErrorBoundary>
          </div>
        </section>

        <footer className="w-full py-4 text-center text-gray-400 text-xs border-t bg-white">
          &copy; {new Date().getFullYear()} Tech Tacticos Spinovate. All rights
          reserved.
        </footer>
      </div>
    </PostureErrorBoundary>
  );
}
