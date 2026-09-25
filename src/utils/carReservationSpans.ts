import { CalendarEvent, FamilySettings, GoogleCalendarItem } from '../types';
import { calculateBufferedTime, formatLocalDateKey } from './dateUtils';
import { evaluateCalendarEventCarReservation } from './googleCalendarService';
import { isAllDayEvent } from './weekCalendarGrid';

export const FAMILY_CAR_LINE_COLOR = '#f59e0b';

export interface CarReservationSpan {
  startTime: string;
  endTime: string;
}

interface TimeInterval {
  start: number;
  end: number;
}

function isCarModeCalendar(
  calId: string,
  cal: GoogleCalendarItem | undefined,
  settings: FamilySettings
): boolean {
  const config = settings.calendarConfigs?.[calId];
  if (config?.carMode && config.carMode !== 'none') return true;
  if (cal?.isCarCalendar) return true;
  if (settings.carCalendarIds?.includes(calId)) return true;
  return false;
}

function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: TimeInterval[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function clipIntervalToDay(interval: TimeInterval, day: Date): TimeInterval | null {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  const start = Math.max(interval.start, dayStart.getTime());
  const end = Math.min(interval.end, dayEnd.getTime());

  if (start >= end) return null;
  return { start, end };
}

function eventCalendarId(event: CalendarEvent): string | undefined {
  return event.calendarId || event.googleCalendarId;
}

function collectBufferedIntervals(
  events: CalendarEvent[],
  settings: FamilySettings,
  calendarsById: Map<string, GoogleCalendarItem>,
  isCalendarActiveForCar: (calId: string, calItem?: GoogleCalendarItem) => boolean
): TimeInterval[] {
  const intervals: TimeInterval[] = [];

  for (const event of events) {
    if (isAllDayEvent(event)) continue;

    const calId = eventCalendarId(event);
    if (!calId || !isCalendarActiveForCar(calId, calendarsById.get(calId))) continue;

    const cal = calendarsById.get(calId);
    if (!isCarModeCalendar(calId, cal, settings)) continue;

    const calendarConfig = settings.calendarConfigs?.[calId];
    const isCarCalendarFallback =
      Boolean(cal?.isCarCalendar) || Boolean(settings.carCalendarIds?.includes(calId));

    const evaluation = evaluateCalendarEventCarReservation({
      title: event.title,
      location: event.location,
      calendarConfig,
      defaultCarMode: calendarConfig?.carMode === 'all' ? 'all' : 'work_only',
      defaultVehicleId: calendarConfig?.targetVehicleId || cal?.targetVehicleId,
      defaultBufferBefore: settings.defaultTravelBufferBefore ?? 40,
      defaultBufferAfter: settings.defaultTravelBufferAfter ?? 40,
      isCarCalendarFallback,
    });

    if (!evaluation.shouldCreateCar) continue;

    const buffered = calculateBufferedTime(
      event.startTime,
      event.endTime,
      evaluation.bufferBefore,
      evaluation.bufferAfter
    );

    const start = new Date(buffered.reservationStart).getTime();
    const end = new Date(buffered.reservationEnd).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) continue;

    intervals.push({ start, end });
  }

  return intervals;
}

/** Sammenslåtte bilreservasjonsintervaller per dag (én liste per dag i weekDates). */
export function buildCarReservationSpansByDay(
  events: CalendarEvent[],
  settings: FamilySettings,
  calendars: GoogleCalendarItem[],
  weekDates: Date[],
  isCalendarActiveForCar: (calId: string, calItem?: GoogleCalendarItem) => boolean
): CarReservationSpan[][] {
  const calendarsById = new Map(calendars.map((cal) => [cal.id, cal]));
  const bufferedIntervals = collectBufferedIntervals(
    events,
    settings,
    calendarsById,
    isCalendarActiveForCar
  );

  return weekDates.map((day) => {
    const dayIntervals = bufferedIntervals
      .map((interval) => clipIntervalToDay(interval, day))
      .filter((interval): interval is TimeInterval => interval !== null);

    return mergeIntervals(dayIntervals).map((interval) => ({
      startTime: new Date(interval.start).toISOString(),
      endTime: new Date(interval.end).toISOString(),
    }));
  });
}

/** Dato-nøkler (YYYY-MM-DD) der Familiebilen har minst ett opptatt intervall. */
export function getFamilyCarOccupiedDateKeys(
  events: CalendarEvent[],
  settings: FamilySettings,
  calendars: GoogleCalendarItem[],
  dates: Date[],
  isCalendarActiveForCar: (calId: string, calItem?: GoogleCalendarItem) => boolean
): Set<string> {
  const spansByDay = buildCarReservationSpansByDay(
    events,
    settings,
    calendars,
    dates,
    isCalendarActiveForCar
  );

  const keys = new Set<string>();
  dates.forEach((date, index) => {
    if (spansByDay[index]?.length > 0) {
      keys.add(formatLocalDateKey(date));
    }
  });
  return keys;
}

/** Hjelper for enkeltdagsvisning. */
export function buildCarReservationSpansForDay(
  events: CalendarEvent[],
  settings: FamilySettings,
  calendars: GoogleCalendarItem[],
  day: Date,
  isCalendarActiveForCar: (calId: string, calItem?: GoogleCalendarItem) => boolean
): CarReservationSpan[] {
  return buildCarReservationSpansByDay(
    events,
    settings,
    calendars,
    [day],
    isCalendarActiveForCar
  )[0];
}
