/**
 * Reads an iCal feed (.ics) into the same event shape the calendar sync already understands.
 * Google does not allow the browser to fetch calendar.google.com directly, so the text is
 * loaded through the local /api/ical proxy.
 */

export interface IcalEventItem {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

export interface IcalWindow {
  from: Date;
  to: Date;
}

const DAY_INDEX: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

interface RecurrenceRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  count?: number;
  until?: Date;
  byday: number[];
}

interface RawEvent {
  uid: string;
  summary?: string;
  description?: string;
  location?: string;
  status?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  rrule?: RecurrenceRule;
  exdates: number[];
  recurrenceId?: number;
}

export function normalizeIcalUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.toLowerCase().startsWith('webcal://')) {
    return `https://${trimmed.slice('webcal://'.length)}`;
  }
  return trimmed;
}

export function isIcalAddress(raw: string): boolean {
  const value = normalizeIcalUrl(raw).toLowerCase();
  return (
    value.startsWith('https://') ||
    value.startsWith('http://') ||
    value.includes('.ics') ||
    value.includes('/ical/')
  );
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host === '0.0.0.0' || host === '::1') return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  return false;
}

/** Only public https calendar addresses. Blocks local network targets. */
export function isAllowedIcalUrl(raw: string): boolean {
  try {
    const url = new URL(normalizeIcalUrl(raw));
    if (url.protocol !== 'https:') return false;
    if (isPrivateHost(url.hostname)) return false;
    const path = decodeURIComponent(url.pathname).toLowerCase();
    const host = url.hostname.toLowerCase();
    return (
      path.endsWith('.ics') ||
      path.includes('/ical/') ||
      host === 'calendar.google.com' ||
      host.endsWith('.calendar.google.com')
    );
  } catch {
    return false;
  }
}

export function defaultIcalWindow(now = new Date()): IcalWindow {
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setDate(to.getDate() + 370);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function unfoldIcal(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '');
}

