"use client"

import Image from "next/image"
import Link from "next/link"
import { Zap, Users, Shield, Eye, Activity} from "lucide-react"
import { use, useEffect } from "react"
import { useState } from "react"


export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);



  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#eaf3fb] via-[#f4faff] to-[#eafaf1] font-sans">
      {/* Navbar/Header */}
      <header
        className={`w-full flex justify-between items-center px-4 md:px-8 py-4 relative z-20 sticky top-0 transition-colors duration-300 ${
          isScrolled ? "bg-white shadow-md" : "bg-transparent"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="bg-gradient-to-br from-[#27a1ff] to-[#1e90ff] rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold text-white shadow-lg">
              S
            </span>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div>
            <span className="text-2xl font-bold text-[#0d3b66] tracking-tight">Spinovate</span>
            <div className="text-xs text-gray-500 font-medium">AI Health Platform</div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-[#0d3b66] font-medium hover:text-blue-600 transition-colors duration-200 relative group"
            >
              Dashboard
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link
              href="/dashboard/posture"
              className="text-[#0d3b66] font-medium hover:text-blue-600 transition-colors duration-200 relative group"
            >
              Posture Detection
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link
              href="/dashboard/excercise"
              className="text-[#0d3b66] font-medium hover:text-blue-600 transition-colors duration-200 relative group"
            >
              Exercises
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
            </Link>
           
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-3">
           
            <Link
              href="/dashboard/posture"
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* Mobile Menu Button */}
        <button className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path
              d="M3 12h18M3 6h18M3 18h18"
              stroke="#0d3b66"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 relative overflow-hidden">

        {/* Top-left Spine Image */}
        <div className="absolute top- left-0 z-10">
          {/* Background decorative elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/30 to-teal-100/30 rounded-full blur-3xl scale-150"></div>
          <div className="absolute top-10 right-10 w-32 h-32 bg-blue-200/20 rounded-full blur-2xl"></div>
          <div className="absolute bottom-10 left-10 w-24 h-24 bg-teal-200/20 rounded-full blur-2xl"></div>

          {/* Main spine image */}
          <div className="relative z-10 transform hover:scale-105 transition-transform duration-700">
            <Image
              src="/SpineA.png"
              alt="3D Spine Model - Posture Analysis"
              width={500}
              height={600}
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>

          {/* Floating info cards */}
          <div className="absolute top-20 z-20 left-0 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-white/20 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500  rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Perfect Alignment</span>
            </div>
          </div>

          <div className="absolute bottom-32 left-8 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-white/20 animate-pulse delay-1000">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">AI Analysis</span>
            </div>
          </div>

          <div className="absolute top-40 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-white/20 animate-pulse delay-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Real-time Feedback</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-10xl mx-auto grid lg:grid-cols-[1fr_2fr] gap-40 items-center h-full
         px-4 py-16 relative z-10">
          {/* Empty placeholder for left column if needed */}
          <div></div>

          {/* Right Content */}
          <div className="flex flex-col items-start justify-center space-y-8">
            {/* Badge */}
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-medium text-sm shadow-sm border border-blue-200">
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
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-left text-[#222] leading-tight">
              Perfect Your{" "}
              <span className="text-blue-600 relative">
                Posture
                <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full opacity-30"></div>
              </span>
              <br />
              <span className="text-[#222]">
                Transform Your{" "}
                <span className="text-teal-600 relative">
                  Health
                  <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-teal-600 rounded-full opacity-30"></div>
                </span>
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg md:text-xl text-left text-[#3b4a5a] max-w-3xl leading-relaxed">
              Experience the future of posture correction with our AI-powered analysis system. Get real-time feedback,
              personalized exercises, and track your journey to better health.
            </p>

            {/* Stats */}
            <div className="flex gap-8 py-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">98%</div>
                <div className="text-sm text-gray-600">Accuracy</div>
              </div>
            
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">24/7</div>
                <div className="text-sm text-gray-600">Monitoring</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard/posture"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-lg font-semibold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:-translate-y-1"
              >
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"
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
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-800 text-lg font-semibold shadow-lg hover:shadow-xl hover:bg-white transition-all duration-300 transform hover:-translate-y-1"
              >
                View Demo
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5 z-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, #27a1ff 2px, transparent 2px),
                           radial-gradient(circle at 75% 75%, #20b2aa 2px, transparent 2px)`,
              backgroundSize: "50px 50px",
            }}
          ></div>
        </div>
      </main>

       {/* Features Section */}
      <section id="features" className="py-20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#0d3b66] mb-6">What Do We Do?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Spinovate blends real-time AI technology with health-first design to monitor, evaluate, and improve your posture, comfort, and screen wellness.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group p-8 rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[#0d3b66] mb-4">AI Posture Estimation</h3>
              <p className="text-gray-600 leading-relaxed">
                Continuously track your body alignment in real time using AI to detect slouching, poor posture, and fatigue-inducing patterns.
              </p>
            </div>

            <div className="group p-8 rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[#0d3b66] mb-4">Eye & Screen Wellness</h3>
              <p className="text-gray-600 leading-relaxed">
                Keep your eyes safe with smart brightness monitoring, screen usage tracking, and strain-detection features for healthier digital habits.
              </p>
            </div>

            <div className="group p-8 rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[#0d3b66] mb-4">Health Insights & Reports</h3>
              <p className="text-gray-600 leading-relaxed">
                Get periodic session reports, posture summaries, and personalized exercise suggestions to help correct issues and stay on track.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="bg-[#0d3b66] text-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-r from-[#27a1ff] to-[#1e90ff] rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold text-white">
                  S
                </div>
                <span className="text-2xl font-bold">Spinovate</span>
              </div>
              <p className="text-gray-300 leading-relaxed mb-6 max-w-md">
                Transform your health with AI-powered posture analysis and personalized exercise plans. Join thousands
                of users on their journey to better health.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                  <span className="text-sm font-bold">f</span>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                  <span className="text-sm font-bold">t</span>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                  <span className="text-sm font-bold">in</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <Link href="/dashboard/posture" className="hover:text-white transition-colors">
                    Posture Analysis
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/excercise" className="hover:text-white transition-colors">
                    Exercises
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Progress Tracking
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    AI Reports
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-8 text-center text-gray-300">
            <p>&copy; 2024 Spinovate. All rights reserved. Made with ❤️ for better health.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
