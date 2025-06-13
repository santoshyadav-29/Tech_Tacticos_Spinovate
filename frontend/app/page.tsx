import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#e0f7fa] via-[#b2dfdb] to-[#0d3b66] font-sans">
      {/* Header */}
      <header className="w-full flex justify-between items-center px-8 py-6 bg-white/80 shadow-md">
        <div className="flex items-center gap-3">
          <Image src="/spine logo.png" alt="Logo" width={40} height={40} />
          <span className="text-2xl font-bold text-[#0d3b66] tracking-tight">
            PostureX
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
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12 px-8 py-12">
        <div className="max-w-xl flex flex-col gap-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#0d3b66] leading-tight">
            Improve Your <span className="text-[#3fb68b]">Posture</span>,<br />
            Track Your <span className="text-[#3fb68b]">Progress</span>
          </h1>
          <p className="text-lg text-[#144e7a]">
            Welcome to <span className="font-semibold">PostureX</span> — your
            smart assistant for posture detection and exercise tracking. Get
            real-time feedback, personalized routines, and actionable insights
            to boost your health and confidence.
          </p>
          <div className="flex gap-4 mt-2">
            <Link
              href="/dashboard/posture"
              className="bg-[#0d3b66] text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-[#144e7a] transition"
            >
              Try Posture Detection
            </Link>
            <Link
              href="/dashboard/excercise"
              className="bg-[#3fb68b] text-[#0d3b66] px-6 py-3 rounded-lg font-semibold shadow hover:bg-[#2e8c6a] hover:text-white transition"
            >
              Explore Exercises
            </Link>
          </div>
        </div>
        <div className="relative w-full max-w-md flex justify-center">
          <Image
            src="/correct_posture.avif"
            alt="Posture Detection Illustration"
            width={800}
            height={800}
            className="drop-shadow-2xl rounded-xl"
            priority
          />
        </div>
      </main>

      {/* Features Section */}
      <section className="bg-white/80 py-12 px-8 flex flex-col items-center">
        <h2 className="text-2xl md:text-3xl font-bold text-[#0d3b66] mb-8">
          Why PostureX?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
          <div className="flex flex-col items-center text-center p-6 bg-[#e0f7fa] rounded-lg shadow">
            <Image
              src="/ai.svg"
              alt="AI"
              width={48}
              height={48}
              className="mb-3"
            />
            <h3 className="font-semibold text-lg text-[#0d3b66] mb-2">
              AI-Powered Detection
            </h3>
            <p className="text-[#144e7a]">
              Get instant feedback on your posture using advanced AI and
              computer vision.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-[#e0f7fa] rounded-lg shadow">
            <Image
              src="/routine.svg"
              alt="Routine"
              width={48}
              height={48}
              className="mb-3"
            />
            <h3 className="font-semibold text-lg text-[#0d3b66] mb-2">
              Personalized Routines
            </h3>
            <p className="text-[#144e7a]">
              Access exercise plans tailored to your needs and track your
              progress over time.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-[#e0f7fa] rounded-lg shadow">
            <Image
              src="/accessibility.svg"
              alt="Accessible"
              width={48}
              height={48}
              className="mb-3"
            />
            <h3 className="font-semibold text-lg text-[#0d3b66] mb-2">
              Accessible & Intuitive
            </h3>
            <p className="text-[#144e7a]">
              Enjoy a clean, responsive interface designed for everyone,
              everywhere.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-[#0d3b66] bg-white/80 mt-auto">
        &copy; {new Date().getFullYear()} PostureX. All rights reserved.
      </footer>
    </div>
  );
}
