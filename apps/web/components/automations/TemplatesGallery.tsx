'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Template {
  slug: string; name: string; description: string; category: string;
  icon: string; trigger_type: string; action_type: string;
}

export function TemplatesGallery() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [pending, startTransition] = useTransition();
  const [busySlug, setBusySlug] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/automations/templates').then((r) => r.json()).then(setTemplates).catch(() => {});
  }, []);

  async function use(slug: string) {
    setBusySlug(slug);
    await fetch(`/api/automations/templates/${slug}/use`, { method: 'POST' });
    setBusySlug(null);
    startTransition(() => router.push('/automations'));
  }

  return (
    <div className="space-y-3">
      {templates.map((t) => (
        <div key={t.slug} className="flex items-start gap-3 rounded-lg border p-3">
          <span className="text-2xl">{t.icon}</span>
          <div className="flex-1">
            <p className="font-medium">{t.name}</p>
            <p className="text-xs text-muted-foreground">{t.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="rounded bg-muted px-1.5 py-0.5">{t.trigger_type}</span>
              {' → '}
              <span className="rounded bg-muted px-1.5 py-0.5">{t.action_type}</span>
            </p>
          </div>
          <button
            className="rounded-lg border px-3 py-1 text-xs"
            onClick={() => use(t.slug)}
            disabled={!!busySlug || pending}
          >
            {busySlug === t.slug ? 'Adding…' : 'Use'}
          </button>
        </div>
      ))}
      {templates.length === 0 && <p className="text-sm text-muted-foreground">Loading templates…</p>}
    </div>
  );
}
