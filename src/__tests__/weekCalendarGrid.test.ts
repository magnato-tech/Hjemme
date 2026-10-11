import { describe, expect, it } from 'vitest';
import {
  buildMonthCalendarCells,
  computeWeekGridHourHeightPx,
  getWeekDates,
  getWeekStart,
  layoutTimedEvents,
  timeRangeToGridStyle,
  WEEK_GRID_MIN_HOUR_PX,
  WEEK_GRID_MOBILE_MIN_HOUR_PX,
} from '../utils/weekCalendarGrid';
import { makeTimedEvent } from './fixtures/calendarFixtures';

describe('weekCalendarGrid', () => {
  it('getWeekStart returnerer mandag', () => {
    const wed = new Date(2026, 8, 23); // onsdag 23. sep 2026
    const start = getWeekStart(wed);
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(21);
  });

  it('getWeekDates gir 7 dager fra ukestart', () => {
    const start = getWeekStart(new Date(2026, 8, 25));
    const dates = getWeekDates(start);
    expect(dates).toHaveLength(7);
    expect(dates[0].getDate()).toBe(start.getDate());
  });

  it('buildMonthCalendarCells gir 35 eller 42 celler', () => {
    const cells = buildMonthCalendarCells(2026, 8);
    expect([35, 42]).toContain(cells.length);
    expect(cells.filter((c) => c.isCurrentMonth).length).toBe(30); // september 2026
  });

  it('timeRangeToGridStyle klipper til 06-23', () => {
    const style = timeRangeToGridStyle('2026-09-25T05:00:00', '2026-09-25T23:00:00');
    expect(style.top).toBe('0%');
    expect(parseFloat(style.height)).toBeGreaterThan(90);
  });

  it('computeWeekGridHourHeightPx krymper rader på mobil', () => {
    const mobile = computeWeekGridHourHeightPx(700, 390);
    expect(mobile).toBeLessThan(WEEK_GRID_MIN_HOUR_PX);
    expect(mobile).toBeGreaterThanOrEqual(WEEK_GRID_MOBILE_MIN_HOUR_PX);

    const desktop = computeWeekGridHourHeightPx(900, 1024);
    expect(desktop).toBe(WEEK_GRID_MIN_HOUR_PX);
  });

  it('layoutTimedEvents plasserer overlappende hendelser side om side', () => {
    const a = makeTimedEvent('a', 'cal', '2026-09-25T10:00:00', '2026-09-25T11:00:00');
    const b = makeTimedEvent('b', 'cal', '2026-09-25T10:30:00', '2026-09-25T11:30:00');
    const positioned = layoutTimedEvents([a, b]);

    expect(positioned).toHaveLength(2);
    expect(positioned[0].totalColumns).toBeGreaterThanOrEqual(2);
    expect(positioned[0].column).not.toBe(positioned[1].column);
  });
});
