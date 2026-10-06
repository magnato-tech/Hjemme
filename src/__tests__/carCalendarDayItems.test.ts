import { describe, expect, it } from 'vitest';
import {
  buildCalendarDayItems,
  filterReservationsForCalendarDay,
} from '../utils/carCalendarDayItems';
import { CalendarEvent, CarReservation } from '../types';

const oct8 = new Date(2026, 9, 8);

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'ev_1',
    memberId: 'm1',
    memberName: 'Magnar',
    calendarId: 'cal_job',
    title: 'Møte',
    startTime: '2026-10-08T10:00:00',
    endTime: '2026-10-08T11:00:00',
    isWorkRelated: true,
    createsCarReservation: true,
    ...overrides,
  };
}

function makeReservation(overrides: Partial<CarReservation> = {}): CarReservation {
  return {
    id: 'res_1',
    vehicleId: 'veh_1',
    memberId: 'm1',
    memberName: 'Magnar',
    startTime: new Date(2026, 9, 8, 21, 30).toISOString(),
    endTime: new Date(2026, 9, 8, 22, 30).toISOString(),
    purpose: 'Privat tur',
    isWorkRelated: false,
    source: 'manual',
    status: 'confirmed',
    createdAt: '2026-10-06T12:00:00.000Z',
    ...overrides,
  };
}

describe('carCalendarDayItems', () => {
  it('viser manuelle reservasjoner på valgt dag', () => {
    const items = buildCalendarDayItems([], [makeReservation()], oct8);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('reservation');
    if (items[0].kind === 'reservation') {
      expect(items[0].reservation.purpose).toBe('Privat tur');
    }
  });

  it('slår sammen hendelser og reservasjoner sortert etter start', () => {
    const items = buildCalendarDayItems(
      [makeEvent()],
      [makeReservation({ id: 'res_2', startTime: new Date(2026, 9, 8, 18, 0).toISOString(), endTime: new Date(2026, 9, 8, 19, 0).toISOString() })],
      oct8
    );

    expect(items).toHaveLength(2);
    expect(items[0].kind).toBe('event');
    expect(items[1].kind).toBe('reservation');
  });

  it('utelater reservasjon som allerede vises via kalenderhendelse', () => {
    const reservation = makeReservation({ id: 'res_linked', calendarEventId: 'ev_linked' });
    const event = makeEvent({
      id: 'ev_linked',
      vehicleReservationId: 'res_linked',
    });

    const items = buildCalendarDayItems([event], [reservation], oct8);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('event');
  });

  it('ignorerer avbestilte reservasjoner', () => {
    const items = buildCalendarDayItems(
      [],
      [makeReservation({ status: 'cancelled' })],
      oct8
    );
    expect(items).toHaveLength(0);
  });

  it('filtrerer på familiemedlem', () => {
    const reservations = filterReservationsForCalendarDay(
      [
        makeReservation({ memberId: 'm1' }),
        makeReservation({ id: 'res_2', memberId: 'm2', memberName: 'Marcus' }),
      ],
      oct8,
      [],
      'm2'
    );

    expect(reservations).toHaveLength(1);
    expect(reservations[0].memberName).toBe('Marcus');
  });

  it('finner reservasjon som starter dagen før og slutter på valgt dag', () => {
    const reservation = makeReservation({
      startTime: new Date(2026, 9, 7, 23, 30).toISOString(),
      endTime: new Date(2026, 9, 8, 0, 30).toISOString(),
    });

    const items = buildCalendarDayItems([], [reservation], oct8);
    expect(items).toHaveLength(1);
  });
});
