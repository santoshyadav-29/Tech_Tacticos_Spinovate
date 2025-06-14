import { useState, useEffect } from 'react';
import axios from 'axios';

export type PostureReportData = {
    start_time?: string;
    stop_time?: string;
    session_duration_min: number;
    time_face_visible_min: number;
    avg_distance_cm: number;
    time_good_distance_min: number;
    avg_pitch_deg: number;
    bad_posture_time_min: number;
    bad_posture_events: number;
    max_good_posture_streak_sec: number;
    avg_brightness: number;
    max_brightness: number;
    high_brightness_time_min: number;
    high_brightness_events: number;
    face_missing_time_min: number;
    drowsiness_time_min: number;
    drowsiness_events: number;
    yawns_detected: number;
    yawns_per_hour: number;
    session_score: number;
};

const API_BASE = 'http://127.0.0.1:8000/monitoring';

export function useMonitoringReport(poll: boolean, intervalMs = 2000) {
    const [report, setReport] = useState<PostureReportData | null>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (poll) {
            interval = setInterval(async () => {
                try {
                    const response = await axios.get<PostureReportData>(`${API_BASE}/report`);
                    setReport(response.data);
                } catch (err) {
                    setReport(null);
                }
            }, intervalMs);
        } else {
            // Fetch once if not polling
            (async () => {
                try {
                    const response = await axios.get<PostureReportData>(`${API_BASE}/report`);
                    setReport(response.data);
                } catch (err) {
                    setReport(null);
                }
            })();
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [poll, intervalMs]);

    return report;
}


export function monitoringStatus(): boolean | null {
  const [status, setStatus] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await axios.get<{ monitoring_active: boolean }>(
          `${API_BASE}/status`
        );
        setStatus(response.data.monitoring_active);
      } catch (error) {
        setStatus(null); // or set to false if you'd prefer default
      }
    };
    fetchStatus();
  }, []);

  return status;
}

export async function startMonitoring(): Promise<void> {
    await axios.post(`${API_BASE}/start`);
}

export async function stopMonitoring(): Promise<void> {
    await axios.post(`${API_BASE}/stop`);
}

export async function stopCamera(): Promise<void> {
    await axios.post('http://127.0.0.1:8000/video/close_camera');
}