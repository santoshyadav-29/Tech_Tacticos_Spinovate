"use client";
import Image from "next/image";
import React, { useState, useRef } from "react";
import type { JSX } from "react";

interface Exercise {
  id: number;
  name: string;
  description: string;
  image: string;
  duration: string;
  difficulty: string;
}

interface ExerciseSet {
  id: string;
  title: string;
  description: string;
  icon: string;
  exercises: Exercise[];
}

const exerciseSets: ExerciseSet[] = [
  {
    id: "back-pain",
    title: "Back Pain Relief",
    description: "Exercises to strengthen your back and reduce pain",
    icon: "🦴",
    exercises: [
      {
        id: 1,
        name: "Cat-Cow Stretch",
        description: "Enhances spinal flexibility and relieves back tension.",
        image: "/excercises/cat-cow.webp",
        duration: "5 min",
        difficulty: "Beginner",
      },
      {
        id: 2,
        name: "Child's Pose",
        description: "Gentle stretch for lower back and hip muscles.",
        image: "/excercises/Childs_Pose.gif",
        duration: "3 min",
        difficulty: "Beginner",
      },
      {
        id: 3,
        name: "Pelvic Tilts",
        description: "Strengthens core muscles and improves posture.",
        image: "/excercises/Pelvic_tilt.gif",
        duration: "4 min",
        difficulty: "Intermediate",
      },
    ],
  },
  {
    id: "shoulder-pain",
    title: "Shoulder Pain Relief",
    description: "Targeted exercises for shoulder mobility and strength",
    icon: "💪",
    exercises: [
      {
        id: 4,
        name: "Shoulder Rolls",
        description: "Improves shoulder mobility and posture alignment.",
        image: "/excercises/shoulder.webp",
        duration: "3 min",
        difficulty: "Beginner",
      },
      {
        id: 5,
        name: "Cross-Body Stretch",
        description: "Stretches shoulder muscles and improves flexibility.",
        image: "/excercises/Cross_Shoulder_Stretch.gif",
        duration: "2 min",
        difficulty: "Beginner",
      },
      {
        id: 6,
        name: "Wall Push-Ups",
        description: "Strengthens shoulder and chest muscles gently.",
        image: "/excercises/Wall-pushup.webp",
        duration: "4 min",
        difficulty: "Intermediate",
      },
    ],
  },
  {
    id: "neck-pain",
    title: "Neck Pain Relief",
    description: "Gentle exercises to reduce neck stiffness and pain",
    icon: "🦢",
    exercises: [
      {
        id: 7,
        name: "Neck Stretch",
        description: "Gently stretches neck muscles to reduce stiffness.",
        image: "/excercises/neck.webp",
        duration: "2 min",
        difficulty: "Beginner",
      },
      {
        id: 8,
        name: "Chin Tucks",
        description: "Strengthens deep neck muscles and improves posture.",
        image: "/excercises/Chin-tucks.gif",
        duration: "3 min",
        difficulty: "Beginner",
      },
      {
        id: 9,
        name: "Upper Trap Stretch",
        description: "Relieves tension in upper shoulder and neck area.",
        image: "/excercises/Upper_traps.gif",
        duration: "4 min",
        difficulty: "Intermediate",
      },
    ],
  },
  {
    id: "general-posture",
    title: "General Posture",
    description: "Overall posture improvement exercises",
    icon: "🧘‍♀️",
    exercises: [
      {
        id: 10,
        name: "Plank Hold",
        description: "Strengthens core muscles for better posture support.",
        image: "/excercises/Plank_Hold.gif",
        duration: "2 min",
        difficulty: "Intermediate",
      },
      {
        id: 11,
        name: "Bridge Exercise",
        description: "Strengthens glutes and lower back muscles.",
        image: "/excercises/Bridge.gif",
        duration: "3 min",
        difficulty: "Beginner",
      },
      {
        id: 12,
        name: "Thoracic Extension",
        description: "Improves upper back mobility and posture.",
        image: "/excercises/Thoracic_extension_mobilization.gif",
        duration: "4 min",
        difficulty: "Intermediate",
      },
    ],
  },
];

export default function ExerciseRecommendations(): JSX.Element {
  const [activeSet, setActiveSet] = useState<string>("back-pain");
  const audioRef = useRef<HTMLAudioElement>(null);

  const playNotificationSound = (): void => {
    try {
      const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.wav');
      audio.volume = 0.8;
      audio.play().catch((error: Error) => {
        console.log('Audio play failed:', error);
      });
    } catch (error) {
      console.log('Audio creation failed:', error);
    }
  };

  const startExercise = (exerciseName: string, duration: string): void => {
    playNotificationSound();
    console.log(`Starting ${exerciseName} for ${duration}`);
  };

  const currentExerciseSet = exerciseSets.find(set => set.id === activeSet);

  return (
    <section className="w-full py-16 px-4 md:px-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0d3b66] mb-4">
            Targeted Exercise Programs
          </h2>
          <p className="text-lg text-[#3b4a5a]">
            Choose your specific concern and get personalized exercise recommendations
          </p>
        </div>

        {/* Exercise Set Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {exerciseSets.map((set) => (
            <button
              key={set.id}
              onClick={() => setActiveSet(set.id)}
              className={`p-4 rounded-xl border-2 transition-all duration-300 text-center ${
                activeSet === set.id
                  ? "border-[#0d3b66] bg-[#0d3b66] text-white shadow-lg"
                  : "border-gray-200 bg-white text-[#0d3b66] hover:border-[#0d3b66] hover:shadow-md"
              }`}
              type="button"
            >
              <div className="text-2xl mb-2">{set.icon}</div>
              <h3 className="font-semibold text-sm md:text-base mb-1">
                {set.title}
              </h3>
              <p className={`text-xs ${
                activeSet === set.id ? "text-blue-100" : "text-gray-500"
              }`}>
                {set.exercises.length} exercises
              </p>
            </button>
          ))}
        </div>

        {/* Active Exercise Set */}
        {currentExerciseSet && (
          <div>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-[#0d3b66] mb-2 flex items-center justify-center gap-2">
                <span className="text-3xl">{currentExerciseSet.icon}</span>
                {currentExerciseSet.title}
              </h3>
              <p className="text-gray-600">{currentExerciseSet.description}</p>
            </div>

            {/* Exercise Cards */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {currentExerciseSet.exercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className="bg-[#f4faff] rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="h-48 relative">
                    <Image
                      src={exercise.image}
                      alt={exercise.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6 text-left">
                    <h4 className="text-xl font-semibold text-[#0d3b66] mb-2">
                      {exercise.name}
                    </h4>
                    <p className="text-gray-700 text-sm mb-4">
                      {exercise.description}
                    </p>
                    <div className="flex justify-between text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        ⏱ {exercise.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        ⭐ {exercise.difficulty}
                      </span>
                    </div>
                    {/* Removed Start Exercise button */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exercise Count Summary */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-4 bg-[#f4faff] px-6 py-3 rounded-full">
            <span className="text-[#0d3b66] font-semibold">
              Total Available: {exerciseSets.reduce((total, set) => total + set.exercises.length, 0)} exercises
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-[#0d3b66] font-semibold">
              Current Set: {currentExerciseSet?.exercises.length} exercises
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
