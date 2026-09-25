import { describe, expect, it } from 'vitest';
import { migrateTaskTemplate, parseWeekdayFromDeadline } from '../utils/taskMigration';

describe('taskMigration', () => {
  it('parser ukedag fra fristtekst', () => {
    expect(parseWeekdayFromDeadline('Søndag 20:00')).toBe(0);
    expect(parseWeekdayFromDeadline('Fredag 18:00')).toBe(5);
    expect(parseWeekdayFromDeadline('Løpende')).toBeNull();
  });

  it('migrerer weekly mal til 7 dager og søndag', () => {
    const migrated = migrateTaskTemplate({
      id: 'tmpl_1',
      title: 'Test',
      description: '',
      area: '1. etasje',
      room: 'Stue',
      points: 2,
      recurrence: 'weekly',
      deadlineDay: 'Søndag 20:00',
      eligibleMemberIds: [],
      isActive: true,
      isMandatory: false,
      iconName: 'brush',
    });

    expect(migrated.intervalDays).toBe(7);
    expect(migrated.fixedWeekday).toBe(0);
  });

  it('beholder allerede migrerte maler', () => {
    const template = {
      id: 'tmpl_2',
      title: 'Test',
      description: '',
      area: '1. etasje',
      room: 'Stue',
      points: 2,
      intervalDays: 2,
      fixedWeekday: null,
      eligibleMemberIds: [],
      isActive: true,
      isMandatory: false,
      iconName: 'brush',
    };
    expect(migrateTaskTemplate(template)).toEqual(template);
  });
});