function unescapeIcalText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseContentLine(line: string): { name: string; params: Record<string, string>; value: string } | null {
  const colon = line.indexOf(':');
  if (colon < 0) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [rawName, ...paramParts] = left.split(';');
  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    let paramValue = part.slice(eq + 1);
    if (paramValue.startsWith('"') && paramValue.endsWith('"')) {
      paramValue = paramValue.slice(1, -1);
    }
    params[part.slice(0, eq).toUpperCase()] = paramValue;
  }
  return { name: rawName.toUpperCase(), params, value };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatLocalDateTime(date: Date): string {
  return `${formatLocalDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function parseIcalInstant(value: string, params: Record<string, string>): { date: Date; allDay: boolean } | null {
  const raw = value.trim();
  const allDay = params.VALUE === 'DATE' || /^\d{8}$/.test(raw);
  if (allDay) {
    const match = raw.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!match) return null;
    return {
      date: new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0),
      allDay: true,
    };
  }
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, zulu] = match;
  if (zulu) {
    return {
      date: new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))),
      allDay: false,
    };
  }
  return {
    date: new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)),
    allDay: false,
  };
}

function parseRRule(value: string): RecurrenceRule | null {
  const parts: Record<string, string> = {};
  for (const piece of value.split(';')) {
    const eq = piece.indexOf('=');
    if (eq < 0) continue;
    parts[piece.slice(0, eq).toUpperCase()] = piece.slice(eq + 1);
  }
  const freq = parts.FREQ;
  if (freq !== 'DAILY' && freq !== 'WEEKLY' && freq !== 'MONTHLY' && freq !== 'YEARLY') return null;
  const byday = (parts.BYDAY || '')
    .split(',')
    .map((token) => DAY_INDEX[token.replace(/^[+-]?\d+/, '').toUpperCase()])
    .filter((day) => day !== undefined);
  let until: Date | undefined;
  if (parts.UNTIL) {
    until = parseIcalInstant(parts.UNTIL, /^\d{8}$/.test(parts.UNTIL) ? { VALUE: 'DATE' } : {})?.date;
  }
  return {
    freq,
    interval: Math.max(1, Number(parts.INTERVAL) || 1),
    count: parts.COUNT ? Number(parts.COUNT) : undefined,
    until,
    byday,
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function diffDays(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const offset = (day.getDay() + 6) % 7;
  return addDays(day, -offset);
}

function withClock(day: Date, clock: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), clock.getHours(), clock.getMinutes(), clock.getSeconds(), 0);
}

function matchesRule(day: Date, seriesStart: Date, rule: RecurrenceRule): boolean {
  if (startOfDay(day).getTime() < startOfDay(seriesStart).getTime()) return false;
  if (rule.until && startOfDay(day).getTime() > startOfDay(rule.until).getTime()) return false;
  if (rule.freq === 'DAILY') {
    const days = diffDays(seriesStart, day);
    if (days < 0 || days % rule.interval !== 0) return false;
    if (rule.byday.length > 0 && !rule.byday.includes(day.getDay())) return false;
    return true;
  }
  if (rule.freq === 'WEEKLY') {
    const days = rule.byday.length > 0 ? rule.byday : [seriesStart.getDay()];
    if (!days.includes(day.getDay())) return false;
    const weeks = Math.floor(diffDays(startOfWeek(seriesStart), startOfWeek(day)) / 7);
    return weeks >= 0 && weeks % rule.interval === 0;
  }
  if (rule.freq === 'MONTHLY') {
    if (day.getDate() !== seriesStart.getDate()) return false;
    const months = (day.getFullYear() - seriesStart.getFullYear()) * 12 + (day.getMonth() - seriesStart.getMonth());
    return months >= 0 && months % rule.interval === 0;
  }
  if (day.getMonth() !== seriesStart.getMonth() || day.getDate() !== seriesStart.getDate()) return false;
  const years = day.getFullYear() - seriesStart.getFullYear();
  return years >= 0 && years % rule.interval === 0;
}

function toItem(event: RawEvent, start: Date, end: Date, stamp: string): IcalEventItem {
  if (event.allDay) {
    return {
      id: `${event.uid}__${stamp}`,
      summary: event.summary,
      description: event.description,
      location: event.location,
      status: event.status,
      start: { date: formatLocalDate(start) },
      end: { date: formatLocalDate(end) },
    };
  }
  return {
    id: `${event.uid}__${formatLocalDateTime(start)}`,
    summary: event.summary,
    description: event.description,
    location: event.location,
    status: event.status,
    start: { dateTime: formatLocalDateTime(start) },
    end: { dateTime: formatLocalDateTime(end) },
  };
}

function overlaps(start: Date, end: Date, window: IcalWindow): boolean {
  return start.getTime() <= window.to.getTime() && end.getTime() >= window.from.getTime();
}

function expandEvent(event: RawEvent, window: IcalWindow): IcalEventItem[] {
  const excluded = new Set(event.exdates);
  const durationMs = Math.max(event.end.getTime() - event.start.getTime(), event.allDay ? 24 * 60 * 60 * 1000 : 0);

  if (!event.rrule) {
    if (excluded.has(event.start.getTime()) || !overlaps(event.start, event.end, window)) return [];
    return [toItem(event, event.start, event.end, event.allDay ? formatLocalDate(event.start) : formatLocalDateTime(event.start))];
  }

  const items: IcalEventItem[] = [];
  const limit = Math.min(event.rrule.count ?? 400, 400);
  const horizon = new Date(window.to);
  horizon.setDate(horizon.getDate() + 1);
  let cursor = startOfDay(event.start);
  let seen = 0;
  let guard = 0;
  while (seen < limit && guard < 1200 && cursor.getTime() <= horizon.getTime()) {
    if (matchesRule(cursor, event.start, event.rrule)) {
      seen += 1;
      const start = event.allDay ? startOfDay(cursor) : withClock(cursor, event.start);
      const end = new Date(start.getTime() + durationMs);
      if (!excluded.has(start.getTime()) && overlaps(start, end, window)) {
        items.push(toItem(event, start, end, event.allDay ? formatLocalDate(start) : formatLocalDateTime(start)));
      }
    }
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return items;
}

function readRawEvents(ics: string): RawEvent[] {
  const unfolded = unfoldIcal(ics);
  if (!unfolded.includes('BEGIN:VCALENDAR')) {
    throw new Error('Svaret var ikke en kalenderfil. Bruk den hemmelige eller offentlige iCal-adressen fra Google Kalender.');
  }
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
  const events: RawEvent[] = [];
  blocks.forEach((block, index) => {
    const body = block.split('END:VEVENT')[0];
    const fields = new Map<string, { params: Record<string, string>; value: string }>();
    const exdates: number[] = [];
    for (const line of body.split('\n')) {
      const parsed = parseContentLine(line.trim());
      if (!parsed) continue;
      if (parsed.name === 'EXDATE') {
        for (const piece of parsed.value.split(',')) {
          const instant = parseIcalInstant(piece, parsed.params);
          if (instant) exdates.push(instant.date.getTime());
        }
        continue;
      }
      fields.set(parsed.name, { params: parsed.params, value: unescapeIcalText(parsed.value) });
    }
    const startField = fields.get('DTSTART');
    if (!startField) return;
    const start = parseIcalInstant(startField.value, startField.params);
    if (!start) return;
    const endField = fields.get('DTEND');
    const end = endField ? parseIcalInstant(endField.value, endField.params) : null;
    const fallbackEnd = start.allDay
      ? addDays(start.date, 1)
      : new Date(start.date.getTime() + 60 * 60 * 1000);
    const status = fields.get('STATUS')?.value.toUpperCase();
    if (status === 'CANCELLED') return;
    const recurrence = fields.get('RECURRENCE-ID');
    const recurrenceInstant = recurrence ? parseIcalInstant(recurrence.value, recurrence.params) : null;
    events.push({
      uid: fields.get('UID')?.value || `event-${index}`,
      summary: fields.get('SUMMARY')?.value,
      description: fields.get('DESCRIPTION')?.value,
      location: fields.get('LOCATION')?.value,
      status: status?.toLowerCase(),
      start: start.date,
      end: end?.date || fallbackEnd,
      allDay: start.allDay,
      rrule: fields.get('RRULE') ? parseRRule(fields.get('RRULE')!.value) || undefined : undefined,
      exdates,
      recurrenceId: recurrenceInstant?.date.getTime(),
    });
  });
  return events;
}

export function parseIcalEvents(ics: string, window: IcalWindow = defaultIcalWindow()): IcalEventItem[] {
  const raw = readRawEvents(ics);
  const exceptions = new Map<string, RawEvent>();
  for (const event of raw) {
    if (event.recurrenceId !== undefined) {
      exceptions.set(`${event.uid}__${event.recurrenceId}`, event);
    }
  }
  const items: IcalEventItem[] = [];
  for (const event of raw) {
    if (event.recurrenceId !== undefined) continue;
    for (const item of expandEvent(event, window)) {
      const stamp = item.start?.dateTime || item.start?.date || '';
      const stampTime = item.start?.dateTime
        ? new Date(item.start.dateTime).getTime()
        : item.start?.date
          ? new Date(`${item.start.date}T00:00:00`).getTime()
          : NaN;
      const exception = exceptions.get(`${event.uid}__${stampTime}`);
      if (exception) {
        if (overlaps(exception.start, exception.end, window)) {
          items.push(toItem(exception, exception.start, exception.end, stamp));
        }
        continue;
      }
      items.push(item);
    }
  }
  return items;
}

export async function fetchIcalText(icalUrl: string): Promise<string> {
  const target = normalizeIcalUrl(icalUrl);
  if (!isAllowedIcalUrl(target)) {
    throw new Error('Kalenderadressen må være en https-adresse til en iCal-fil.');
  }
  const response = await fetch(`/api/ical?url=${encodeURIComponent(target)}`);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text.trim() || `Kunne ikke hente kalenderen (${response.status}).`);
  }
  return text;
}
