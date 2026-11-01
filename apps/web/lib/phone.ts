/** Normalise any Indian number to E.164 (+91XXXXXXXXXX). Returns null if invalid. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('91') && d.length === 12 && /^[6-9]/.test(d.slice(2))) return `+${d}`;
  if (d.startsWith('0') && d.length === 11 && /^[6-9]/.test(d.slice(1))) return `+91${d.slice(1)}`;
  if (d.length === 10 && /^[6-9]/.test(d)) return `+91${d}`;
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
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  return startMins <= endMins
    ? mins >= startMins && mins <= endMins
    : mins >= startMins || mins <= endMins;
}

export const normalizePhoneIN = normalizePhone;

export function formatPhoneIN(raw: string | null | undefined): string {
  const n = normalizePhone(raw);
  if (!n) return typeof raw === 'string' ? raw : '';
  const digits = n.replace(/^\+91/, '');
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return n;
}
