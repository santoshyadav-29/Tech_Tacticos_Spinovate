import { useState, useEffect } from "react";
import axios from "axios";

export function usePostureDetection(monitoring: boolean) {
  const [pitch, setPitch] = useState(0);
  const [distance, setDistance] = useState(0);
  const [postureAngles, setPostureAngles] = useState({
    "Degree of Anteversion of Cervical Spine (y1)": 0,
    "T1 Slope (y2)": 0,
    "Upper Thoracic Kyphosis Angle (y3)": 0,
    "Middle and Lower Thoracic Kyphosis Angle (y4)": 0,
    "T8-T12-L3 Angle (new)": 0,
    "Lumbar Lordosis Angle (y5)": 0
  });

  useEffect(() => {
    if (!monitoring) return; // Do not start polling if monitoring is false
    const interval = setInterval(async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/video/metrics");
        const { pitch, distance, posture_angles } = res.data;
        setPitch(pitch);
        setDistance(distance);
        if (posture_angles && typeof posture_angles === "object") {
          setPostureAngles(posture_angles);
        } else {
          setPostureAngles({
            "Degree of Anteversion of Cervical Spine (y1)": 0,
            "T1 Slope (y2)": 0,
            "Upper Thoracic Kyphosis Angle (y3)": 0,
            "Middle and Lower Thoracic Kyphosis Angle (y4)": 0,
            "T8-T12-L3 Angle (new)": 0,
            "Lumbar Lordosis Angle (y5)": 0
          });
        }
      } catch (err) {
        console.error("Backend error:", err);
        setPostureAngles({
          "Degree of Anteversion of Cervical Spine (y1)": 0,
          "T1 Slope (y2)": 0,
          "Upper Thoracic Kyphosis Angle (y3)": 0,
          "Middle and Lower Thoracic Kyphosis Angle (y4)": 0,
          "T8-T12-L3 Angle (new)": 0,
          "Lumbar Lordosis Angle (y5)": 0
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [monitoring]);

  return { pitch, distance, postureAngles };
}
