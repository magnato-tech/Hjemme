import { describe, expect, it } from 'vitest';
import { buildCalendarDayItems } from '../utils/carCalendarDayItems';
import {
  buildCarReservationSpansByDay,
  getFamilyCarOccupiedDateKeys,
} from '../utils/carReservationSpans';
import {
  evaluateCarBookingAvailability,
  formTimesAfterReservation,
  parseNorwegianDatetimeFields,
} from '../utils/carBookingFlow';
import {
  formatNorwegianDateInput,
  formatNorwegianTimeInput,
  nextAvailableCarRequestTimes,
  tryBuildDatetimeLocal,
} from '../utils/dateUtils';
import { isCalendarActiveForCar } from '../utils/calendarVisibility';
import { baseSettings, jobCalendar } from './fixtures/calendarFixtures';
import { CarReservation } from '../types';

const alwaysActive = (calId: string) => isCalendarActiveForCar(calId, baseSettings);

function makeManualReservation(
  start: Date,
  end: Date,
  id = 'res_manual'
): CarReservation {
  return {
    id,
    vehicleId: 'veh_1',
    memberId: 'm1',
    memberName: 'Magnar',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    purpose: 'Privat tur',
    isWorkRelated: false,
    source: 'manual',
    status: 'confirmed',
    createdAt: start.toISOString(),
  };
}

describe('carBookingIntegration', () => {
  describe('norsk dato og tid', () => {
    it('rundtur fra lagret verdi til visning og tilbake', () => {
      const stored = '2026-10-08T21:30';
      const dateText = formatNorwegianDateInput(stored);
      const timeText = formatNorwegianTimeInput(stored);

      expect(dateText).toBe('08/10/2026');
      expect(timeText).toBe('21:30');
      expect(parseNorwegianDatetimeFields(dateText, timeText)).toBe(stored);
      expect(tryBuildDatetimeLocal(dateText, timeText)).toBe(stored);
    });
  });

  describe('tilgjengelighet og konflikt', () => {
    const now = new Date(2026, 9, 6, 20, 0);
    const existing = [
      makeManualReservation(
        new Date(2026, 9, 6, 21, 0),
        new Date(2026, 9, 6, 22, 0),
        'res_existing'
      ),
    ];

    it('ledig tidsrom uten konflikt', () => {
      const result = evaluateCarBookingAvailability(
        new Date(2026, 9, 6, 22, 0).toISOString(),
        new Date(2026, 9, 6, 23, 0).toISOString(),
        existing,
        now
      );
      expect(result.timeIssue).toBeNull();
      expect(result.isAvailable).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('overlappende tidsrom gir konflikt', () => {
      const result = evaluateCarBookingAvailability(
        new Date(2026, 9, 6, 21, 30).toISOString(),
        new Date(2026, 9, 6, 22, 30).toISOString(),
        existing,
        now
      );
      expect(result.isAvailable).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].id).toBe('res_existing');
    });

    it('start i fortiden avvises', () => {
      const result = evaluateCarBookingAvailability(
        new Date(2026, 9, 6, 19, 0).toISOString(),
        new Date(2026, 9, 6, 20, 30).toISOString(),
        [],
        now
      );
      expect(result.timeIssue).toBe('past');
      expect(result.isAvailable).toBe(false);
    });
  });

  describe('nullstilling etter reservasjon', () => {
    it('hopper til neste ledige vindu etter ny reservasjon', () => {
      const now = new Date(2026, 9, 6, 21, 0);
      const booked = makeManualReservation(
        new Date(2026, 9, 6, 21, 0),
        new Date(2026, 9, 6, 22, 0)
      );

      const next = formTimesAfterReservation([], booked, now);
      expect(next.start).toBe('2026-10-06T22:00');
      expect(next.end).toBe('2026-10-06T23:00');

      const check = evaluateCarBookingAvailability(
        new Date(next.start).toISOString(),
        new Date(next.end).toISOString(),
        [booked],
        now
      );
      expect(check.isAvailable).toBe(true);
    });

    it('nextAvailableCarRequestTimes og formTimesAfterReservation er konsistente', () => {
      const now = new Date(2026, 9, 6, 21, 0);
      const booked = makeManualReservation(
        new Date(2026, 9, 6, 21, 0),
        new Date(2026, 9, 6, 22, 0)
      );

      const fromHelper = formTimesAfterReservation([], booked, now);
      const fromDateUtils = nextAvailableCarRequestTimes([booked], now);
      expect(fromHelper).toEqual(fromDateUtils);
    });
  });

  describe('kalender og bil', () => {
    const oct8 = new Date(2026, 9, 8);
    const reservation = makeManualReservation(
      new Date(2026, 9, 8, 21, 30),
      new Date(2026, 9, 8, 22, 30)
    );

    it('manuell reservasjon tegnes i oransje bil-linje', () => {
      const spans = buildCarReservationSpansByDay(
        [],
        baseSettings,
        [jobCalendar],
        [oct8],
        alwaysActive,
        [reservation]
      )[0];

      expect(spans).toHaveLength(1);
      expect(new Date(spans[0].startTime).getHours()).toBe(21);
      expect(new Date(spans[0].startTime).getMinutes()).toBe(30);
    });

    it('manuell reservasjon markerer dag som opptatt i måned', () => {
      const keys = getFamilyCarOccupiedDateKeys(
        [],
        baseSettings,
        [jobCalendar],
        [oct8],
        alwaysActive,
        [reservation]
      );
      expect(keys.has('2026-10-08')).toBe(true);
    });

    it('manuell reservasjon vises i dagsdetalj-panelet', () => {
      const items = buildCalendarDayItems([], [reservation], oct8);
      expect(items).toHaveLength(1);
      expect(items[0].kind).toBe('reservation');
    });

    it('hele flyten: book -> nullstill -> ledig -> synlig i kalender', () => {
      const now = new Date(2026, 9, 6, 21, 0);
      const booked = makeManualReservation(
        new Date(2026, 9, 6, 21, 0),
        new Date(2026, 9, 6, 22, 0)
      );
      const allReservations = [booked];

      const reset = formTimesAfterReservation(allReservations, booked, now);
      const availability = evaluateCarBookingAvailability(
        new Date(reset.start).toISOString(),
        new Date(reset.end).toISOString(),
        allReservations,
        now
      );

      const day = new Date(2026, 9, 6);
      const spans = buildCarReservationSpansByDay(
        [],
        baseSettings,
        [jobCalendar],
        [day],
        alwaysActive,
        allReservations
      )[0];
      const panelItems = buildCalendarDayItems([], allReservations, day);

      expect(availability.isAvailable).toBe(true);
      expect(spans.length).toBeGreaterThan(0);
      expect(panelItems.some((item) => item.kind === 'reservation')).toBe(true);
    });
  });
});
