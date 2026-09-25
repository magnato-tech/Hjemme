import { describe, expect, it } from 'vitest';
import {
  calculateBufferedTime,
  checkTimeCollision,
  formatLocalDateKey,
  formatTimeRange,
  getPointsWeekStart,
  getPointsWeekStartOffset,
  isInPointsWeek,
  getWeekNumber,
  isInCurrentPointsWeek,
  isSameDay,
  parseLocalDate,
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

  it('isInPointsWeek sjekker spesifikk poenguke', () => {
    const friday = new Date(2026, 8, 25, 14, 0, 0);
    const lastWeek = getPointsWeekStartOffset(1, friday);
    expect(isInPointsWeek('2026-09-18T12:00:00', lastWeek)).toBe(true);
    expect(isInPointsWeek('2026-09-21T07:00:00', lastWeek)).toBe(false);
  });
});
