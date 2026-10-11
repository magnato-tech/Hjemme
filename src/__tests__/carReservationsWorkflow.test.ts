import { describe, expect, it } from 'vitest';
import { CarReservation, Vehicle } from '../types';
import {
  checkTimeCollision,
  findConflictingReservations,
  formatNorwegianDate,
  formatTime,
  formatTimeRange,
  isToday,
} from '../utils/dateUtils';
import { magnar, marcus, synelle } from './fixtures/taskFixtures';

const testVehicle: Vehicle = {
  id: 'veh_1',
  name: 'Familiebilen',
  licensePlate: 'EL 98765',
  ownerId: magnar.id,
  isAvailable: true,
  color: 'bg-slate-800',
  fuelType: 'electric',
};

function createReservation(
  id: string,
  member: typeof magnar | typeof marcus | typeof synelle,
  start: string,
  end: string,
  purpose: string,
  status: CarReservation['status'] = 'confirmed',
  isWorkRelated = false,
  location?: string
): CarReservation {
  return {
    id,
    vehicleId: testVehicle.id,
    memberId: member.id,
    memberName: member.name,
    startTime: start,
    endTime: end,
    purpose,
    status,
    isWorkRelated,
    source: 'manual',
    location,
    createdAt: new Date().toISOString(),
  };
}

// Simulering av state-funksjonene i FamilyContext (createCarReservation, cancelReservation, checkCarAvailability)
function applyCreateCarReservation(
  currentReservations: CarReservation[],
  data: Omit<CarReservation, 'id' | 'createdAt'>,
  generateId = () => 'res_test_' + Math.random().toString(36).substring(2, 6)
): { updated: CarReservation[]; result: { success: boolean; conflicts: CarReservation[]; reservation: CarReservation } } {
  const conflicts = findConflictingReservations(data.startTime, data.endTime, currentReservations);
  const isAvailable = conflicts.length === 0;

  const newReservation: CarReservation = {
    ...data,
    id: generateId(),
    createdAt: '2026-10-05T12:00:00Z',
    status: isAvailable ? 'confirmed' : 'pending_conflict',
  };

  return {
    updated: [newReservation, ...currentReservations],
    result: {
      success: isAvailable,
      conflicts,
      reservation: newReservation,
    },
  };
}

function applyCancelReservation(
  currentReservations: CarReservation[],
  reservationId: string
): CarReservation[] {
  return currentReservations.filter((r) => r.id !== reservationId);
}

