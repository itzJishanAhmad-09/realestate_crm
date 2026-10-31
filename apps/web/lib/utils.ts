import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function relativeTime(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.round(diff / 60000);
  if (Math.abs(m) < 1) return 'just now';
  if (Math.abs(m) < 60) return m + 'm ago';
  const h = Math.round(m / 60);
  if (Math.abs(h) < 24) return h + 'h ago';
  const days = Math.round(h / 24);
  if (Math.abs(days) < 30) return days + 'd ago';
  return formatDate(d);
}