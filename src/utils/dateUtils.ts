/**
 * Date and time utilities for Familiekoordinator
 */

/**
 * Safely parses any date string or Date object into a Date object.
 * Handles date-only strings 'YYYY-MM-DD' as local calendar dates instead of UTC midnight.
 */
export function parseLocalDate(input: Date | string): Date {
  if (input instanceof Date) return input;
  if (typeof input !== 'string') return new Date(NaN);

  const trimmed = input.trim();
  // If format is purely date-only 'YYYY-MM-DD'
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  return new Date(trimmed);
}

/**
 * Returns a 'YYYY-MM-DD' string in local calendar time (not UTC) for a given Date or date string.
 */
export function formatLocalDateKey(d: Date | string): string {
  const date = parseLocalDate(d);
  if (isNaN(date.getTime())) {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
      return d.slice(0, 10);
    }
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekNumber(d: Date = new Date()): number {
  // ISO-8601 week number calculation
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function formatNorwegianDate(dateStr: string | Date): string {
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatShortDate(dateStr: string | Date): string {
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatTime(dateStr: string | Date): string {
  if (typeof dateStr === 'string' && /^\d{2}:\d{2}$/.test(dateStr.trim())) {
    return dateStr.trim();
  }
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatTimeRange(startStr: string, endStr: string): string {
  const start = formatTime(startStr);
  const end = formatTime(endStr);
  return `${start}–${end}`;
}

export function isSameDay(d1: Date | string, d2: Date | string): boolean {
  const date1 = parseLocalDate(d1);
  const date2 = parseLocalDate(d2);
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
    return false;
  }
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isToday(d: Date | string): boolean {
  return isSameDay(d, new Date());
}

/**
 * Adds minutes to an ISO string or Date and returns ISO string
 */
export function addMinutes(dateStr: string | Date, minutes: number): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : new Date(dateStr.getTime());
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

/**
 * Calculates auto reservation bounds for a calendar event with before and after buffer
 */
export function calculateBufferedTime(
  eventStartIso: string,
  eventEndIso: string,
  bufferBeforeMinutes: number = 40,
  bufferAfterMinutes: number = 40
): { reservationStart: string; reservationEnd: string; bufferBeforeMinutes: number; bufferAfterMinutes: number } {
  const start = new Date(eventStartIso);
  const end = new Date(eventEndIso);

  const reservationStart = new Date(start.getTime() - bufferBeforeMinutes * 60 * 1000);
  const reservationEnd = new Date(end.getTime() + bufferAfterMinutes * 60 * 1000);

  return {
    reservationStart: reservationStart.toISOString(),
    reservationEnd: reservationEnd.toISOString(),
    bufferBeforeMinutes,
    bufferAfterMinutes,
  };
}

/**
 * Check if two time ranges overlap
 */
export function checkTimeCollision(
  startA: string | Date,
  endA: string | Date,
  startB: string | Date,
  endB: string | Date
): boolean {
  const sA = (typeof startA === 'string' ? new Date(startA) : startA).getTime();
  const eA = (typeof endA === 'string' ? new Date(endA) : endA).getTime();
  const sB = (typeof startB === 'string' ? new Date(startB) : startB).getTime();
  const eB = (typeof endB === 'string' ? new Date(endB) : endB).getTime();

  return sA < eB && sB < eA;
}

/**
 * Finds all conflicting reservations for a requested window
 */
export function findConflictingReservations<T extends { startTime: string; endTime: string; id: string; status?: string }>(
  requestedStart: string,
  requestedEnd: string,
  existingReservations: T[],
  ignoreReservationId?: string
): T[] {
  return existingReservations.filter((res) => {
    if (res.status === 'cancelled') return false;
    if (ignoreReservationId && res.id === ignoreReservationId) return false;
    return checkTimeCollision(requestedStart, requestedEnd, res.startTime, res.endTime);
  });
}

/**
 * Formats a Date object to input type="datetime-local" value (YYYY-MM-DDTHH:mm)
 */
export function toDatetimeLocal(d: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function fromDatetimeLocal(val: string): Date {
  return new Date(val);
}
