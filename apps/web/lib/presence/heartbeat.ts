export async function sendHeartbeat(currentCallId: string | null = null): Promise<void> {
  try {
    await fetch('/api/presence/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: currentCallId ? 'on_call' : 'online',
        currentCallId,
      }),
      keepalive: true,
    });
  } catch { /* best effort */ }
}
