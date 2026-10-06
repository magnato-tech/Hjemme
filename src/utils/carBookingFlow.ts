import { CarReservation } from '../types';
import {
  findConflictingReservations,
  nextAvailableCarRequestTimes,
  reservationTimeIssue,
  tryBuildDatetimeLocal,
} from './dateUtils';

export interface BookingAvailabilityResult {
  isAvailable: boolean;
  conflicts: CarReservation[];
  timeIssue: ReturnType<typeof reservationTimeIssue>;
}

/** Mirrors CarModule availability check before creating a reservation. */
export function evaluateCarBookingAvailability(
  startIso: string,
  endIso: string,
  reservations: CarReservation[],
  now = new Date()
): BookingAvailabilityResult {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const timeIssue = reservationTimeIssue(start, end, now);

  if (timeIssue) {
    return { isAvailable: false, conflicts: [], timeIssue };
  }

  const conflicts = findConflictingReservations(
    startIso,
    endIso,
    reservations.filter((r) => r.status !== 'cancelled')
  );

  return {
    isAvailable: conflicts.length === 0,
    conflicts,
    timeIssue: null,
  };
}

/** Form values to use after a successful reservation (avoids immediate self-conflict). */
export function formTimesAfterReservation(
  reservations: CarReservation[],
  newReservation: CarReservation,
  now = new Date()
): { start: string; end: string } {
  const active = reservations.filter((r) => r.status !== 'cancelled');
  const includesNew = active.some((r) => r.id === newReservation.id);
  const all = includesNew ? active : [...active, newReservation];
  return nextAvailableCarRequestTimes(all, now);
}

/** Validates Norwegian text fields and returns stored datetime-local value. */
export function parseNorwegianDatetimeFields(
  dateText: string,
  timeText: string
): string | null {
  return tryBuildDatetimeLocal(dateText, timeText);
}
