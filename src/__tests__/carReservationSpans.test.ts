import { describe, expect, it } from 'vitest';
import {
  buildCarReservationSpansByDay,
  getFamilyCarOccupiedDateKeys,
} from '../utils/carReservationSpans';
import { isCalendarActiveForCar } from '../utils/calendarVisibility';
import { formatLocalDateKey } from '../utils/dateUtils';
import {
  baseSettings,
  jobCalendar,
  makeTimedEvent,
  privateCalendar,
} from './fixtures/calendarFixtures';

const day = new Date(2026, 8, 25); // 25. sep 2026
const alwaysActive = (calId: string) => isCalendarActiveForCar(calId, baseSettings);

describe('carReservationSpans', () => {
  it('slår sammen overlappende bilintervaller med buffer', () => {
    const events = [
      makeTimedEvent('e1', 'cal_job', '2026-09-25T10:00:00', '2026-09-25T11:00:00'),
      makeTimedEvent('e2', 'cal_job', '2026-09-25T11:15:00', '2026-09-25T12:00:00'),
    ];

    const spans = buildCarReservationSpansByDay(
      events,
      baseSettings,
      [jobCalendar],
      [day],
      alwaysActive
    )[0];

    expect(spans).toHaveLength(1);
    expect(new Date(spans[0].startTime).getHours()).toBe(9); // 10:00 - 30m buffer
    expect(new Date(spans[0].endTime).getHours()).toBe(12); // 12:00 + 30m buffer
  });

  it('har opphold mellom ikke-overlappende intervaller', () => {
    const events = [
      makeTimedEvent('e1', 'cal_job', '2026-09-25T08:00:00', '2026-09-25T09:00:00'),
      makeTimedEvent('e2', 'cal_job', '2026-09-25T18:00:00', '2026-09-25T19:00:00'),
    ];

    const spans = buildCarReservationSpansByDay(
      events,
      baseSettings,
      [jobCalendar],
      [day],
      alwaysActive
    )[0];

    expect(spans).toHaveLength(2);
  });

  it('teller skjult kalender for Familiebilen men ikke deaktivert', () => {
    const events = [
      makeTimedEvent('e1', 'cal_job', '2026-09-25T10:00:00', '2026-09-25T11:00:00'),
    ];

    const hiddenSettings = {
      ...baseSettings,
      calendarViewHiddenIds: ['cal_job'],
    };

    const spansHidden = buildCarReservationSpansByDay(
      events,
      hiddenSettings,
      [jobCalendar],
      [day],
      (calId) => isCalendarActiveForCar(calId, hiddenSettings)
    )[0];

    expect(spansHidden.length).toBeGreaterThan(0);

    const disabledSettings = {
      ...baseSettings,
      disabledCalendarIds: ['cal_job'],
    };

    const spansDisabled = buildCarReservationSpansByDay(
      events,
      disabledSettings,
      [jobCalendar],
      [day],
      (calId) => isCalendarActiveForCar(calId, disabledSettings)
    )[0];

    expect(spansDisabled).toHaveLength(0);
  });

  it('ignorerer kalendere uten bilmodus', () => {
    const events = [
      makeTimedEvent('e1', 'cal_private', '2026-09-25T10:00:00', '2026-09-25T11:00:00'),
    ];

    const spans = buildCarReservationSpansByDay(
      events,
      baseSettings,
      [privateCalendar],
      [day],
      alwaysActive
    )[0];

    expect(spans).toHaveLength(0);
  });

  it('getFamilyCarOccupiedDateKeys markerer dager med opptatt bil', () => {
    const events = [
      makeTimedEvent('e1', 'cal_job', '2026-09-25T10:00:00', '2026-09-25T11:00:00'),
    ];

    const keys = getFamilyCarOccupiedDateKeys(
      events,
      baseSettings,
      [jobCalendar],
      [day],
      alwaysActive
    );

    expect(keys.has(formatLocalDateKey(day))).toBe(true);
  });
});
