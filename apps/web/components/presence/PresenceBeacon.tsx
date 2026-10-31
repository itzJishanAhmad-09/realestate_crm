'use client';
import { useEffect } from 'react';
import { sendHeartbeat } from '@/lib/presence/heartbeat';

export function PresenceBeacon() {
  useEffect(() => {
    sendHeartbeat();
    const t = setInterval(() => sendHeartbeat(), 30_000);
    return () => { clearInterval(t); void sendHeartbeat(null); };
  }, []);
  return null;
}
