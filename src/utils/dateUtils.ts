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

/** Poenguken starter mandag kl. 06:00 (lokal tid). */
export const POINTS_WEEK_START_DAY = 1; // Monday
export const POINTS_WEEK_RESET_HOUR = 6;

/** Returnerer mandag kl. 06:00 for inneværende poenguke. */
export function getPointsWeekStart(now: Date = new Date()): Date {
  const d = new Date(now);
  const daysSinceMonday = (d.getDay() + 6) % 7;
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - daysSinceMonday);
  weekStart.setHours(POINTS_WEEK_RESET_HOUR, 0, 0, 0);

  if (weekStart > now) {
    weekStart.setDate(weekStart.getDate() - 7);
  }

  return weekStart;
}

export function getPointsWeekEnd(now: Date = new Date()): Date {
  const end = new Date(getPointsWeekStart(now));
  end.setDate(end.getDate() + 7);
  return end;
}

export function isInCurrentPointsWeek(
  isoDate: string | undefined,
  now: Date = new Date()
): boolean {
  if (!isoDate) return false;
  const timestamp = new Date(isoDate);
  if (Number.isNaN(timestamp.getTime())) return false;
  const start = getPointsWeekStart(now);
  const end = getPointsWeekEnd(now);
  return timestamp >= start && timestamp < end;
}

/** Sjekker om et tidspunkt faller innen en gitt poenguke (start mandag 06:00). */
export function isInPointsWeek(isoDate: string | undefined, weekStart: Date): boolean {
  if (!isoDate) return false;
  const timestamp = new Date(isoDate);
  if (Number.isNaN(timestamp.getTime())) return false;
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 7);
  return timestamp >= weekStart && timestamp < end;
}

export function getPointsWeekKey(now: Date = new Date()): string {
  return formatLocalDateKey(getPointsWeekStart(now));
}

