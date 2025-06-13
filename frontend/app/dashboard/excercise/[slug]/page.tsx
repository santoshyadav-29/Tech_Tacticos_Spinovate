// excercise/[slug]/page.tsx
"use client";
import React from "react";
import { useParams } from "next/navigation";

const exerciseDetails = {
  "push-up": {
    title: "Push Up",
    description:
      "A push-up is a common calisthenics exercise beginning from the prone position.",
  },
  squat: {
    title: "Squat",
    description:
      "A squat is a strength exercise in which the trainee lowers their hips from a standing position and then stands back up.",
  },
  plank: {
    title: "Plank",
    description:
      "The plank is an isometric core strength exercise that involves maintaining a position similar to a push-up for the maximum possible time.",
  },
};

const ExcerciseDetailPage = () => {
  const params = useParams();
  const { slug } = params;
  const exercise = exerciseDetails[slug as keyof typeof exerciseDetails];

  if (!exercise) {
    return <div>Exercise not found.</div>;
  }

  return (
    <div>
      <h1 style={{ color: "#0d3b66" }}>{exercise.title}</h1>
      <p>{exercise.description}</p>
    </div>
  );
};

export default ExcerciseDetailPage;
