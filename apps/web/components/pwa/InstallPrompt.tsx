'use client';
import { useEffect, useState } from 'react';

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('pwa_dismissed') === '1') setDismissed(true);
    const handler = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (dismissed || !evt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border bg-background p-3 shadow-lg sm:left-auto sm:max-w-sm">
      <p className="text-sm font-medium">Install this app</p>
      <p className="mt-1 text-xs text-muted-foreground">Works offline, launches full-screen, one tap to call.</p>
      <div className="mt-2 flex gap-2">
        <button
          className="rounded-lg bg-primary px-3 py-1 text-xs text-primary-foreground"
          onClick={async () => {
            await evt.prompt();
            const choice = await evt.userChoice;
            if (choice.outcome === 'dismissed') localStorage.setItem('pwa_dismissed', '1');
            setEvt(null);
          }}
        >Install</button>
        <button className="rounded-lg border px-3 py-1 text-xs"
                onClick={() => { localStorage.setItem('pwa_dismissed', '1'); setDismissed(true); }}>
          Not now
        </button>
      </div>
    </div>
  );
}
