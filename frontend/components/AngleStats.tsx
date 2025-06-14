import React from "react";

const healthyRanges: Record<string, [number, number]> = {
  Cervical: [25, 34],
  T1Slope: [30, 50],
  UpperThoracic: [140, 158],
  MidLowerThoracic: [154, 155.5],
  T8T12L3: [175, 180.5],
  LumbarLordosis: [170, 174],
};

const vertebraKeys = [
  { key: "Cervical", label: "Cervical" },
  { key: "T1Slope", label: "T1 Slope" },
  { key: "UpperThoracic", label: "Upper Thoracic" },
  { key: "MidLowerThoracic", label: "Mid-Lower Thoracic" },
  { key: "T8T12L3", label: "T8-T12-L3" },
  { key: "LumbarLordosis", label: "Lumbar Lordosis" },
];

function isHealthy(key: string, value: number) {
  const [min, max] = healthyRanges[key];
  return value >= min && value <= max;
}

export const AngleStats = ({ angles }: { angles: Record<string, number> }) => (
  <section className="flex flex-col items-center md:w-1/3 w-full">
    <div className="w-full max-w-xs bg-white rounded-2xl shadow-lg px-6 py-6">
      <h2 className="text-xl font-bold mb-4 text-blue-900 text-center">Vertebrae Angles</h2>
      <div className="flex flex-col gap-3">
        {vertebraKeys.map(({ key, label }) => (
          <div
            key={key}
            className={`flex items-center justify-between px-3 py-2 rounded-lg shadow ${
              isHealthy(key, angles[key]) ? "bg-green-50" : "bg-red-50"
            }`}
          >
            <span className="font-semibold text-gray-700">{label}</span>
            <span
              className={`font-bold text-lg ${
                isHealthy(key, angles[key]) ? "text-green-600" : "text-red-600"
              }`}
            >
              {angles[key].toFixed(1)}°
            </span>
          </div>
        ))}
      </div>
    </div>
  </section>
);
