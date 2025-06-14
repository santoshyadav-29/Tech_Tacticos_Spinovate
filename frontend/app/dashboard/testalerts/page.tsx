'use client';

import { useEffect, useState, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';

type PostureStatus = {
  posture_angle_unhealthy: boolean;
  multiple_posture_angles_unhealthy: boolean;
  distance_too_close: boolean;
  excessive_yawning: boolean;
  yawn_and_drowsy: boolean;
  insufficient_blinks: boolean;
};

type AlertState = {
  phase: 'idle' | 'waiting' | 'cooldown';
  startTime: number | null;
  timeoutId: number | null;
};

const ALERT_KEYS: (keyof PostureStatus)[] = [
  'posture_angle_unhealthy',
  'multiple_posture_angles_unhealthy',
  'distance_too_close',
  'excessive_yawning',
  'yawn_and_drowsy',
  'insufficient_blinks',
];

const WAIT_DURATION = 10000; // 10 seconds
const COOLDOWN_DURATION = 5000; // 5 seconds

export default function PostureMonitorPage() {
  const [data, setData] = useState<PostureStatus | null>(null);
  const [alertStates, setAlertStates] = useState<Record<string, AlertState>>(() =>
    Object.fromEntries(ALERT_KEYS.map((key) => [key, { 
      phase: 'idle', 
      startTime: null, 
      timeoutId: null 
    }]))
  );
  
  // Use ref to track timeouts for cleanup
  const timeoutsRef = useRef<Record<string, number>>({});

  // Cleanup function to clear all timeouts
  const clearAllTimeouts = () => {
    Object.values(timeoutsRef.current).forEach(id => {
      if (id) clearTimeout(id);
    });
    timeoutsRef.current = {};
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetch('http://127.0.0.1:8000/alerts/check')
        .then((res) => res.json())
        .then((json: PostureStatus) => {
          setData(json);
          
          const now = Date.now();
          
          setAlertStates((prevStates) => {
            const newStates = { ...prevStates };
            
            for (const key of ALERT_KEYS) {
              const isCurrentlyTriggered = json[key];
              const currentState = prevStates[key];
              
              if (currentState.phase === 'idle' && isCurrentlyTriggered) {
                // Show initial toast and start waiting period
                toast(`${key.replaceAll('_', ' ')} detected!`, { 
                  icon: '⚠️',
                  duration: 4000
                });
                
                // Set up timeout for aggressive alert
                const timeoutId = window.setTimeout(() => {
                  // Check if alert is still active after 10 seconds
                  fetch('http://127.0.0.1:8000/alerts/check')
                    .then((res) => res.json())
                    .then((checkJson: PostureStatus) => {
                      if (checkJson[key]) {
                        // Still active - show aggressive alert
                        toast(`${key.replaceAll('_', ' ')} still active!`, {
                          icon: '🚨',
                          style: { background: 'red', color: 'white' },
                          duration: 4000
                        });
                      }
                      
                      // Enter cooldown phase regardless
                      setAlertStates((states) => ({
                        ...states,
                        [key]: {
                          phase: 'cooldown',
                          startTime: Date.now(),
                          timeoutId: null
                        }
                      }));
                      
                      // Set up cooldown timeout
                      const cooldownTimeoutId = window.setTimeout(() => {
                        setAlertStates((states) => ({
                          ...states,
                          [key]: {
                            phase: 'idle',
                            startTime: null,
                            timeoutId: null
                          }
                        }));
                        delete timeoutsRef.current[`${key}_cooldown`];
                      }, COOLDOWN_DURATION);
                      
                      timeoutsRef.current[`${key}_cooldown`] = cooldownTimeoutId;
                    })
                    .catch(console.error);
                  
                  delete timeoutsRef.current[key];
                }, WAIT_DURATION);
                
                timeoutsRef.current[key] = timeoutId;
                
                newStates[key] = {
                  phase: 'waiting',
                  startTime: now,
                  timeoutId
                };
              }
              else if (currentState.phase === 'waiting' && !isCurrentlyTriggered) {
                // Alert resolved during waiting period - cancel aggressive alert
                if (currentState.timeoutId) {
                  clearTimeout(currentState.timeoutId);
                  delete timeoutsRef.current[key];
                }
                
                // Go directly to cooldown
                newStates[key] = {
                  phase: 'cooldown',
                  startTime: now,
                  timeoutId: null
                };
                
                // Set up cooldown timeout
                const cooldownTimeoutId = window.setTimeout(() => {
                  setAlertStates((states) => ({
                    ...states,
                    [key]: {
                      phase: 'idle',
                      startTime: null,
                      timeoutId: null
                    }
                  }));
                  delete timeoutsRef.current[`${key}_cooldown`];
                }, COOLDOWN_DURATION);
                
                timeoutsRef.current[`${key}_cooldown`] = cooldownTimeoutId;
              }
              // If in cooldown phase, do nothing until timeout expires
            }
            
            return newStates;
          });
        })
        .catch((err) => console.error('Failed to fetch posture data:', err));
    }, 500);

    return () => {
      clearInterval(interval);
      clearAllTimeouts();
    };
  }, []);

  // Debug info to show current states
  const getPhaseDisplay = (key: string) => {
    const state = alertStates[key];
    if (state.phase === 'idle') return '';
    if (state.phase === 'waiting') return ' (waiting for 10s)';
    if (state.phase === 'cooldown') return ' (cooldown 5s)';
    return '';
  };

  return (
    <main className="p-6 font-mono text-black">
      <Toaster position="top-right" />
      <h1 className="text-xl font-bold mb-4">Live Posture Monitoring</h1>
      
      <div className="mb-4 p-3 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Alert Logic:</h2>
        <ul className="text-sm space-y-1">
          <li>• Initial toast when alert triggers</li>
          <li>• Wait 10 seconds, ignoring new triggers</li>
          <li>• If still active after 10s: show aggressive alert</li>
          <li>• Then 5s cooldown before accepting new triggers</li>
        </ul>
      </div>
      
      {data ? (
        <ul className="space-y-2">
          {ALERT_KEYS.map((key) => (
            <li key={key} className="flex justify-between items-center">
              <span>
                {key.replaceAll('_', ' ')}:{' '}
                <span className={data[key] ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                  {data[key] ? 'Yes' : 'No'}
                </span>
              </span>
              <span className="text-sm text-gray-500">
                {getPhaseDisplay(key)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>Loading...</p>
      )}
    </main>
  );
}