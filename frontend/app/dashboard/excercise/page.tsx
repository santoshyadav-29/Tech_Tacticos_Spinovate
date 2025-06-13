// Add below the <main> section or as a new component
import Image from "next/image";
import React from "react";

const dummyExercises = [
  {
    id: 1,
    name: "Neck Stretch",
    description: "Gently stretches neck muscles to reduce stiffness.",
    image: "/images/exercises/neck_stretch.jpg",
    duration: "2 min",
    difficulty: "Beginner",
  },
  {
    id: 2,
    name: "Shoulder Rolls",
    description: "Improves shoulder mobility and posture alignment.",
    image: "/images/exercises/shoulder_rolls.jpg",
    duration: "3 min",
    difficulty: "Beginner",
  },
  {
    id: 3,
    name: "Wall Angels",
    description: "Enhances back strength and spinal posture.",
    image: "/images/exercises/wall_angels.jpg",
    duration: "5 min",
    difficulty: "Intermediate",
  },
];

export default function ExerciseRecommendations() {
  return (
    <section className="w-full bg-white py-16 px-4 md:px-16">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-[#0d3b66] mb-4">
          Recommended Exercises
        </h2>
        <p className="text-lg text-[#3b4a5a] mb-12">
          Based on your posture analysis, try these AI-suggested exercises.
        </p>

        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {dummyExercises.map((exercise) => (
            <div
              key={exercise.id}
              className="bg-[#f4faff] rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition"
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
                <h3 className="text-xl font-semibold text-[#0d3b66] mb-2">
                  {exercise.name}
                </h3>
                <p className="text-gray-700 text-sm mb-4">
                  {exercise.description}
                </p>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>⏱ {exercise.duration}</span>
                  <span>⭐ {exercise.difficulty}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
