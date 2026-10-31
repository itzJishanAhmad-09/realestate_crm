export type Suggestion = { label: string; minutes: number };

const MAP: Record<string, Suggestion[]> = {
  not_picked: [
    { label: 'Retry in 2 hours', minutes: 120 },
    { label: 'Retry tomorrow 11am', minutes: 24 * 60 },
  ],
  busy: [{ label: 'Retry in 1 hour', minutes: 60 }],
  switched_off: [{ label: 'Retry tonight', minutes: 240 }],
  callback: [{ label: 'In 30 minutes', minutes: 30 }, { label: 'In 1 hour', minutes: 60 }],
  connected: [{ label: 'Follow up tomorrow', minutes: 1440 }],
  interested: [{ label: 'Follow up tomorrow', minutes: 1440 }, { label: 'In 3 days', minutes: 4320 }],
};

export function suggestFollowups(code: string): Suggestion[] {
  return MAP[code] ?? [];
}
