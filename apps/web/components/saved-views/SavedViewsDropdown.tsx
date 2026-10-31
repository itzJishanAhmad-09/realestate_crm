'use client';
import { useEffect, useState } from 'react';

export interface SavedView { id: string; name: string; filter: Record<string, unknown>; is_default: boolean }

export function SavedViewsDropdown({
  entity, currentFilter, onApply,
}: {
  entity: 'leads' | 'bookings' | 'site_visits' | 'calls';
  currentFilter: Record<string, unknown>;
  onApply: (filter: Record<string, unknown>) => void;
}) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  async function reload() {
    const r = await fetch(`/api/saved-views?entity=${entity}`);
    setViews(await r.json());
  }
  useEffect(() => { reload(); }, [entity]);

  async function save() {
    if (!name.trim()) return;
    await fetch('/api/saved-views', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, name, filter: currentFilter }),
    });
    setName(''); setNaming(false);
    reload();
  }

  async function remove(id: string) {
    await fetch(`/api/saved-views/${id}`, { method: 'DELETE' });
    if (selected === id) { setSelected(''); onApply({}); }
    reload();
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="rounded border px-2 py-1 text-sm"
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          const v = views.find((x) => x.id === e.target.value);
          if (v) onApply(v.filter);
          else onApply({});
        }}
      >
        <option value="">All leads</option>
        {views.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      {naming ? (
        <>
          <input className="rounded border px-2 py-1 text-sm" placeholder="View name"
                 value={name} onChange={(e) => setName(e.target.value)} />
          <button className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground" onClick={save}>Save</button>
          <button className="rounded border px-2 py-1 text-xs" onClick={() => setNaming(false)}>Cancel</button>
        </>
      ) : (
        <button className="rounded border px-2 py-1 text-xs" onClick={() => setNaming(true)}>+ Save view</button>
      )}
      {selected && (
        <button className="rounded border px-2 py-1 text-xs text-destructive" onClick={() => remove(selected)}>Delete</button>
      )}
    </div>
  );
}