/** 0 = inneværende poenguke, 1 = forrige uke, osv. */
export function getPointsWeekStartOffset(weeksAgo: number, now: Date = new Date()): Date {
  const start = getPointsWeekStart(now);
  start.setDate(start.getDate() - weeksAgo * 7);
  return start;
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

/** True when a time range overlaps any part of a calendar day (local time). */
export function overlapsCalendarDay(
  startTime: string | Date,
  endTime: string | Date,
  day: Date | string
): boolean {
  const dayDate = parseLocalDate(day);
  const dayStart = new Date(dayDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayDate);
  dayEnd.setHours(23, 59, 59, 999);
  return checkTimeCollision(startTime, endTime, dayStart, dayEnd);
}

/** Future or still ongoing — used to hide past events from suggestion lists. */
export function isEventFutureOrActive(
  startTime: string,
  endTime?: string,
  now = new Date()
): boolean {
  if (endTime) {
    const end = new Date(endTime).getTime();
    if (!Number.isNaN(end)) {
      return end >= now.getTime();
    }
  }
  if (startTime) {
    const start = new Date(startTime).getTime();
    if (!Number.isNaN(start)) {
      if (start >= now.getTime()) return true;
      if (isSameDay(startTime, now) && !endTime) return true;
    }
  }
  return false;
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

/** Splits a datetime-local value (YYYY-MM-DDTHH:mm) into date and time parts. */
export function splitDatetimeLocal(value: string): { date: string; time: string } {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  if (!match) return { date: '', time: '' };
  return { date: match[1], time: match[2] };
}

/** dd/mm/yyyy from a datetime-local value. */
export function formatNorwegianDateInput(value: string): string {
  const { date } = splitDatetimeLocal(value);
  if (!date) return '';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

/** HH:mm (24-hour) from a datetime-local value. */
export function formatNorwegianTimeInput(value: string): string {
  return splitDatetimeLocal(value).time;
}

/** Parses dd/mm/yyyy text to YYYY-MM-DD, or null when invalid. */
export function parseNorwegianDateInput(text: string): string | null {
  const trimmed = text.trim();
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Parses HH:mm text to a normalized time string, or null when invalid. */
export function parseNorwegianTimeInput(text: string): string | null {
  const trimmed = text.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}`;
}

/** Combines ISO date and HH:mm into datetime-local format. */
export function combineDatetimeLocal(dateIso: string, time: string): string {
  return `${dateIso}T${time}`;
}

/** Builds datetime-local from Norwegian date/time text when both parts are valid. */
export function tryBuildDatetimeLocal(dateText: string, timeText: string): string | null {
  const dateIso = parseNorwegianDateInput(dateText);
  const time = parseNorwegianTimeInput(timeText);
  if (!dateIso || !time) return null;
  return combineDatetimeLocal(dateIso, time);
}

/** dd/mm/yyyy HH:mm for datetime-local input display (24-hour, day first). */
export function formatNorwegianDateTimeInput(value: string): string {
  if (!value) return '';
  const datePart = formatNorwegianDateInput(value);
  const timePart = formatNorwegianTimeInput(value);
  if (datePart && timePart) return `${datePart} ${timePart}`;
  const d = parseLocalDate(value);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

export function truncateToMinute(date: Date): Date {
  const copy = new Date(date);
  copy.setSeconds(0, 0);
  return copy;
}

/** A start in an earlier minute than now is already in the past. */
export function isStartInThePast(start: Date, now = new Date()): boolean {
  return truncateToMinute(start).getTime() < truncateToMinute(now).getTime();
}

/** End must be strictly after start. Equal or earlier is a backwards booking. */
export function isReservationBackwards(start: Date, end: Date): boolean {
  return Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime();
}

export function suggestedReservationEnd(start: Date, hours = 1): Date {
  return new Date(start.getTime() + hours * ONE_HOUR_MS);
}

export type ReservationTimeIssue = 'past' | 'backwards';

export function reservationTimeIssue(
  start: Date,
  end: Date,
  now = new Date()
): ReservationTimeIssue | null {
  if (isStartInThePast(start, now)) return 'past';
  if (isReservationBackwards(start, end)) return 'backwards';
  return null;
}

export function reservationTimeMessage(issue: ReservationTimeIssue): string {
  if (issue === 'past') {
    return 'Du kan ikke bestille et tidspunkt som allerede har vært.';
  }
  return 'Slutten må være etter starten. Reservasjonen kan ikke gå bakover i tid.';
}

/** Default start/end pair for car request forms (start = now, end = +1h). */
export function defaultCarRequestTimes(now = new Date()): { start: string; end: string } {
  const start = truncateToMinute(now);
  return {
    start: toDatetimeLocal(start),
    end: toDatetimeLocal(suggestedReservationEnd(start)),
  };
}

/** Next conflict-free 1h window after existing reservations (for form reset after booking). */
export function nextAvailableCarRequestTimes(
  existingReservations: Array<{ startTime: string; endTime: string; id: string; status?: string }>,
  now = new Date()
): { start: string; end: string } {
  let start = truncateToMinute(now);
  const maxAttempts = 168;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const end = suggestedReservationEnd(start);
    const conflicts = findConflictingReservations(
      start.toISOString(),
      end.toISOString(),
      existingReservations
    );

    if (conflicts.length === 0) {
      return {
        start: toDatetimeLocal(start),
        end: toDatetimeLocal(end),
      };
    }

    const jumpTo = conflicts.reduce(
      (latest, conflict) => Math.max(latest, new Date(conflict.endTime).getTime()),
      start.getTime()
    );
    const nextStart = truncateToMinute(new Date(jumpTo));
    if (nextStart.getTime() <= start.getTime()) {
      nextStart.setMinutes(nextStart.getMinutes() + 15);
    }
    start = nextStart;
  }

  return defaultCarRequestTimes(now);
}

/** 16:30 today when that is still ahead, otherwise the current minute. */
export function defaultCarRequestStart(now = new Date()): Date {
  const preferred = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 30, 0, 0);
  if (!isStartInThePast(preferred, now)) return preferred;
  return truncateToMinute(now);
}

export function fromDatetimeLocal(val: string): Date {
  return new Date(val);
}
