/** Normalise any Indian number to E.164 (+91XXXXXXXXXX). Returns null if invalid. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('91') && d.length === 12) return `+${d}`;
  if (d.startsWith('0') && d.length === 11) return `+91${d.slice(1)}`;
  if (d.length === 10 && /^[6-9]/.test(d)) return `+91${d}`;
  if (d.length === 11 && d.startsWith('0')) return `+91${d.slice(1)}`;
  return null;
}

export function isWithinCallingHours(
  timezone: string, start: string, end: string, now = new Date(),
): boolean {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const [h, m] = fmt.format(now).split(':').map(Number);
  const mins = h * 60 + m;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return mins >= sh * 60 + sm && mins <= eh * 60 + em;
}

// Phase 1 compatibility: some routes import `normalizePhoneIN`
export const normalizePhoneIN = normalizePhone;

/** Pretty-print Indian phone: "+919812345678" → "+91 98123 45678" */
export function formatPhoneIN(raw: string | null | undefined): string {
  const n = normalizePhone(raw);
  if (!n) return typeof raw === 'string' ? raw : '';
  const digits = n.replace(/^\+91/, '');
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return n;
}
