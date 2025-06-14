"use client"
import type React from "react"
import {
  CheckCircle,
  AlertTriangle,
  Eye,
  Target,
  Zap,
  Monitor,
  XCircle,
  Activity,
  Sun,
  Moon,
  TrendingUp,
  TrendingDown,
  EyeOff,
  Coffee,
  Award,
  BarChart3,
  Lightbulb,
  Timer,
} from "lucide-react"
import { monitoringStatus, useMonitoringReport } from "../hooks/monitoringReportSection"

// Enhanced Circular Progress with gradient
type CircularProgressProps = {
  percentage: number
  color?: string
  size?: number
  strokeWidth?: number
  showGradient?: boolean
}

const CircularProgress = ({
  percentage,
  color = "#2563eb",
  size = 110,
  strokeWidth = 8,
  showGradient = true,
}: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className="relative">
      <svg width={size} height={size} className="block mx-auto transform -rotate-90">
        {showGradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={`${color}80`} />
            </linearGradient>
          </defs>
        )}
        <circle stroke="#f1f5f9" fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        <circle
          stroke={showGradient ? `url(#${gradientId})` : color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{Math.round(percentage)}%</div>
        </div>
      </div>
    </div>
  )
}

// Horizontal Bar Chart Component
const HorizontalBar = ({
  percentage,
  color,
  height = 8,
  showLabel = true,
  animated = true,
}: {
  percentage: number
  color: string
  height?: number
  showLabel?: boolean
  animated?: boolean
}) => (
  <div className="w-full">
    <div className={`bg-gray-200 rounded-full overflow-hidden`} style={{ height }}>
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-out ${animated ? "animate-pulse" : ""}`}
        style={{
          width: `${percentage}%`,
          backgroundColor: color,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
        }}
      />
    </div>
    {showLabel && (
      <div className="flex justify-between text-xs text-gray-700 mt-1">
        <span>0%</span>
        <span className="font-medium">{percentage.toFixed(1)}%</span>
        <span>100%</span>
      </div>
    )}
  </div>
)

// Gauge Meter Component
const GaugeMeter = ({
  value,
  min,
  max,
  unit,
  color,
  size = 120,
}: {
  value: number
  min: number
  max: number
  unit: string
  color: string
  size?: number
}) => {
  const percentage = ((value - min) / (max - min)) * 100
  const angle = (percentage / 100) * 180 - 90

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
      <svg width={size} height={size / 2 + 20} className="overflow-visible">
        <defs>
          <linearGradient id={`gauge-gradient-${value}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <path
          d={`M 10 ${size / 2} A ${size / 2 - 10} ${size / 2 - 10} 0 0 1 ${size - 10} ${size / 2}`}
          stroke={`url(#gauge-gradient-${value})`}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />
        <line
          x1={size / 2}
          y1={size / 2}
          x2={size / 2 + (size / 2 - 20) * Math.cos((angle * Math.PI) / 180)}
          y2={size / 2 + (size / 2 - 20) * Math.sin((angle * Math.PI) / 180)}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          style={{ transition: "all 1s ease-out" }}
        />
        <circle cx={size / 2} cy={size / 2} r="4" fill={color} />
      </svg>
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
        <div className="text-lg font-bold text-gray-900">
          {value}
          {unit}
        </div>
        <div className="text-xs text-gray-700">
          {min}-{max} {unit}
        </div>
      </div>
    </div>
  )
}

