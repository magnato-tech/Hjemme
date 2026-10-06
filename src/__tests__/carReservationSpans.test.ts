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

  it('en kalender uten bilsperre kan likevel sperre et navngitt unntak', () => {
    const events = [
      makeTimedEvent('e1', 'cal_private', '2026-09-25T10:00:00', '2026-09-25T11:00:00', 'Idda hockey'),
      makeTimedEvent('e2', 'cal_private', '2026-09-25T18:00:00', '2026-09-25T19:00:00', 'Fotball'),
    ];
    const settings = {
      ...baseSettings,
      calendarConfigs: {
        ...baseSettings.calendarConfigs,
        cal_private: {
          calendarId: 'cal_private',
          privacyMode: 'full' as const,
          carMode: 'none' as const,
          activityOverrides: {
            hockey: { activityTitle: 'Idda hockey', blocksCar: true },
          },
        },
      },
    };

    const spans = buildCarReservationSpansByDay(
      events,
      settings,
      [privateCalendar],
      [day],
      alwaysActive
    )[0];

    expect(spans).toHaveLength(1);
  });

  it('inkluderer manuelle reservasjoner uten kalenderhendelse', () => {
    const tuesday = new Date(2026, 9, 6);
    const manualReservation = {
      startTime: new Date(2026, 9, 6, 21, 30).toISOString(),
      endTime: new Date(2026, 9, 6, 22, 30).toISOString(),
      status: 'confirmed' as const,
    };

    const spans = buildCarReservationSpansByDay(
      [],
      baseSettings,
      [jobCalendar],
      [tuesday],
      alwaysActive,
      [manualReservation]
    )[0];

    expect(spans).toHaveLength(1);
    expect(new Date(spans[0].startTime).getHours()).toBe(21);
    expect(new Date(spans[0].startTime).getMinutes()).toBe(30);
    expect(new Date(spans[0].endTime).getHours()).toBe(22);
    expect(new Date(spans[0].endTime).getMinutes()).toBe(30);

    const keys = getFamilyCarOccupiedDateKeys(
      [],
      baseSettings,
      [jobCalendar],
      [tuesday],
      alwaysActive,
      [manualReservation]
    );
    expect(keys.has(formatLocalDateKey(tuesday))).toBe(true);
  });

  it('ignorerer avbestilte reservasjoner i bilkalenderen', () => {
    const tuesday = new Date(2026, 9, 6);
    const spans = buildCarReservationSpansByDay(
      [],
      baseSettings,
      [jobCalendar],
      [tuesday],
      alwaysActive,
      [
        {
          startTime: new Date(2026, 9, 6, 21, 30).toISOString(),
          endTime: new Date(2026, 9, 6, 22, 30).toISOString(),
          status: 'cancelled',
        },
      ]
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
