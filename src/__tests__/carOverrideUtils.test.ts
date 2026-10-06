import { describe, expect, it } from 'vitest';
import { FamilySettings } from '../types';
import {
  defaultBlocksCar,
  exceptionBlocksCar,
  filterMeaningfulOverrides,
  hasSeriesException,
  isMeaningfulOverride,
  migrateCalendarSettings,
  resolveActivityOverrides,
  resolveCarMode,
} from '../utils/carOverrideUtils';

describe('carOverrideUtils', () => {
  it('defaultBlocksCar follows carMode', () => {
    expect(defaultBlocksCar('all')).toBe(true);
    expect(defaultBlocksCar('none')).toBe(false);
  });

  it('only keeps overrides that differ from default', () => {
    const overrides = {
      hockey: { activityTitle: 'Idda hockey', blocksCar: true },
      jobb: { activityTitle: 'Jobb', blocksCar: false },
    };

    expect(filterMeaningfulOverrides(overrides, 'none')).toEqual({
      hockey: { activityTitle: 'Idda hockey', blocksCar: true },
    });
    expect(filterMeaningfulOverrides(overrides, 'all')).toEqual({
      jobb: { activityTitle: 'Jobb', blocksCar: false },
    });
  });

  it('exceptionBlocksCar is opposite of default', () => {
    expect(exceptionBlocksCar('none')).toBe(true);
    expect(exceptionBlocksCar('all')).toBe(false);
  });

  it('hasSeriesException ignores redundant rules', () => {
    const overrides = {
      'idda hockey': { activityTitle: 'Idda hockey', blocksCar: false },
    };
    expect(hasSeriesException(overrides, 'Idda hockey', 'none')).toBe(false);
    expect(hasSeriesException(overrides, 'Idda hockey', 'all')).toBe(true);
  });

  it('isMeaningfulOverride', () => {
    expect(isMeaningfulOverride({ activityTitle: 'A', blocksCar: true }, 'none')).toBe(true);
    expect(isMeaningfulOverride({ activityTitle: 'A', blocksCar: false }, 'none')).toBe(false);
    expect(isMeaningfulOverride({ activityTitle: 'A', blocksCar: false }, 'all')).toBe(true);
  });

  it('resolveActivityOverrides foretrekker config fremfor utdatert kalenderdata', () => {
    const config = { calendarId: 'c1', privacyMode: 'full' as const, carMode: 'none' as const };
    const calendar = {
      id: 'c1',
      summary: 'Test',
      activityOverrides: {
        hockey: { activityTitle: 'Idda hockey', blocksCar: true },
      },
    };
    expect(resolveActivityOverrides(config, calendar)).toEqual({});
    expect(resolveCarMode(config, calendar)).toBe('none');
  });

  it('migrateCalendarSettings fjerner utdaterte overstyringer fra lagret kalender', () => {
    const migrated = migrateCalendarSettings({
      calendarConfigs: {
        c1: { calendarId: 'c1', privacyMode: 'full', carMode: 'none' },
      },
      savedCalendars: [
        {
          id: 'c1',
          summary: 'Test',
          activityOverrides: {
            hockey: { activityTitle: 'Idda hockey', blocksCar: true },
          },
        },
      ],
    } as unknown as FamilySettings);
    expect(migrated.savedCalendars?.[0].activityOverrides).toEqual({});
  });
});
