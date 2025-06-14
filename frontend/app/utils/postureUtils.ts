export function computeAngles(
  distance: number,
  pitch: number
): Record<string, number> {
  // These are just sample calculations — adjust based on your real model
  return {
    Cervical: 30 - pitch * 0.5 + distance * 0.1,
    T1Slope: 35 - pitch * 0.2 + distance * 0.05,
    UpperThoracic: 135 - pitch * 0.3,
    MidLowerThoracic: 160 - pitch * 0.25,
    T8T12L3: 170 - pitch * 0.15,
    LumbarLordosis: 180 - pitch * 0.1,
  };
}

const healthyRanges: Record<string, [number, number]> = {
  Cervical: [35, 1000],
  T1Slope: [50, 1000],
  UpperThoracic: [0, 140],
  MidLowerThoracic: [156, 1000],
  T8T12L3: [180, 1800],
  LumbarLordosis: [174, 1900],
};

export function getFeedback(
  distance: number,
  pitch: number,
  angles: Record<string, number>
): string[] {
  const feedback: string[] = [];

  // Distance Feedback
  if (distance < 50) {
    feedback.push(
      "You're sitting too close to the screen. Try leaning back a bit."
    );
  } else if (distance > 80) {
    feedback.push("You're too far from the screen. Bring your chair closer.");
  } else {
    feedback.push("Great distance from the screen!");
  }

  // Pitch Feedback
  if (pitch > 15) {
    feedback.push("Try to keep your head more upright.");
  } else if (pitch < -5) {
    feedback.push("Your head might be tilted backward unnaturally.");
  } else {
    feedback.push("Your head pitch looks good!");
  }

  // Vertebrae Angles Feedback
  for (const key in angles) {
    const angle = angles[key];
    const [min, max] = healthyRanges[key];
    if (angle < min || angle > max) {
      feedback.push(
        `${key} angle is out of healthy range (${min}° - ${max}°).`
      );
    }
  }

  if (feedback.length === 2) {
    feedback.push("All spinal angles are within healthy range. Keep it up!");
  }

  return feedback;
}
