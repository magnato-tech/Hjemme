import { describe, expect, it } from 'vitest';
import {
  buildMonthCalendarCells,
  getWeekDates,
  getWeekStart,
  layoutTimedEvents,
  timeRangeToGridStyle,
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

  it('timeRangeToGridStyle klipper til 06-22', () => {
    const style = timeRangeToGridStyle('2026-09-25T05:00:00', '2026-09-25T23:00:00');
    expect(style.top).toBe('0%');
    expect(parseFloat(style.height)).toBeGreaterThan(90);
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
