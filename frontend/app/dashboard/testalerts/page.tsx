'use client';

import { useEffect, useState } from 'react';

type PostureStatus = {
  posture_angle_unhealthy: boolean;
  multiple_posture_angles_unhealthy: boolean;
  distance_too_close: boolean;
  excessive_yawning: boolean;
  yawn_and_drowsy: boolean;
  insufficient_blinks: boolean;
};

export default function PostureMonitorPage() {
    const [data, setData] = useState<PostureStatus | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            fetch('http://127.0.0.1:8000/alerts/check')
                .then((res) => res.json())
                .then((json) => setData(json))
                .catch((err) => console.error('Failed to fetch posture data:', err));
        }, 500);

        return () => clearInterval(interval);
    }, []);

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
