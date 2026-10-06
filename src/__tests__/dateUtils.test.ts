import { describe, expect, it } from 'vitest';
import {
  calculateBufferedTime,
  checkTimeCollision,
  findConflictingReservations,
  combineDatetimeLocal,
  formatLocalDateKey,
  formatNorwegianDateInput,
  formatNorwegianDateTimeInput,
  formatNorwegianTimeInput,
  formatTimeRange,
  defaultCarRequestStart,
  defaultCarRequestTimes,
  isReservationBackwards,
  nextAvailableCarRequestTimes,
  parseNorwegianDateInput,
  parseNorwegianTimeInput,
  reservationTimeIssue,
  splitDatetimeLocal,
  suggestedReservationEnd,
  getPointsWeekStart,
  getPointsWeekStartOffset,
  isInPointsWeek,
  getWeekNumber,
  isInCurrentPointsWeek,
  isEventFutureOrActive,
  isSameDay,
  overlapsCalendarDay,
  parseLocalDate,
  tryBuildDatetimeLocal,
} from '../utils/dateUtils';

describe('dateUtils', () => {
  it('parseLocalDate tolker YYYY-MM-DD som lokal dato', () => {
    const d = parseLocalDate('2026-09-25');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(25);
  });

  it('formatLocalDateKey returnerer stabil nøkkel', () => {
    expect(formatLocalDateKey(new Date(2026, 8, 25))).toBe('2026-09-25');
  });

  it('isSameDay sammenligner kalenderdager', () => {
    expect(isSameDay('2026-09-25T08:00:00', '2026-09-25T20:00:00')).toBe(true);
    expect(isSameDay('2026-09-25T23:59:00', '2026-09-26T00:01:00')).toBe(false);
  });

  it('overlapsCalendarDay finner reservasjoner som krysser en dag', () => {
    const day = new Date(2026, 9, 8);
    expect(
      overlapsCalendarDay('2026-10-08T21:30:00', '2026-10-08T22:30:00', day)
    ).toBe(true);
    expect(
      overlapsCalendarDay('2026-10-07T23:30:00', '2026-10-08T00:30:00', day)
    ).toBe(true);
    expect(
      overlapsCalendarDay('2026-10-09T08:00:00', '2026-10-09T09:00:00', day)
    ).toBe(false);
  });

  it('calculateBufferedTime utvider start og slutt', () => {
    const result = calculateBufferedTime(
      '2026-09-25T10:00:00',
      '2026-09-25T11:00:00',
      30,
      15
    );
    expect(new Date(result.reservationStart).getMinutes()).toBe(30);
    expect(new Date(result.reservationEnd).getHours()).toBe(11);
    expect(new Date(result.reservationEnd).getMinutes()).toBe(15);
  });

  it('findConflictingReservations finner aktive overlappende reservasjoner', () => {
    const existing = [
      {
        id: 'res_a',
        startTime: '2026-10-06T21:00:00.000Z',
        endTime: '2026-10-06T22:00:00.000Z',
        status: 'confirmed' as const,
      },
      {
        id: 'res_b',
        startTime: '2026-10-07T08:00:00.000Z',
        endTime: '2026-10-07T09:00:00.000Z',
        status: 'cancelled' as const,
      },
    ];

    const conflicts = findConflictingReservations(
      '2026-10-06T21:30:00.000Z',
      '2026-10-06T22:30:00.000Z',
      existing
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].id).toBe('res_a');
  });

  it('checkTimeCollision finner overlapp', () => {
    expect(
      checkTimeCollision(
        '2026-09-25T10:00:00',
        '2026-09-25T11:00:00',
        '2026-09-25T10:30:00',
        '2026-09-25T12:00:00'
      )
    ).toBe(true);
    expect(
      checkTimeCollision(
        '2026-09-25T10:00:00',
        '2026-09-25T11:00:00',
        '2026-09-25T11:00:00',
        '2026-09-25T12:00:00'
      )
    ).toBe(false);
  });

  it('formatTimeRange formaterer norsk tidsrom', () => {
    const range = formatTimeRange('2026-09-25T10:00:00', '2026-09-25T11:30:00');
    expect(range).toMatch(/10:00/);
    expect(range).toMatch(/11:30/);
  });

  it('getWeekNumber returnerer ISO-ukenummer', () => {
    expect(getWeekNumber(new Date(2026, 8, 25))).toBe(39);
  });

  it('poenguke starter mandag kl 06:00', () => {
    const friday = new Date(2026, 8, 25, 14, 0, 0);
    const weekStart = getPointsWeekStart(friday);
    expect(weekStart.getDay()).toBe(1);
    expect(weekStart.getHours()).toBe(6);
    expect(weekStart.getDate()).toBe(21);
  });

  it('poenguken nullstilles mandag kl 06:00', () => {
    const mondayBeforeReset = new Date(2026, 8, 21, 5, 30, 0);
    const mondayAfterReset = new Date(2026, 8, 21, 7, 0, 0);
    expect(isInCurrentPointsWeek('2026-09-20T12:00:00', mondayAfterReset)).toBe(false);
    expect(isInCurrentPointsWeek('2026-09-21T06:30:00', mondayAfterReset)).toBe(true);
    expect(isInCurrentPointsWeek('2026-09-20T12:00:00', mondayBeforeReset)).toBe(true);
    expect(isInCurrentPointsWeek('2026-09-14T05:00:00', mondayBeforeReset)).toBe(false);
  });

  it('foreslår én time etter starten, og en lengre slutt er lov', () => {
    const start = new Date(2026, 9, 7, 22, 30);
    const suggested = suggestedReservationEnd(start);
    expect(suggested.getDate()).toBe(7);
    expect(suggested.getHours()).toBe(23);
    expect(suggested.getMinutes()).toBe(30);

    const longer = new Date(2026, 9, 8, 1, 0);
    expect(reservationTimeIssue(start, longer, new Date(2026, 9, 6, 18, 0))).toBeNull();
    expect(isReservationBackwards(start, longer)).toBe(false);
  });

  it('avviser slutt før start og start som allerede har vært', () => {
    const now = new Date(2026, 9, 6, 18, 24);
    const start = new Date(2026, 9, 7, 22, 30);
    const endBeforeStart = new Date(2026, 9, 6, 20, 0);
    expect(reservationTimeIssue(start, endBeforeStart, now)).toBe('backwards');
    expect(isReservationBackwards(start, endBeforeStart)).toBe(true);

    const pastStart = new Date(2026, 9, 6, 16, 30);
    expect(reservationTimeIssue(pastStart, suggestedReservationEnd(pastStart), now)).toBe('past');
  });

  it('standardstart er 16:30 når den er fram i tid, ellers denne minuttet', () => {
    const morning = new Date(2026, 9, 6, 12, 0);
    const afternoonStart = defaultCarRequestStart(morning);
    expect(afternoonStart.getHours()).toBe(16);
    expect(afternoonStart.getMinutes()).toBe(30);

    const evening = new Date(2026, 9, 6, 18, 24, 40);
    const nowStart = defaultCarRequestStart(evening);
    expect(nowStart.getHours()).toBe(18);
    expect(nowStart.getMinutes()).toBe(24);
    expect(nowStart.getSeconds()).toBe(0);
  });

  it('isInPointsWeek sjekker spesifikk poenguke', () => {
    const friday = new Date(2026, 8, 25, 14, 0, 0);
    const lastWeek = getPointsWeekStartOffset(1, friday);
    expect(isInPointsWeek('2026-09-18T12:00:00', lastWeek)).toBe(true);
    expect(isInPointsWeek('2026-09-21T07:00:00', lastWeek)).toBe(false);
  });

  it('formatNorwegianDateTimeInput viser dd/mm/yyyy og 24-timers klokke', () => {
    expect(formatNorwegianDateTimeInput('2026-10-07T10:00')).toBe('07/10/2026 10:00');
    expect(formatNorwegianDateTimeInput('2026-01-05T16:30')).toBe('05/01/2026 16:30');
    expect(formatNorwegianDateTimeInput('')).toBe('');
  });

  it('splitDatetimeLocal deler datetime-local i dato og tid', () => {
    expect(splitDatetimeLocal('2026-10-07T20:28')).toEqual({
      date: '2026-10-07',
      time: '20:28',
    });
    expect(splitDatetimeLocal('')).toEqual({ date: '', time: '' });
  });

  it('formatNorwegianDateInput og formatNorwegianTimeInput viser norske felt', () => {
    expect(formatNorwegianDateInput('2026-10-07T20:28')).toBe('07/10/2026');
    expect(formatNorwegianTimeInput('2026-10-07T20:28')).toBe('20:28');
    expect(formatNorwegianDateInput('')).toBe('');
    expect(formatNorwegianTimeInput('')).toBe('');
  });

  it('parseNorwegianDateInput tolker dd/mm/yyyy', () => {
    expect(parseNorwegianDateInput('07/10/2026')).toBe('2026-10-07');
    expect(parseNorwegianDateInput('7/10/2026')).toBe('2026-10-07');
    expect(parseNorwegianDateInput('31/02/2026')).toBeNull();
    expect(parseNorwegianDateInput('10/08')).toBeNull();
    expect(parseNorwegianDateInput('')).toBeNull();
  });

  it('parseNorwegianTimeInput tolker 24-timers HH:mm', () => {
    expect(parseNorwegianTimeInput('20:28')).toBe('20:28');
    expect(parseNorwegianTimeInput('08:05')).toBe('08:05');
    expect(parseNorwegianTimeInput('8:28 PM')).toBeNull();
    expect(parseNorwegianTimeInput('24:00')).toBeNull();
    expect(parseNorwegianTimeInput('12:60')).toBeNull();
  });

  it('tryBuildDatetimeLocal kombinerer gyldige felt', () => {
    expect(tryBuildDatetimeLocal('07/10/2026', '20:28')).toBe('2026-10-07T20:28');
    expect(tryBuildDatetimeLocal('07/10', '20:28')).toBeNull();
    expect(combineDatetimeLocal('2026-10-07', '20:28')).toBe('2026-10-07T20:28');
  });

  it('nextAvailableCarRequestTimes hopper forbi eksisterende reservasjon', () => {
    const now = new Date(2026, 9, 6, 21, 0);
    const existing = [
      {
        id: 'res_1',
        startTime: new Date(2026, 9, 6, 21, 0).toISOString(),
        endTime: new Date(2026, 9, 6, 22, 0).toISOString(),
      },
    ];
    const next = nextAvailableCarRequestTimes(existing, now);
    expect(next.start).toBe('2026-10-06T22:00');
    expect(next.end).toBe('2026-10-06T23:00');
    expect(defaultCarRequestTimes(now).start).toBe('2026-10-06T21:00');
  });

  it('isEventFutureOrActive skiller fremtid, pågående og fortid', () => {
    const now = new Date('2026-10-06T14:00:00');
    expect(isEventFutureOrActive('2026-10-06T16:00:00', '2026-10-06T17:00:00', now)).toBe(true);
    expect(isEventFutureOrActive('2026-10-06T13:00:00', '2026-10-06T15:00:00', now)).toBe(true);
    expect(isEventFutureOrActive('2026-10-06T10:00:00', '2026-10-06T12:00:00', now)).toBe(false);
    expect(isEventFutureOrActive('2026-10-05T10:00:00', '2026-10-05T11:00:00', now)).toBe(false);
  });
});