describe('Bilreservasjon og tilgjengelighet (CarModule & FamilyContext)', () => {
  describe('1. Opprette og vise ny reservasjon', () => {
    it('oppretter ny bekreftet reservasjon når bilen er ledig', () => {
      const initialReservations: CarReservation[] = [];

      const { updated, result } = applyCreateCarReservation(initialReservations, {
        vehicleId: testVehicle.id,
        memberId: marcus.id,
        memberName: marcus.name,
        startTime: '2026-10-05T16:00:00Z',
        endTime: '2026-10-05T18:00:00Z',
        purpose: 'Kjøre til fotballtrening',
        isWorkRelated: false,
        source: 'manual',
        status: 'confirmed',
        location: 'Kristiansand stadion',
      });

      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.reservation.status).toBe('confirmed');
      expect(result.reservation.purpose).toBe('Kjøre til fotballtrening');
      expect(result.reservation.location).toBe('Kristiansand stadion');
      expect(updated).toHaveLength(1);
      expect(updated[0].memberName).toBe('Marcus');
    });

    it('sorterer reservasjoner kronologisk etter starttid for visning', () => {
      const r1 = createReservation('r1', magnar, '2026-10-05T14:00:00Z', '2026-10-05T15:00:00Z', 'Møte');
      const r2 = createReservation('r2', synelle, '2026-10-05T09:00:00Z', '2026-10-05T10:30:00Z', 'Handletur');
      const r3 = createReservation('r3', marcus, '2026-10-05T18:00:00Z', '2026-10-05T19:30:00Z', 'Trening');

      const list = [r1, r2, r3];
      const sorted = [...list].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      expect(sorted.map((r) => r.id)).toEqual(['r2', 'r1', 'r3']);
      expect(sorted[0].memberName).toBe('Synelle');
    });
  });

  describe('2. Kollisjoner og konfliktvarsling', () => {
    it('oppdager overlapp når to reserverer samme bil på samme tidspunkt', () => {
      const existing = createReservation(
        'res_1',
        magnar,
        '2026-10-05T10:00:00Z',
        '2026-10-05T12:00:00Z',
        'Kundebesøk Lillesand',
        'confirmed',
        true
      );

      const conflicts = findConflictingReservations(
        '2026-10-05T11:00:00Z',
        '2026-10-05T13:00:00Z',
        [existing]
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe('res_1');
      expect(conflicts[0].memberName).toBe('Magnar');
    });

    it('gir grønt lys (ingen kollisjon) når reservasjoner kun tangerer hverandre', () => {
      const existing = createReservation(
        'res_1',
        magnar,
        '2026-10-05T10:00:00Z',
        '2026-10-05T12:00:00Z',
        'Møte'
      );

      // Start nøyaktig når forrige slutter
      const adjacent = findConflictingReservations(
        '2026-10-05T12:00:00Z',
        '2026-10-05T14:00:00Z',
        [existing]
      );
      expect(adjacent).toHaveLength(0);

      // Slutt nøyaktig når neste starter
      const before = findConflictingReservations(
        '2026-10-05T08:00:00Z',
        '2026-10-05T10:00:00Z',
        [existing]
      );
      expect(before).toHaveLength(0);
    });

    it('setter status pending_conflict ved overlapp hvis bruker likevel reserverer', () => {
      const existing = createReservation('res_1', magnar, '2026-10-05T14:00:00Z', '2026-10-05T16:00:00Z', 'Møte');
      const { updated, result } = applyCreateCarReservation([existing], {
        vehicleId: testVehicle.id,
        memberId: marcus.id,
        memberName: marcus.name,
        startTime: '2026-10-05T15:00:00Z',
        endTime: '2026-10-05T17:00:00Z',
        purpose: 'Kjøretur',
        isWorkRelated: false,
        source: 'manual',
        status: 'confirmed',
      });

      expect(result.success).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.reservation.status).toBe('pending_conflict');
      expect(updated).toHaveLength(2);
    });

    it('ignorerer kansellerte reservasjoner ved kollisjonssjekk', () => {
      const cancelled = createReservation(
        'res_c',
        magnar,
        '2026-10-05T10:00:00Z',
        '2026-10-05T12:00:00Z',
        'Avlyst møte',
        'cancelled'
      );

      const conflicts = findConflictingReservations(
        '2026-10-05T10:30:00Z',
        '2026-10-05T11:30:00Z',
        [cancelled]
      );

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('3. Avbestilling / sletting (Knapp for å slette reservasjon)', () => {
    it('fjerner reservasjonen når bruker trykker avbestill / slett', () => {
      const r1 = createReservation('r1', marcus, '2026-10-05T10:00:00Z', '2026-10-05T12:00:00Z', 'Kjøretur');
      const r2 = createReservation('r2', synelle, '2026-10-05T14:00:00Z', '2026-10-05T16:00:00Z', 'Handling');

      let current = [r1, r2];
      expect(current).toHaveLength(2);

      current = applyCancelReservation(current, 'r1');

      expect(current).toHaveLength(1);
      expect(current[0].id).toBe('r2');
      expect(current.find((r) => r.id === 'r1')).toBeUndefined();
    });
  });

  describe('4. Formatering og visning i bilmodulen', () => {
    it('formaterer tidsrom og dato korrekt på norsk', () => {
      const range = formatTimeRange('2026-10-05T10:00:00', '2026-10-05T12:30:00');
      expect(range).toContain('10:00');
      expect(range).toContain('12:30');
    });
  });

  describe('5. Arkivering av passert tid', () => {
    it('skiller kommende og passerte reservasjoner basert på sluttid', () => {
      const nowMs = new Date('2026-10-05T12:00:00Z').getTime();

      const pastRes1 = createReservation('p1', magnar, '2026-08-19T07:05:00Z', '2026-08-19T09:25:00Z', 'Gammel tur');
      const pastRes2 = createReservation('p2', synelle, '2026-10-05T08:00:00Z', '2026-10-05T10:00:00Z', 'Morgentur');
      const ongoingRes = createReservation('o1', magnar, '2026-10-05T11:00:00Z', '2026-10-05T13:00:00Z', 'Pågående tur');
      const futureRes = createReservation('f1', marcus, '2026-10-05T16:00:00Z', '2026-10-05T18:00:00Z', 'Kveldstur');

      const all = [pastRes1, pastRes2, ongoingRes, futureRes];

      const upcoming = all.filter((r) => r.status !== 'cancelled' && new Date(r.endTime).getTime() >= nowMs);
      const archived = all.filter((r) => r.status !== 'cancelled' && new Date(r.endTime).getTime() < nowMs);

      expect(upcoming.map((r) => r.id)).toEqual(['o1', 'f1']);
      expect(archived.map((r) => r.id)).toEqual(['p1', 'p2']);
      expect(upcoming).toHaveLength(2);
      expect(archived).toHaveLength(2);
    });
  });

  describe('6. Bilreservasjon i kalenderen (Tirsdag 10:00-12:00 og 22:00 for Marcus)', () => {
    it('genererer kalenderhendelse ved bilreservasjon', () => {
      const tuesdayMorningRes = createReservation(
        'res_marcus_tir_10',
        marcus,
        '2026-10-06T10:00:00Z',
        '2026-10-06T12:00:00Z',
        'Marcus ærender i byen'
      );

      const tuesdayNightRes = createReservation(
        'res_marcus_tir_22',
        marcus,
        '2026-10-06T22:00:00Z',
        '2026-10-06T23:30:00Z',
        'Marcus hente venner'
      );

      // Simuler koblingen mellom bilreservasjon og CalendarEvent
      const toCalendarEvent = (res: CarReservation) => ({
        id: `cal_res_${res.id}`,
        memberId: res.memberId,
        memberName: res.memberName,
        calendarId: 'car_reservations',
        title: `🚗 Bil: ${res.purpose}`,
        startTime: res.startTime,
        endTime: res.endTime,
        createsCarReservation: true,
        vehicleReservationId: res.id,
        isWorkRelated: res.isWorkRelated,
      });

      const morningEvent = toCalendarEvent(tuesdayMorningRes);
      const nightEvent = toCalendarEvent(tuesdayNightRes);

      expect(morningEvent.title).toContain('Marcus ærender i byen');
      expect(morningEvent.startTime).toBe('2026-10-06T10:00:00Z');
      expect(morningEvent.createsCarReservation).toBe(true);
      expect(morningEvent.calendarId).toBe('car_reservations');

      expect(nightEvent.startTime).toBe('2026-10-06T22:00:00Z');
      expect(nightEvent.memberName).toBe(marcus.name);
    });

    it('sletting av reservasjon fjerner den fra kalenderen', () => {
      let events = [
        { id: 'cal_res_1', vehicleReservationId: 'res_1' },
        { id: 'cal_ev_normal', vehicleReservationId: undefined },
      ];

      // Slett res_1
      events = events.filter((e) => e.vehicleReservationId !== 'res_1');
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('cal_ev_normal');
    });
  });
});