// Trend Line Component
const TrendLine = ({
  data,
  color,
  height = 60,
}: {
  data: number[]
  color: string
  height?: number
}) => {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 200
      const y = height - ((value - min) / range) * height
      return `${x},${y}`
    })
    .join(" ")

  return (
    <div className="w-full">
      <svg width="200" height={height} className="w-full">
        <defs>
          <linearGradient id={`trend-gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon points={`0,${height} ${points} 200,${height}`} fill={`url(#trend-gradient-${color})`} />
      </svg>
    </div>
  )
}

// Heat Map Component
const HeatMap = ({
  data,
  labels,
}: {
  data: number[]
  labels: string[]
}) => {
  const max = Math.max(...data)

  return (
    <div className="grid grid-cols-4 gap-1">
      {data.map((value, index) => {
        const intensity = value / max
        const opacity = Math.max(0.1, intensity)
        return (
          <div
            key={index}
            className="aspect-square rounded flex items-center justify-center text-xs font-medium"
            style={{
              backgroundColor: `rgba(34, 197, 94, ${opacity})`,
              color: intensity > 0.5 ? "white" : "#374151",
            }}
            title={`${labels[index]}: ${value}`}
          >
            {value}
          </div>
        )
      })}
    </div>
  )
}

// Insight generation functions (enhanced)
const getScoreInsight = (score: number) => {
  if (score >= 90)
    return {
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      icon: Award,
      message: "Outstanding! You're in the top 10% of users.",
      level: "Excellent",
    }
  if (score >= 75)
    return {
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      icon: TrendingUp,
      message: "Great work! Small tweaks could make you exceptional.",
      level: "Good",
    }
  if (score >= 60)
    return {
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      icon: Target,
      message: "You're on track. Focus on consistency for better results.",
      level: "Average",
    }
  return {
    color: "text-red-600",
    bgColor: "bg-red-50",
    icon: AlertTriangle,
    message: "Needs attention. Let's work on improving your setup.",
    level: "Needs Improvement",
  }
}

const getDistanceInsight = (avgDistance: number, goodDistanceRate: number) => {
  const optimal = avgDistance >= 50 && avgDistance <= 70
  const tooClose = avgDistance < 50

  if (optimal && goodDistanceRate >= 80) {
    return {
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      icon: Target,
      message: "Perfect! Your screen distance is in the sweet spot.",
      recommendation: "Keep maintaining this excellent distance.",
    }
  } else if (tooClose) {
    return {
      color: "text-red-600",
      bgColor: "bg-red-50",
      icon: AlertTriangle,
      message: "Too close! This can cause eye strain and headaches.",
      recommendation: "Move back 10-20cm for optimal viewing.",
    }
  }
  return {
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    icon: Eye,
    message: "Inconsistent distance detected throughout session.",
    recommendation: "Try to maintain 50-70cm consistently.",
  }
}

const getPostureInsight = (badPostureRate: number, events: number) => {
  if (badPostureRate <= 10) {
    return {
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      icon: CheckCircle,
      message: "Excellent posture discipline! Your back will thank you.",
      tip: "You're setting a great example for ergonomic health.",
    }
  } else if (badPostureRate <= 25) {
    return {
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      icon: Activity,
      message: "Good posture with room for improvement.",
      tip: "Try setting hourly posture check reminders.",
    }
  }
  return {
    color: "text-red-600",
    bgColor: "bg-red-50",
    icon: XCircle,
    message: "Frequent poor posture detected. Time for ergonomic changes.",
    tip: "Consider adjusting your chair height and monitor position.",
  }
}

const getDrowsinessInsight = (drowsinessRate: number, yawnsPerHour: number) => {
  if (drowsinessRate <= 5 && yawnsPerHour <= 2) {
    return {
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      icon: Zap,
      message: "Fantastic alertness! You're energized and focused.",
      energy: "High Energy",
    }
  } else if (drowsinessRate <= 15 || yawnsPerHour <= 4) {
    return {
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      icon: Coffee,
      message: "Mild fatigue detected. A short break might help.",
      energy: "Moderate Energy",
    }
  }
  return {
    color: "text-red-600",
    bgColor: "bg-red-50",
    icon: Moon,
    message: "High drowsiness levels. Your body needs rest.",
    energy: "Low Energy",
  }
}

const getBrightnessInsight = (avgBrightness: number, highBrightnessEvents: number) => {
  if (avgBrightness >= 40 && avgBrightness <= 80 && highBrightnessEvents <= 5) {
    return {
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      icon: Sun,
      message: "Perfect lighting! Your eyes are comfortable.",
      quality: "Optimal",
    }
  } else if (avgBrightness > 80 || highBrightnessEvents > 10) {
    return {
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      icon: AlertTriangle,
      message: "Bright lighting detected. Consider dimming or adjusting.",
      quality: "Too Bright",
    }
  }
  return {
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: Moon,
    message: "Low lighting detected. Add some ambient light.",
    quality: "Too Dark",
  }
}

const getBlinkInsight = (blinks: number, sessionHours: number, longGaps: number) => {
  const blinksPerMinute = blinks / (sessionHours * 60)
  if (blinksPerMinute >= 15 && blinksPerMinute <= 20 && longGaps <= 10) {
    return {
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      icon: Eye,
      message: "Healthy blinking pattern! Your eyes are well-lubricated.",
      health: "Excellent",
    }
  } else if (blinksPerMinute < 12 || longGaps > 15) {
    return {
      color: "text-red-600",
      bgColor: "bg-red-50",
      icon: EyeOff,
      message: "Infrequent blinking detected. Risk of dry eyes.",
      health: "Needs Attention",
    }
  }
  return {
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    icon: Eye,
    message: "Blink rate could be improved for better eye health.",
    health: "Moderate",
  }
}

interface EnhancedMetricCardProps {
  title: string
  value: string | number
  unit?: string
  insight: any
  children?: React.ReactNode
  visualization?: React.ReactNode
  className?: string
}

const EnhancedMetricCard = ({
  title,
  value,
  unit,
  insight,
  children,
  visualization,
  className = "",
}: EnhancedMetricCardProps) => (
  <div
    className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 ${className}`}
  >
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
        <div className={`p-2 rounded-xl ${insight.bgColor}`}>
          <insight.icon className={`${insight.color} w-5 h-5`} />
        </div>
      </div>

      {/* Visualization */}
      {visualization && <div className="mb-6 flex justify-center">{visualization}</div>}

      {/* Main Value */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-gray-900 flex items-baseline">
          {value}
          {unit && <span className="text-lg text-gray-600 ml-1">{unit}</span>}
        </div>
      </div>

      {/* Additional Content - This will expand to fill available space */}
      <div className="flex-grow mb-4">{children}</div>

      {/* Insight - Always at the bottom */}
      <div
        className={`${insight.bgColor} rounded-xl p-4 border-l-4 ${insight.color.replace("text-", "border-")} mt-auto`}
      >
        <div className="flex items-start space-x-3">
          <insight.icon className={`${insight.color} w-5 h-5 mt-0.5 flex-shrink-0`} />
          <div>
            <p className={`text-sm font-medium ${insight.color}`}>{insight.message}</p>
            {(insight.recommendation || insight.tip) && (
              <p className="text-xs text-gray-600 mt-1">💡 {insight.recommendation || insight.tip}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
)

const PostureReport = () => {
  const isMonitoring = monitoringStatus()
  const report = useMonitoringReport(!!isMonitoring)

  if (isMonitoring === null) {
    return (
      <div className="p-8 text-gray-500 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading monitoring status...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-8 text-gray-500 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-pulse bg-gray-200 h-12 w-12 rounded-full mx-auto mb-4"></div>
          <p>Loading posture report...</p>
        </div>
      </div>
    )
  }

  // Calculate derived metrics
  const sessionHours = report.session_duration_min / 60
  const faceVisibilityRate = (report.time_face_visible_min / report.session_duration_min) * 100
  const goodPostureRate =
    ((report.session_duration_min - report.bad_posture_time_min) / report.session_duration_min) * 100
  const goodDistanceRate = (report.time_good_distance_min / report.session_duration_min) * 100
  const badPostureRate = (report.bad_posture_time_min / report.session_duration_min) * 100
  const drowsinessRate = (report.drowsiness_time_min / report.session_duration_min) * 100
  const alertnessRate = 100 - drowsinessRate
  const environmentalScore = Math.max(0, 100 - (report.high_brightness_time_min / report.session_duration_min) * 100)

  // Generate insights
  const scoreInsight = getScoreInsight(report.session_score)
  const distanceInsight = getDistanceInsight(report.avg_distance_cm, goodDistanceRate)
  const postureInsight = getPostureInsight(badPostureRate, report.bad_posture_events)
  const drowsinessInsight = getDrowsinessInsight(drowsinessRate, report.yawns_per_hour)
  const brightnessInsight = getBrightnessInsight(report.avg_brightness, report.high_brightness_events)
  const blinkInsight = getBlinkInsight(report.blinks, sessionHours, report.long_blink_gaps)

  // Mock trend data for visualization
  const postureTimeline = [85, 78, 82, 75, 88, 92, 87, 83]
  const alertnessTimeline = [95, 88, 85, 78, 82, 89, 91, 87]

  const sessionInfo =
    report.start_time && report.stop_time ? (
      <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-blue-700">
            <Monitor className="mr-3 w-6 h-6" />
            <div>
              <div className="font-semibold text-lg">Session: {new Date(report.start_time).toLocaleDateString()}</div>
              <div className="text-sm text-blue-700">
                {new Date(report.start_time).toLocaleTimeString()} - {new Date(report.stop_time).toLocaleTimeString()}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900">
              {Math.floor(sessionHours)}h {Math.round((sessionHours % 1) * 60)}m
            </div>
            <div className="text-sm text-blue-700">Total Duration</div>
          </div>
        </div>
      </div>
    ) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-2xl mr-4">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Posture Analytics Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Comprehensive health and ergonomics insights</p>
            </div>
          </div>
          {sessionInfo}
        </div>

        {/* Overall Score - Hero Section */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-8 mb-8 border border-gray-200">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Overall Session Score</h2>
            <p className="text-gray-600 mb-8">Your comprehensive wellness rating</p>

            <div className="flex flex-col lg:flex-row items-center justify-center space-y-8 lg:space-y-0 lg:space-x-16">
              <div className="flex flex-col items-center">
                <CircularProgress
                  percentage={report.session_score}
                  color="#22c55e"
                  size={180}
                  strokeWidth={12}
                  showGradient={true}
                />
                <div className="mt-4 text-center">
                  <div className="text-4xl font-bold text-gray-900 mb-1">{Math.round(report.session_score)}</div>
                  <div className="text-lg text-gray-600 font-medium">{scoreInsight.level}</div>
                </div>
              </div>

              <div className="text-center lg:text-left max-w-md">
                <div
                  className={`flex items-center justify-center lg:justify-start ${scoreInsight.color} text-2xl font-bold mb-4`}
                >
                  <scoreInsight.icon size={32} className="mr-3" />
                  Performance Rating
                </div>
                <p className="text-gray-700 text-lg leading-relaxed mb-4">{scoreInsight.message}</p>
                <div className="flex items-center justify-center lg:justify-start space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    90-100: Excellent
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    75-89: Good
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div>
                    60-74: Average
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Metrics - Unique Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <EnhancedMetricCard
            title="Face Visibility"
            value={faceVisibilityRate.toFixed(1)}
            unit="%"
            insight={
              faceVisibilityRate >= 85
                ? {
                    color: "text-emerald-600",
                    bgColor: "bg-emerald-50",
                    icon: Eye,
                    message: "Excellent camera positioning throughout session!",
                    recommendation: "Your setup is optimal for monitoring.",
                  }
                : faceVisibilityRate >= 70
                  ? {
                      color: "text-amber-600",
                      bgColor: "bg-amber-50",
                      icon: Eye,
                      message: "Good visibility with some interruptions.",
                      recommendation: "Check for obstructions or lighting issues.",
                    }
                  : {
                      color: "text-red-600",
                      bgColor: "bg-red-50",
                      icon: EyeOff,
                      message: "Poor face visibility detected.",
                      recommendation: "Adjust camera angle and ensure good lighting.",
                    }
            }
            visualization={
              <HorizontalBar
                percentage={faceVisibilityRate}
                color={faceVisibilityRate >= 85 ? "#22c55e" : faceVisibilityRate >= 70 ? "#f59e0b" : "#ef4444"}
                height={12}
              />
            }
          >
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-green-700 font-medium">Visible Time</div>
                <div className="text-green-900 font-bold">{Math.round(report.time_face_visible_min)} min</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-red-700 font-medium">Missing Time</div>
                <div className="text-red-900 font-bold">{Math.round(report.face_missing_time_min)} min</div>
              </div>
            </div>
          </EnhancedMetricCard>

          <EnhancedMetricCard
            title="Posture Quality"
            value={goodPostureRate.toFixed(1)}
            unit="%"
            insight={postureInsight}
            visualization={
              <div className="w-full">
                <TrendLine
                  data={postureTimeline}
                  color={goodPostureRate >= 75 ? "#22c55e" : goodPostureRate >= 60 ? "#f59e0b" : "#ef4444"}
                />
                <div className="text-center text-xs text-gray-700 mt-2">Posture trend over time</div>
              </div>
            }
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Bad posture events</span>
                <span className="font-bold text-red-600">{report.bad_posture_events}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Best streak</span>
                <span className="font-bold text-green-600">{Math.round(report.max_good_posture_streak_sec / 60)}m</span>
              </div>
            </div>
          </EnhancedMetricCard>

          <EnhancedMetricCard
            title="Screen Distance"
            value={report.avg_distance_cm}
            unit="cm"
            insight={distanceInsight}
            visualization={
              <GaugeMeter
                value={report.avg_distance_cm}
                min={30}
                max={100}
                unit="cm"
                color={report.avg_distance_cm >= 50 && report.avg_distance_cm <= 70 ? "#22c55e" : "#f59e0b"}
              />
            }
          >
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-blue-700 text-sm font-medium mb-1">Good Distance Rate</div>
              <div className="text-blue-900 text-xl font-bold">{goodDistanceRate.toFixed(1)}%</div>
              <div className="text-xs text-blue-600 mt-1">Optimal: 50-70cm</div>
            </div>
          </EnhancedMetricCard>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8 auto-rows-fr">
          <EnhancedMetricCard
            title="Head Position"
            value={Math.abs(report.avg_pitch_deg).toFixed(1)}
            unit="° tilt"
            insight={
              Math.abs(report.avg_pitch_deg) <= 10
                ? {
                    color: "text-emerald-600",
                    bgColor: "bg-emerald-50",
                    icon: CheckCircle,
                    message: "Optimal head angle maintained!",
                    tip: "Perfect neutral position for your neck.",
                  }
                : report.avg_pitch_deg > 10
                  ? {
                      color: "text-amber-600",
                      bgColor: "bg-amber-50",
                      icon: TrendingUp,
                      message: "Head tilted up frequently.",
                      tip: "Lower your screen to reduce neck strain.",
                    }
                  : {
                      color: "text-amber-600",
                      bgColor: "bg-amber-50",
                      icon: TrendingDown,
                      message: "Head tilted down frequently.",
                      tip: "Raise your screen to improve posture.",
                    }
            }
            visualization={
              <div className="flex justify-center">
                <div className="relative w-32 h-20 bg-gray-100 rounded-xl border-2 border-gray-200 flex items-center justify-center">
                  {/* Tilt meter background */}
                  <div className="absolute inset-2 bg-white rounded-lg border border-gray-300">
                    {/* Center line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300 transform -translate-x-1/2"></div>
                    {/* Angle markers */}
                    <div className="absolute left-2 top-1/2 w-2 h-0.5 bg-gray-400 transform -translate-y-1/2"></div>
                    <div className="absolute right-2 top-1/2 w-2 h-0.5 bg-gray-400 transform -translate-y-1/2"></div>
                    {/* Tilt indicator */}
                    <div
                      className="absolute left-1/2 top-1/2 w-12 h-1 bg-blue-600 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-1000"
                      style={{
                        transform: `translateX(-50%) translateY(-50%) rotate(${report.avg_pitch_deg * 2}deg)`,
                      }}
                    >
                      <div className="absolute right-0 top-1/2 w-2 h-2 bg-red-500 rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
                    </div>
                  </div>
                  {/* Labels */}
                  <div className="absolute -bottom-6 left-0 text-xs text-gray-600">Down</div>
                  <div className="absolute -bottom-6 right-0 text-xs text-gray-600">Up</div>
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
                    Neutral
                  </div>
                </div>
              </div>
            }
          >
            <div className="text-center text-sm text-gray-700">
              <div>Ideal range: -10° to +10°</div>
              <div className="mt-1 font-medium">
                Current: {report.avg_pitch_deg.toFixed(1)}°{" "}
                {report.avg_pitch_deg > 0 ? "↑ Looking up" : report.avg_pitch_deg < 0 ? "↓ Looking down" : "→ Neutral"}
              </div>
            </div>
          </EnhancedMetricCard>

          <EnhancedMetricCard
            title="Alertness Level"
            value={alertnessRate.toFixed(1)}
            unit="%"
            insight={drowsinessInsight}
            visualization={
              <div className="space-y-3">
                <CircularProgress
                  percentage={alertnessRate}
                  color={alertnessRate >= 85 ? "#22c55e" : alertnessRate >= 70 ? "#f59e0b" : "#ef4444"}
                  size={100}
                />
                <TrendLine data={alertnessTimeline} color={alertnessRate >= 85 ? "#22c55e" : "#f59e0b"} height={40} />
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-yellow-50 p-2 rounded">
                <div className="text-yellow-800 font-medium">Yawns</div>
                <div className="font-bold text-gray-900">{report.yawns_detected}</div>
              </div>
              <div className="bg-red-50 p-2 rounded">
                <div className="text-red-800 font-medium">Drowsy Events</div>
                <div className="font-bold text-gray-900">{report.drowsiness_events}</div>
              </div>
            </div>
          </EnhancedMetricCard>

          <EnhancedMetricCard
            title="Lighting Quality"
            value={report.avg_brightness}
            unit=""
            insight={brightnessInsight}
            visualization={
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <Moon className="w-4 h-4 text-gray-600" />
                  <div className="w-32 h-3 bg-gradient-to-r from-gray-800 via-yellow-400 to-yellow-200 rounded-full relative">
                    <div
                      className="absolute top-0 w-3 h-3 bg-white border-2 border-gray-400 rounded-full transform -translate-y-0 transition-all duration-1000"
                      style={{ left: `${(report.avg_brightness / 140) * 100}%` }}
                    />
                  </div>
                  <Sun className="w-4 h-4 text-yellow-500" />
                </div>
                <div className="text-center text-xs text-gray-700">Brightness Level: {report.avg_brightness}/140</div>
              </div>
            }
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Max brightness</span>
                <span className="font-medium">{report.max_brightness}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">High brightness events</span>
                <span className="font-medium">{report.high_brightness_events}</span>
              </div>
            </div>
          </EnhancedMetricCard>

          <EnhancedMetricCard
            title="Eye Health"
            value={report.blinks}
            unit="blinks"
            insight={blinkInsight}
            visualization={
              <div className="text-center space-y-3">
                <div className="flex justify-center space-x-1">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-8 rounded-full transition-all duration-300 ${
                        i < ((report.blinks / (sessionHours * 60) / 20) * 8) ? "bg-blue-500" : "bg-gray-200"
                      }`}
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <div className="text-sm font-medium text-gray-700">
                  {(report.blinks / (sessionHours * 60)).toFixed(1)} blinks/min
                </div>
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-blue-50 p-2 rounded">
                <div className="text-blue-700">Rate</div>
                <div className="font-bold text-gray-900">{(report.blinks / (sessionHours * 60)).toFixed(1)}/min</div>
              </div>
              <div className="bg-orange-50 p-2 rounded">
                <div className="text-orange-700">Long gaps</div>
                <div className="font-bold text-gray-900">{report.long_blink_gaps}</div>
              </div>
            </div>
          </EnhancedMetricCard>

          <EnhancedMetricCard
            title="Session Consistency"
            value={
              report.max_good_posture_streak_sec > 3600
                ? `${(report.max_good_posture_streak_sec / 3600).toFixed(1)}h`
                : `${Math.round(report.max_good_posture_streak_sec / 60)}m`
            }
            unit=""
            insight={
              report.max_good_posture_streak_sec >= 1800
                ? {
                    color: "text-emerald-600",
                    bgColor: "bg-emerald-50",
                    icon: TrendingUp,
                    message: "Excellent consistency! Long good posture streaks.",
                    tip: "You're building great habits.",
                  }
                : report.max_good_posture_streak_sec >= 900
                  ? {
                      color: "text-amber-600",
                      bgColor: "bg-amber-50",
                      icon: Target,
                      message: "Moderate consistency detected.",
                      tip: "Try to extend your good posture periods.",
                    }
                  : {
                      color: "text-red-600",
                      bgColor: "bg-red-50",
                      icon: TrendingDown,
                      message: "Inconsistent posture patterns.",
                      tip: "Set regular posture check reminders.",
                    }
            }
            visualization={
              <div className="space-y-2">
                <div className="text-center text-sm font-medium text-gray-700">Best Streak</div>
                <div className="flex justify-center">
                  <div className="w-24 h-24 relative">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#22c55e"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(report.max_good_posture_streak_sec / 3600, 1))}`}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 1s ease" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Timer className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>
            }
          >
            <div className="text-center text-sm text-gray-600">Longest period of good posture</div>
          </EnhancedMetricCard>

          <EnhancedMetricCard
            title="Environmental Score"
            value={Math.round(environmentalScore)}
            unit="%"
            insight={
              environmentalScore >= 80
                ? {
                    color: "text-emerald-600",
                    bgColor: "bg-emerald-50",
                    icon: Sun,
                    message: "Stable environment conditions!",
                    tip: "Your workspace lighting is well-controlled.",
                  }
                : {
                    color: "text-amber-600",
                    bgColor: "bg-amber-50",
                    icon: AlertTriangle,
                    message: "Variable environmental conditions.",
                    tip: "Consider adjusting lighting or window coverings.",
                  }
            }
            visualization={
              <HeatMap
                data={[
                  Math.round(environmentalScore),
                  Math.round(100 - (report.high_brightness_time_min / report.session_duration_min) * 100),
                  Math.round(faceVisibilityRate),
                  Math.round((report.time_good_distance_min / report.session_duration_min) * 100),
                ]}
                labels={["Environment", "Lighting", "Visibility", "Distance"]}
              />
            }
          >
            <div className="text-sm text-gray-600 text-center">Based on lighting stability and visibility</div>
          </EnhancedMetricCard>
        </div>

        {/* Enhanced Recommendations */}
        <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 rounded-3xl shadow-xl p-8 border border-indigo-200">
          <div className="flex items-center mb-8">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-3 rounded-2xl mr-4">
              <Lightbulb className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Personalized Action Plan</h2>
              <p className="text-gray-600">Tailored recommendations based on your session data</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Priority Actions */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-100">
              <h3 className="font-bold text-red-700 mb-6 flex items-center text-xl">
                <AlertTriangle className="mr-3 w-6 h-6" />
                Immediate Actions
              </h3>
              <div className="space-y-4">
                {badPostureRate > 25 && (
                  <div className="flex items-start p-4 bg-red-50 rounded-xl border-l-4 border-red-500">
                    <div className="w-3 h-3 bg-red-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <div>
                      <div className="font-semibold text-red-800">Fix Your Posture Setup</div>
                      <div className="text-red-700 text-sm mt-1">
                        {badPostureRate.toFixed(1)}% of your session had poor posture. Adjust chair height and monitor
                        position.
                      </div>
                    </div>
                  </div>
                )}
                {report.avg_distance_cm < 50 && (
                  <div className="flex items-start p-4 bg-orange-50 rounded-xl border-l-4 border-orange-500">
                    <div className="w-3 h-3 bg-orange-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <div>
                      <div className="font-semibold text-orange-800">Increase Screen Distance</div>
                      <div className="text-orange-700 text-sm mt-1">
                        Currently at {report.avg_distance_cm}cm. Move back to 50-70cm to reduce eye strain.
                      </div>
                    </div>
                  </div>
                )}
                {report.yawns_per_hour > 4 && (
                  <div className="flex items-start p-4 bg-yellow-50 rounded-xl border-l-4 border-yellow-500">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <div>
                      <div className="font-semibold text-yellow-800">Take More Breaks</div>
                      <div className="text-yellow-700 text-sm mt-1">
                        {report.yawns_per_hour.toFixed(1)} yawns/hour detected. Schedule 5-minute breaks every 30
                        minutes.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Positive Reinforcement */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100">
              <h3 className="font-bold text-green-700 mb-6 flex items-center text-xl">
                <CheckCircle className="mr-3 w-6 h-6" />
                Keep It Up!
              </h3>
              <div className="space-y-4">
                {faceVisibilityRate >= 85 && (
                  <div className="flex items-start p-4 bg-green-50 rounded-xl border-l-4 border-green-500">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <div>
                      <div className="font-semibold text-green-800">Perfect Camera Setup</div>
                      <div className="text-green-700 text-sm mt-1">
                        {faceVisibilityRate.toFixed(1)}% visibility rate - your monitoring setup is excellent!
                      </div>
                    </div>
                  </div>
                )}
                {report.avg_distance_cm >= 50 && report.avg_distance_cm <= 70 && (
                  <div className="flex items-start p-4 bg-blue-50 rounded-xl border-l-4 border-blue-500">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <div>
                      <div className="font-semibold text-blue-800">Optimal Screen Distance</div>
                      <div className="text-blue-700 text-sm mt-1">
                        {report.avg_distance_cm}cm is perfect for eye health and comfort.
                      </div>
                    </div>
                  </div>
                )}
                {report.max_good_posture_streak_sec >= 1800 && (
                  <div className="flex items-start p-4 bg-purple-50 rounded-xl border-l-4 border-purple-500">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <div>
                      <div className="font-semibold text-purple-800">Great Consistency</div>
                      <div className="text-purple-700 text-sm mt-1">
                        {Math.round(report.max_good_posture_streak_sec / 60)} minute good posture streak shows excellent
                        discipline!
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Wellness Tips */}
          <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="font-bold text-indigo-700 mb-6 flex items-center text-xl">
              <Activity className="mr-3 w-6 h-6" />
              Daily Wellness Protocol
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-blue-800 mb-2">20-20-20 Rule</h4>
                <p className="text-sm text-blue-700">Every 20 minutes, look at something 20 feet away for 20 seconds</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-green-800 mb-2">Micro-breaks</h4>
                <p className="text-sm text-green-700">Stand and stretch for 1-2 minutes every 30 minutes</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Monitor className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-purple-800 mb-2">Screen Position</h4>
                <p className="text-sm text-purple-700">Top of screen should be at or below eye level</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl">
                <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Coffee className="w-6 h-6 text-cyan-600" />
                </div>
                <h4 className="font-semibold text-cyan-800 mb-2">Stay Hydrated</h4>
                <p className="text-sm text-cyan-700">Keep water nearby and sip regularly throughout the day</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PostureReport
