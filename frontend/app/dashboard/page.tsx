"use client";
import React from "react";
import {
  CheckCircle,
  AlertTriangle,
  Eye,
  Target,
  Zap,
  Clock,
  UserCheck,
  Monitor,
} from "lucide-react";
import { monitoringStatus, useMonitoringReport } from "../hooks/monitoringReportSection";

// Type for your posture report data
type PostureReportData = {
  start_time?: string;
  stop_time?: string;
  session_duration_min: number;
  time_face_visible_min: number;
  avg_distance_cm: number;
  time_good_distance_min: number;
  avg_pitch_deg: number;
  bad_posture_time_min: number;
  bad_posture_events: number;
  max_good_posture_streak_sec: number;
  avg_brightness: number;
  max_brightness: number;
  high_brightness_time_min: number;
  high_brightness_events: number;
  face_missing_time_min: number;
  drowsiness_time_min: number;
  drowsiness_events: number;
  yawns_detected: number;
  session_score: number;
};

const CircularProgress: React.FC<{ percentage: number; color?: string }> = ({
  percentage,
  color = "#2563eb",
}) => {
  const size = 110;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="block mx-auto">
      <circle
        stroke="#e5e7eb"
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      <circle
        stroke={color}
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy="0.3em"
        fontSize="2rem"
        fontWeight="bold"
        fill="#1e293b"
      >
        {Math.round(percentage)}%
      </text>
    </svg>
  );
};

const PostureReport: React.FC = () => {
  const isMonitoring = monitoringStatus();
  const report = useMonitoringReport(!!isMonitoring);

  if (isMonitoring === null) {
    return <div className="p-8 text-gray-500">Loading monitoring status...</div>;
  }

  if (!report) {
    return <div className="p-8 text-gray-500">Loading posture report...</div>;
  }

  // Show last session start/stop if available
  let sessionInfo = null;
  if (report.start_time && report.stop_time) {
    sessionInfo = (
      <div className="mb-4 text-blue-700 text-sm flex items-center">
        <Monitor className="mr-2" size={18} />
        Last session was started at {new Date(report.start_time).toLocaleString()} and ended at {new Date(report.stop_time).toLocaleString()}
      </div>
    );
  } else if (report.start_time) {
    sessionInfo = (
      <div className="mb-4 text-blue-700 text-sm flex items-center">
        <Monitor className="mr-2" size={18} />
        Last session was started at {new Date(report.start_time).toLocaleString()}
      </div>
    );
  }

  // Derived metrics
  const faceVisibilityRate =
    (report.time_face_visible_min / report.session_duration_min) * 100;
  const goodPostureRate =
    ((report.session_duration_min - report.bad_posture_time_min) /
      report.session_duration_min) *
    100;
  const goodDistanceRate =
    (report.time_good_distance_min / report.session_duration_min) * 100;

  return (
    <div className="p-8">
      {/* Title */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-blue-900 mb-2">
          Posture Report
        </h2>
        {sessionInfo}
        <p className="text-gray-500">
          Session Duration: {(report.session_duration_min * 60).toFixed(0)} sec
        </p>
      </div>

      {/* Main Score */}
      <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col md:flex-row items-center mb-8">
        <div className="flex-1 flex flex-col items-center">
          <CircularProgress percentage={report.session_score} color="#22c55e" />
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center text-green-600 font-semibold text-lg">
              <CheckCircle size={20} className="mr-2" />
              Excellent Posture!
            </div>
            <div className="text-gray-500 text-sm">
              Keep up the great work maintaining proper posture.
            </div>
          </div>
        </div>
        <div className="flex-1 mt-8 md:mt-0 md:ml-8 grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center bg-blue-50 rounded-lg p-4">
            <Eye className="text-blue-500 mb-2" size={28} />
            <span className="font-bold text-xl text-blue-700">
              {faceVisibilityRate.toFixed(0)}%
            </span>
            <span className="text-xs text-gray-500">Face Visible</span>
          </div>
          <div className="flex flex-col items-center bg-green-50 rounded-lg p-4">
            <UserCheck className="text-green-500 mb-2" size={28} />
            <span className="font-bold text-xl text-green-700">
              {goodPostureRate.toFixed(0)}%
            </span>
            <span className="text-xs text-gray-500">Good Posture</span>
          </div>
          <div className="flex flex-col items-center bg-purple-50 rounded-lg p-4">
            <Target className="text-purple-500 mb-2" size={28} />
            <span className="font-bold text-xl text-purple-700">
              {report.avg_distance_cm.toFixed(0)}cm
            </span>
            <span className="text-xs text-gray-500">Avg Distance</span>
          </div>
          <div className="flex flex-col items-center bg-yellow-50 rounded-lg p-4">
            <AlertTriangle className="text-yellow-500 mb-2" size={28} />
            <span className="font-bold text-xl text-yellow-700">
              {report.bad_posture_events}
            </span>
            <span className="text-xs text-gray-500">Bad Posture Events</span>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Posture Details */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-semibold text-blue-900 mb-4">
            Posture Details
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Best Streak</span>
              <span className="font-bold text-green-700">
                {report.max_good_posture_streak_sec.toFixed(1)}s
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg Head Pitch</span>
              <span className="font-bold text-blue-700">
                {report.avg_pitch_deg.toFixed(1)}°
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Face Missing</span>
              <span className="font-bold text-red-500">
                {(report.face_missing_time_min * 60).toFixed(0)}s
              </span>
            </div>
          </div>
        </div>
        {/* Environment & Alerts */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-semibold text-blue-900 mb-4">
            Environment & Wellness
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <Zap className="text-yellow-500 mr-1" size={18} />
                Avg Brightness
              </span>
              <span className="font-bold text-yellow-700">
                {report.avg_brightness.toFixed(0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">High Brightness Events</span>
              <span className="font-bold text-orange-600">
                {report.high_brightness_events}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Yawns Detected</span>
              <span className="font-bold text-gray-700">
                {report.yawns_detected}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Drowsiness Events</span>
              <span className="font-bold text-gray-700">
                {report.drowsiness_events}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl shadow p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Recommendations</h3>
        <ul className="list-disc pl-6 text-gray-700 text-sm space-y-1">
          <li>Maintain your current distance from the screen (60-70cm is ideal).</li>
          <li>Take micro-breaks every 20 minutes to stretch and reset posture.</li>
          <li>Keep your workspace well-lit, but avoid excessive brightness.</li>
          <li>Stay hydrated and blink regularly to reduce eye strain.</li>
        </ul>
      </div>
    </div>
  );
};

export default PostureReport;
