import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#eaf3fb] via-[#f4faff] to-[#eafaf1] font-sans">
      {/* Navbar/Header */}
      <header className="w-full flex justify-between items-center px-8 py-6 bg-white/80 shadow-md">
        <div className="flex items-center gap-3">
          <span className="bg-[#27a1ff] rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold text-white">
            S
          </span>
          <span className="text-2xl font-bold text-[#0d3b66] tracking-tight">
            Spinovate
          </span>
        </div>
        <nav className="flex gap-6">
          <Link
            href="/dashboard/posture"
            className="text-[#0d3b66] font-medium hover:underline underline-offset-4 transition"
          >
            Posture Detection
          </Link>
          <Link
            href="/dashboard/excercise"
            className="text-[#0d3b66] font-medium hover:underline underline-offset-4 transition"
          >
            Exercises
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Badge */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-blue-100 text-blue-700 font-medium text-sm shadow-sm">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path
                d="M13 2.05v2.02A7.001 7.001 0 0 1 19.93 11H21.95A9.003 9.003 0 0 0 13 2.05ZM11 2.05A9.003 9.003 0 0 0 2.05 11H4.07A7.001 7.001 0 0 1 11 4.07V2.05ZM2.05 13A9.003 9.003 0 0 0 11 21.95v-2.02A7.001 7.001 0 0 1 4.07 13H2.05ZM13 21.95A9.003 9.003 0 0 0 21.95 13H19.93A7.001 7.001 0 0 1 13 19.93v2.02ZM12 6a6 6 0 1 1 0 12A6 6 0 0 1 12 6Z"
                fill="#2563eb"
              />
            </svg>
            AI-Powered Health Platform
          </span>
        </div>
        {/* Main Heading */}
        <h1 className="text-4xl md:text-6xl font-extrabold text-center text-[#222] mb-6 leading-tight">
          Perfect Your <span className="text-blue-600">Posture</span>
          <br />
          <span className="text-[#222]">
            Transform Your <span className="text-green-600">Health</span>
          </span>
        </h1>
        {/* Subheading */}
        <p className="text-lg md:text-2xl text-center text-[#3b4a5a] max-w-2xl mb-10">
          Experience the future of posture correction with our AI-powered
          analysis system. Get real-time feedback, personalized exercises, and
          track your journey to better health.
        </p>
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard/posture"
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-blue-600 text-white text-lg font-semibold shadow hover:bg-blue-700 transition"
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <path
                d="M12 4v16m8-8H4"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Start Analysis
          </Link>
          <Link
            href="/dashboard/excercise"
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-white border border-gray-300 text-gray-800 text-lg font-semibold shadow hover:bg-gray-100 transition"
          >
            View Demo
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <path
                d="M9 5l7 7-7 7"
                stroke="#222"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </main>
    </div>
  );
}
