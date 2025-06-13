// excercise/page.tsx
import React from "react";
import Link from "next/link";

const exercises = [
  { name: "Push Up", slug: "push-up" },
  { name: "Squat", slug: "squat" },
  { name: "Plank", slug: "plank" },
];

const ExcercisePage = () => {
  return (
    <div>
      <h1 style={{ color: "#0d3b66" }}>Exercises</h1>
      <ul>
        {exercises.map((ex) => (
          <li key={ex.slug}>
            <Link href={`/dashboard/excercise/${ex.slug}`}>{ex.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ExcercisePage;
