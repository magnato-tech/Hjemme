import { CalendarEvent, CarReservation } from '../types';
import { isSameDay, overlapsCalendarDay } from './dateUtils';

export type CalendarDayItem =
  | { kind: 'event'; event: CalendarEvent }
  | { kind: 'reservation'; reservation: CarReservation };

export function filterEventsForCalendarDay(
  events: CalendarEvent[],
  day: Date
): CalendarEvent[] {
  return events.filter((ev) => isSameDay(ev.startTime, day));
}

export function filterReservationsForCalendarDay(
  reservations: CarReservation[],
  day: Date,
  eventsOnDay: CalendarEvent[],
  memberFilter = 'all'
): CarReservation[] {
  const eventIdsOnDay = new Set(eventsOnDay.map((ev) => ev.id));
  const linkedReservationIds = new Set(
    eventsOnDay
      .map((ev) => ev.vehicleReservationId)
      .filter((id): id is string => Boolean(id))
  );

  return reservations
    .filter((res) => {
      if (res.status === 'cancelled') return false;
      if (!overlapsCalendarDay(res.startTime, res.endTime, day)) return false;
      if (memberFilter !== 'all' && res.memberId !== memberFilter) return false;
      if (res.calendarEventId && eventIdsOnDay.has(res.calendarEventId)) return false;
      if (linkedReservationIds.has(res.id)) return false;
      return true;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

export function buildCalendarDayItems(
  events: CalendarEvent[],
  reservations: CarReservation[],
  day: Date,
  memberFilter = 'all'
): CalendarDayItem[] {
  const eventsOnDay = filterEventsForCalendarDay(events, day);
  const reservationsOnDay = filterReservationsForCalendarDay(
    reservations,
    day,
    eventsOnDay,
    memberFilter
  );

  const items: CalendarDayItem[] = [
    ...eventsOnDay.map((event) => ({ kind: 'event' as const, event })),
    ...reservationsOnDay.map((reservation) => ({ kind: 'reservation' as const, reservation })),
  ];

  return items.sort((a, b) => {
    const startA = a.kind === 'event' ? a.event.startTime : a.reservation.startTime;
    const startB = b.kind === 'event' ? b.event.startTime : b.reservation.startTime;
    return new Date(startA).getTime() - new Date(startB).getTime();
  });
}
