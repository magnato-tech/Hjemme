import { CalendarEvent, CarReservation, Vehicle } from '../types';
import { isSameDay, overlapsCalendarDay } from './dateUtils';

/** Hendelse opprettet i appen for en bilreservasjon — ikke en Google/iCal-avtale. */
export function isExplicitCarReservationEvent(event: CalendarEvent): boolean {
  return event.calendarId === 'car_reservations' || event.id.startsWith('cal_res_');
}

/** Kalenderhendelser som kun representerer bilreservasjoner (inkl. syntetiske fra reservasjonsliste). */
export function buildCarReservationCalendarEvents(
  calendarEvents: CalendarEvent[],
  reservations: CarReservation[],
  vehicles: Pick<Vehicle, 'id' | 'name'>[],
  memberFilter = 'all'
): CalendarEvent[] {
  const list = calendarEvents.filter(isExplicitCarReservationEvent);
  const existingIds = new Set(list.map((e) => e.id));
  const existingResIds = new Set(
    list.map((e) => e.vehicleReservationId).filter((id): id is string => Boolean(id))
  );

  for (const res of reservations) {
    if (res.status === 'cancelled') continue;
    if (memberFilter !== 'all' && res.memberId !== memberFilter) continue;

    const calId = res.calendarEventId || `cal_res_${res.id}`;
    if (existingIds.has(calId) || existingResIds.has(res.id)) continue;

    const vehicle = vehicles.find((v) => v.id === res.vehicleId);
    list.push({
      id: calId,
      memberId: res.memberId,
      memberName: res.memberName,
      calendarId: 'car_reservations',
      title: res.purpose
        ? `🚗 Bil: ${res.purpose}`
        : `🚗 Bilreservasjon (${vehicle?.name || 'Familiebil'})`,
      startTime: res.startTime,
      endTime: res.endTime,
      location: res.location,
      description: res.notes,
      isWorkRelated: res.isWorkRelated || false,
      createsCarReservation: true,
      vehicleReservationId: res.id,
      isConfidential: res.isConfidential || false,
    });
    existingIds.add(calId);
    existingResIds.add(res.id);
  }

  return list;
}

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
