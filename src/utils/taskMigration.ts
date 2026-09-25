import { TaskTemplate } from '../types';

type LegacyRecurrenceType = 'weekly' | 'biweekly' | 'monthly' | 'daily' | 'once';

const WEEKDAY_FROM_NORWEGIAN: Record<string, number> = {
  søndag: 0,
  mandag: 1,
  tirsdag: 2,
  onsdag: 3,
  torsdag: 4,
  fredag: 5,
  lørdag: 6,
};

const INTERVAL_FROM_RECURRENCE: Record<LegacyRecurrenceType, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  once: 0,
};

export function parseWeekdayFromDeadline(deadlineDay?: string): number | null {
  if (!deadlineDay) return null;
  const normalized = deadlineDay.trim().toLowerCase();
  for (const [name, value] of Object.entries(WEEKDAY_FROM_NORWEGIAN)) {
    if (normalized.startsWith(name)) return value;
  }
  return null;
}

export function migrateTaskTemplate(raw: Record<string, unknown>): TaskTemplate {
  if (typeof raw.intervalDays === 'number') {
    return raw as unknown as TaskTemplate;
  }

  const recurrence = (raw.recurrence as LegacyRecurrenceType) || 'weekly';
  const intervalDays = INTERVAL_FROM_RECURRENCE[recurrence] ?? 7;
  const fixedWeekday = parseWeekdayFromDeadline(raw.deadlineDay as string | undefined);

  const { recurrence: _r, deadlineDay: _d, ...rest } = raw;
  return {
    ...(rest as Omit<TaskTemplate, 'intervalDays' | 'fixedWeekday'>),
    intervalDays,
    fixedWeekday,
  };
}

export function migrateTaskTemplates(templates: unknown[]): TaskTemplate[] {
  return templates.map((t) => migrateTaskTemplate(t as Record<string, unknown>));
}
