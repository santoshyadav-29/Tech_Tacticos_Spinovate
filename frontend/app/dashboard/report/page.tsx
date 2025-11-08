"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  Eye, 
  Activity,
  Award,
  ArrowLeft,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface SessionStats {
  duration: number; // in seconds
  avgPostureScore: number;
  avgNeckScore: number;
  avgRollScore: number;
  avgDistanceScore: number;
  totalBlinks: number;
  avgBlinkRate: number;
  alertsCount: number;
  poorPostureTime: number; // seconds with score < 60
  goodPostureTime: number; // seconds with score >= 80
  maxPostureScore: number;
  minPostureScore: number;
  startTime: string;
  endTime: string;
}

export default function SessionReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Retrieve session stats from localStorage
    const storedStats = localStorage.getItem("session_stats");
    if (storedStats) {
      setStats(JSON.parse(storedStats));
    } else {
      // No stats available, redirect back
      router.push("/dashboard/posture-simple");
    }
  }, [router]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getScoreGrade = (score: number): { grade: string; color: string; message: string } => {
    if (score >= 90) return { grade: "A+", color: "text-green-600", message: "Excellent!" };
    if (score >= 80) return { grade: "A", color: "text-green-500", message: "Great Job!" };
    if (score >= 70) return { grade: "B", color: "text-blue-500", message: "Good" };
    if (score >= 60) return { grade: "C", color: "text-yellow-500", message: "Fair" };
    return { grade: "D", color: "text-red-500", message: "Needs Improvement" };
  };

  const getPostureTimePercentage = (time: number, total: number): number => {
    return total > 0 ? (time / total) * 100 : 0;
  };

  const startNewSession = () => {
    // Clear the stats
    localStorage.removeItem("session_stats");
    router.push("/dashboard/posture-simple");
  };

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading report...</div>
      </div>
    );
  }

  const scoreGrade = getScoreGrade(stats.avgPostureScore);
  const goodPosturePercent = getPostureTimePercentage(stats.goodPostureTime, stats.duration);
  const poorPosturePercent = getPostureTimePercentage(stats.poorPostureTime, stats.duration);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/dashboard/posture-simple")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-900">Session Report</h1>
          <p className="text-gray-600 mt-2">
            {new Date(stats.startTime).toLocaleDateString()} • {new Date(stats.startTime).toLocaleTimeString()} - {new Date(stats.endTime).toLocaleTimeString()}
          </p>
        </div>

        {/* Overall Score Card */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-8 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2 opacity-90">Overall Posture Score</h2>
              <div className="flex items-baseline gap-4">
                <span className="text-7xl font-bold">{stats.avgPostureScore.toFixed(0)}%</span>
                <div className="text-left">
                  <div className="text-3xl font-bold">{scoreGrade.grade}</div>
                  <div className="text-sm opacity-90">{scoreGrade.message}</div>
                </div>
              </div>
            </div>
            <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Award className="w-16 h-16" />
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Duration */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Session Duration</h3>
            </div>
            <div className="text-3xl font-bold text-gray-900">{formatDuration(stats.duration)}</div>
            <p className="text-sm text-gray-600 mt-1">Total monitoring time</p>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Posture Alerts</h3>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.alertsCount}</div>
            <p className="text-sm text-gray-600 mt-1">
              {stats.duration > 0 ? (stats.alertsCount / (stats.duration / 60)).toFixed(1) : "0"} alerts/min
            </p>
          </div>

          {/* Blinks */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Eye Health</h3>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.avgBlinkRate.toFixed(1)}</div>
            <p className="text-sm text-gray-600 mt-1">
              Avg blinks/min • {stats.totalBlinks} total
            </p>
          </div>
        </div>

        {/* Posture Quality Timeline */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Posture Quality Distribution
          </h3>
          <div className="space-y-4">
            {/* Good Posture */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-green-700">Good Posture (≥80%)</span>
                <span className="text-sm font-bold text-green-700">
                  {goodPosturePercent.toFixed(1)}% • {formatDuration(stats.goodPostureTime)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${goodPosturePercent}%` }}
                />
              </div>
            </div>

            {/* Poor Posture */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-red-700">Poor Posture (&lt;60%)</span>
                <span className="text-sm font-bold text-red-700">
                  {poorPosturePercent.toFixed(1)}% • {formatDuration(stats.poorPostureTime)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-red-500 h-3 rounded-full transition-all"
                  style={{ width: `${poorPosturePercent}%` }}
                />
              </div>
            </div>

            {/* Average Posture */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-blue-700">Average Posture (60-79%)</span>
                <span className="text-sm font-bold text-blue-700">
                  {(100 - goodPosturePercent - poorPosturePercent).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all"
                  style={{ width: `${100 - goodPosturePercent - poorPosturePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Component Scores Breakdown */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between mb-4"
          >
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Detailed Score Breakdown
            </h3>
            {showDetails ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {showDetails && (
            <div className="grid md:grid-cols-3 gap-4">
              {/* Neck Angle */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Neck Angle</h4>
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {stats.avgNeckScore.toFixed(0)}%
                </div>
                <p className="text-xs text-blue-700">
                  {stats.avgNeckScore >= 80 ? "Great posture!" : stats.avgNeckScore >= 60 ? "Could be better" : "Needs attention"}
                </p>
              </div>

              {/* Head Tilt */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-2">Head Tilt</h4>
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {stats.avgRollScore.toFixed(0)}%
                </div>
                <p className="text-xs text-purple-700">
                  {stats.avgRollScore >= 80 ? "Balanced!" : stats.avgRollScore >= 60 ? "Some tilting" : "Frequent tilting"}
                </p>
              </div>

              {/* Distance */}
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Distance</h4>
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {stats.avgDistanceScore.toFixed(0)}%
                </div>
                <p className="text-xs text-green-700">
                  {stats.avgDistanceScore >= 80 ? "Optimal distance!" : stats.avgDistanceScore >= 60 ? "Adjust slightly" : "Too close/far"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Insights & Recommendations */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4">💡 Key Insights & Recommendations</h3>
          <div className="space-y-3">
            {stats.avgPostureScore >= 80 ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-900 font-medium">✅ Excellent Session!</p>
                <p className="text-green-700 text-sm mt-1">
                  You maintained great posture throughout this session. Keep up the good work!
                </p>
              </div>
            ) : stats.avgPostureScore >= 60 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-900 font-medium">⚠️ Room for Improvement</p>
                <p className="text-yellow-700 text-sm mt-1">
                  Your posture was fair, but there's room to improve. Focus on the components with lower scores.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-900 font-medium">❌ Attention Needed</p>
                <p className="text-red-700 text-sm mt-1">
                  Your posture needs significant improvement. Consider taking more frequent breaks and adjusting your setup.
                </p>
              </div>
            )}

            {stats.avgNeckScore < 70 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-900 font-medium">📐 Neck Angle Alert</p>
                <p className="text-blue-700 text-sm mt-1">
                  You're frequently looking down. Adjust your screen height to eye level to reduce neck strain.
                </p>
              </div>
            )}

            {stats.avgRollScore < 70 && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-purple-900 font-medium">↔️ Head Tilt Alert</p>
                <p className="text-purple-700 text-sm mt-1">
                  You're tilting your head frequently. Try to keep your head centered and balanced over your shoulders.
                </p>
              </div>
            )}

            {stats.avgDistanceScore < 70 && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-orange-900 font-medium">📏 Distance Alert</p>
                <p className="text-orange-700 text-sm mt-1">
                  Your distance from the screen varies too much. Maintain an arm's length distance for optimal ergonomics.
                </p>
              </div>
            )}

            {stats.avgBlinkRate < 10 && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-purple-900 font-medium">👁️ Eye Health Alert</p>
                <p className="text-purple-700 text-sm mt-1">
                  Your blink rate is low, which can lead to dry eyes. Remember to blink regularly and follow the 20-20-20 rule.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <button
            onClick={startNewSession}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold text-lg shadow-lg"
          >
            Start New Session
          </button>
        </div>
      </div>
    </div>
  );
}
