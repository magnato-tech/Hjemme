import { describe, expect, it } from 'vitest';
import {
  calculateBufferedTime,
  checkTimeCollision,
  formatLocalDateKey,
  formatTimeRange,
  getWeekNumber,
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
});
