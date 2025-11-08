"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, Settings, ArrowLeft, User, Camera, Eye, Ruler } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

interface UserThresholds {
  pitch_threshold: number
  distance_min: number
  distance_max: number
  ear_threshold: number
}

interface CalibrationScenario {
  id: string
  name: string
  completed: boolean
}

export default function CalibrationResultsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string>("")
  const [thresholds, setThresholds] = useState<UserThresholds | null>(null)
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>("")
  
  const scenarios: CalibrationScenario[] = [
    { id: "neutral", name: "Neutral Sitting Position", completed: false },
    { id: "slouched", name: "Slouched Position", completed: false },
    { id: "yawning", name: "Yawning Detection", completed: false },
  ]

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id")
    const calibrationStatus = localStorage.getItem("is_calibrated")
    
    if (!storedUserId) {
      setError("No user ID found. Please go back to the main page.")
      setLoading(false)
      return
    }

    setUserId(storedUserId)
    setIsCalibrated(calibrationStatus === "true")
    
    // Fetch user thresholds from backend
    fetchUserThresholds(storedUserId)
  }, [])

  const fetchUserThresholds = async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/calibration/thresholds/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setThresholds(data)
      } else {
        console.error("Failed to fetch thresholds, status:", response.status)
        setError("Failed to load calibration data")
      }
    } catch (err) {
      console.error("Error fetching thresholds:", err)
      setError("Could not connect to server")
    } finally {
      setLoading(false)
    }
  }

  const getThresholdStatus = (value: number | undefined, type: string) => {
    if (!value) return { color: "text-gray-400", label: "Not Set" }
    
    switch (type) {
      case "pitch":
        return { color: "text-blue-600", label: "Configured" }
      case "distance_min":
        return { color: "text-green-600", label: `${value} cm` }
      case "distance_max":
        return { color: "text-green-600", label: `${value} cm` }
      case "ear":
        return { color: "text-purple-600", label: value.toFixed(2) }
      default:
        return { color: "text-gray-600", label: String(value) }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading calibration data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-4 text-center">Error</h2>
          <p className="text-gray-700 mb-6 text-center">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Calibration Settings
              </h1>
              <p className="text-gray-600">
                View your personalized posture monitoring thresholds
              </p>
            </div>
            
            {isCalibrated ? (
              <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Calibrated</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full">
                <Settings className="w-5 h-5 animate-spin" />
                <span className="font-semibold">Not Calibrated</span>
              </div>
            )}
          </div>
        </div>

        {/* User ID Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">User ID</p>
              <p className="text-lg font-mono font-semibold text-gray-900">{userId}</p>
            </div>
          </div>
        </div>

        {/* Calibration Status */}
        {!isCalibrated && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2">Calibration Required</h3>
            <p className="text-yellow-800 mb-4">
              You haven't completed the calibration process yet. Complete calibration to get personalized monitoring thresholds.
            </p>
            <button
              onClick={() => router.push("/dashboard/calibration")}
              className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Start Calibration
            </button>
          </div>
        )}

        {/* Thresholds Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Posture Angle Threshold */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Camera className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Posture Angle</h3>
                <p className="text-sm text-gray-500">Head tilt threshold</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${getThresholdStatus(thresholds?.pitch_threshold, "pitch").color}`}>
                {thresholds?.pitch_threshold ? `${thresholds.pitch_threshold}°` : "—"}
              </span>
              <span className="text-sm text-gray-500">
                {getThresholdStatus(thresholds?.pitch_threshold, "pitch").label}
              </span>
            </div>
          </div>

          {/* Eye Aspect Ratio (EAR) */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Eye Aspect Ratio</h3>
                <p className="text-sm text-gray-500">Drowsiness detection</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${getThresholdStatus(thresholds?.ear_threshold, "ear").color}`}>
                {thresholds?.ear_threshold ? thresholds.ear_threshold.toFixed(3) : "—"}
              </span>
              <span className="text-sm text-gray-500">
                {getThresholdStatus(thresholds?.ear_threshold, "ear").label}
              </span>
            </div>
          </div>

          {/* Minimum Distance */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Ruler className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Minimum Distance</h3>
                <p className="text-sm text-gray-500">Closest safe distance</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${getThresholdStatus(thresholds?.distance_min, "distance_min").color}`}>
                {thresholds?.distance_min ? `${thresholds.distance_min}` : "—"}
              </span>
              <span className="text-sm text-gray-500">cm</span>
            </div>
          </div>

          {/* Maximum Distance */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Ruler className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Maximum Distance</h3>
                <p className="text-sm text-gray-500">Furthest safe distance</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${getThresholdStatus(thresholds?.distance_max, "distance_max").color}`}>
                {thresholds?.distance_max ? `${thresholds.distance_max}` : "—"}
              </span>
              <span className="text-sm text-gray-500">cm</span>
            </div>
          </div>
        </div>

        {/* Scenarios Completed */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-semibold text-lg text-gray-900 mb-4">Calibration Scenarios</h3>
          <div className="space-y-3">
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-700">{scenario.name}</span>
                {isCalibrated ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-300" />
                )}
              </div>
            ))}
          </div>
          
          {isCalibrated && (
            <button
              onClick={() => router.push("/dashboard/calibration")}
              className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Recalibrate
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
