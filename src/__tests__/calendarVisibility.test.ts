import { describe, expect, it } from 'vitest';
import {
  isCalendarActiveForCar,
  isCalendarDisabled,
  isCalendarHiddenInView,
  isCalendarVisibleInView,
} from '../utils/calendarVisibility';
import { baseSettings } from './fixtures/calendarFixtures';

describe('calendarVisibility', () => {
  it('skiller visuell skjuling fra deaktivering', () => {
    const settings = {
      ...baseSettings,
      calendarViewHiddenIds: ['cal_job'],
    };

    expect(isCalendarHiddenInView('cal_job', settings)).toBe(true);
    expect(isCalendarVisibleInView('cal_job', settings)).toBe(false);
    expect(isCalendarActiveForCar('cal_job', settings)).toBe(true);
  });

  it('deaktiverte kalendere er ute av visning og Familiebilen', () => {
    const settings = {
      ...baseSettings,
      disabledCalendarIds: ['cal_job'],
    };

    expect(isCalendarDisabled('cal_job', settings)).toBe(true);
    expect(isCalendarVisibleInView('cal_job', settings)).toBe(false);
    expect(isCalendarActiveForCar('cal_job', settings)).toBe(false);
  });

  it('slettede kalendere behandles som deaktiverte', () => {
    const settings = {
      ...baseSettings,
      deletedCalendarIds: ['cal_old'],
    };

    expect(isCalendarDisabled('cal_old', settings)).toBe(true);
    expect(isCalendarActiveForCar('cal_old', settings)).toBe(false);
  });
});
