'use client';

import { useEffect, useState, useRef } from 'react';

type PostureStatus = {
  posture_angle_unhealthy: boolean;
  multiple_posture_angles_unhealthy: boolean;
  distance_too_close: boolean;
  excessive_yawning: boolean;
  yawn_and_drowsy: boolean;
  insufficient_blinks: boolean;
};

function playBeep(duration = 1000, volume = 0.5) {
  try {
    const ctx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      ctx.close();
    }, duration);
  } catch (e) {
    // Ignore audio errors
  }
}

function showWindowNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") new Notification(title, { body });
    });
  }
}

export default function PostureMonitorPage() {
    const [data, setData] = useState<PostureStatus | null>(null);
    
    // To avoid repeated notifications for the same alert
    const lastAlertRef = useRef<{ [key: string]: boolean }>({});

    // Request notification permission on component mount
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            fetch('http://127.0.0.1:8000/alerts/check')
                .then((res) => res.json())
                .then((json) => setData(json))
                .catch((err) => console.error('Failed to fetch posture data:', err));
        }, 500);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!data) return;

        // Helper to trigger notification and sound only on new alert
        const triggerAlert = (
            key: keyof PostureStatus,
            title: string,
            body: string
        ) => {
            if (data[key] && !lastAlertRef.current[key]) {
                showWindowNotification(title, body);
                playBeep(700, 0.5);
                lastAlertRef.current[key] = true;
            }
            if (!data[key]) {
                lastAlertRef.current[key] = false;
            }
        };

        triggerAlert(
            "posture_angle_unhealthy",
            "Unhealthy Posture Detected",
            "Please correct your posture angle."
        );
        triggerAlert(
            "multiple_posture_angles_unhealthy",
            "Multiple Angles Unhealthy",
            "Multiple posture angles are unhealthy. Adjust your sitting position."
        );
        triggerAlert(
            "distance_too_close",
            "Distance Too Close",
            "You are sitting too close to the screen."
        );
        triggerAlert(
            "excessive_yawning",
            "Excessive Yawning",
            "You are yawning excessively. Consider taking a break."
        );
        triggerAlert(
            "yawn_and_drowsy",
            "Yawning & Drowsiness",
            "Yawning and drowsiness detected. Please stay alert."
        );
        triggerAlert(
            "insufficient_blinks",
            "Insufficient Blinks",
            "You are not blinking enough. Blink more to protect your eyes."
        );
    }, [data]);

    const renderStatus = (value: boolean) => (
        <span className={value ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
            {value ? 'Yes' : 'No'}
        </span>
    );

    return (
        <main className="p-6 font-mono text-black">
            <h1 className="text-xl font-bold mb-4">Live Posture Monitoring</h1>
            {data ? (
                <ul className="space-y-1">
                    <li>
                        Posture Angle Unhealthy: {renderStatus(data.posture_angle_unhealthy)}
                    </li>
                    <li>
                        Multiple Angles Unhealthy: {renderStatus(data.multiple_posture_angles_unhealthy)}
                    </li>
                    <li>
                        Distance Too Close: {renderStatus(data.distance_too_close)}
                    </li>
                    <li>
                        Excessive Yawning: {renderStatus(data.excessive_yawning)}
                    </li>
                    <li>
                        Yawn and Drowsy: {renderStatus(data.yawn_and_drowsy)}
                    </li>
                    <li>
                        Insufficient Blinks: {renderStatus(data.insufficient_blinks)}
                    </li>
                </ul>
            ) : (
                <p>Loading...</p>
            )}
        </main>
    );
}
