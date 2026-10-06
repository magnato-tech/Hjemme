import {
  ActivityOverride,
  CalendarCarMode,
  FamilySettings,
  GoogleCalendarItem,
  PerCalendarConfig,
} from '../types';

/** calendarConfigs is authoritative when a per-calendar config exists. */
export function resolveCarMode(
  config?: PerCalendarConfig,
  calendar?: GoogleCalendarItem
): CalendarCarMode {
  if (config?.carMode === 'none' || config?.carMode === 'all') {
    return config.carMode;
  }
  if (calendar?.carMode === 'none') return 'none';
  return 'all';
}

/** Avoid stale activityOverrides on the calendar item when config is saved separately. */
export function resolveActivityOverrides(
  config?: PerCalendarConfig,
  calendar?: GoogleCalendarItem
): Record<string, ActivityOverride> {
  if (config !== undefined) {
    return config.activityOverrides ?? {};
  }
  return calendar?.activityOverrides ?? {};
}

export function normalizeActivityOverrides(
  overrides: Record<string, ActivityOverride> | undefined,
  carMode: CalendarCarMode
): Record<string, ActivityOverride> {
  return filterMeaningfulOverrides(overrides, carMode);
}

/** Whether events in this calendar block the car by default (before overrides). */
export function defaultBlocksCar(carMode: CalendarCarMode): boolean {
  return carMode !== 'none';
}

/** `blocksCar` value stored when adding an exception for the current mode. */
export function exceptionBlocksCar(carMode: CalendarCarMode): boolean {
  return carMode === 'none';
}

/** Override only matters when it differs from the calendar default. */
export function isMeaningfulOverride(
  override: ActivityOverride,
  carMode: CalendarCarMode
): boolean {
  return override.blocksCar !== defaultBlocksCar(carMode);
}

export function filterMeaningfulOverrides(
  overrides: Record<string, ActivityOverride> | undefined,
  carMode: CalendarCarMode
): Record<string, ActivityOverride> {
  if (!overrides) return {};
  const filtered: Record<string, ActivityOverride> = {};
  for (const [key, override] of Object.entries(overrides)) {
    if (override && isMeaningfulOverride(override, carMode)) {
      filtered[key] = override;
    }
  }
  return filtered;
}

export function hasSeriesException(
  overrides: Record<string, ActivityOverride> | undefined,
  title: string,
  carMode: CalendarCarMode
): boolean {
  const rule = overrides?.[title.trim().toLowerCase()];
  return Boolean(rule && !rule.eventId && isMeaningfulOverride(rule, carMode));
}

export function hasSingleException(
  overrides: Record<string, ActivityOverride> | undefined,
  eventId: string,
  carMode: CalendarCarMode
): boolean {
  const rule = overrides?.[`event:${eventId}`];
  return Boolean(rule && isMeaningfulOverride(rule, carMode));
}

/** Clean stored overrides and drop stale copies on calendar items when config exists. */
export function migrateCalendarSettings(settings: FamilySettings): FamilySettings {
  const calendarConfigs = { ...(settings.calendarConfigs || {}) };
  let savedCalendars = [...(settings.savedCalendars || [])];
  const originalSavedJson = JSON.stringify(settings.savedCalendars ?? []);
  let configsChanged = false;

  for (const [id, config] of Object.entries(calendarConfigs)) {
    const carMode = resolveCarMode(config);
    const normalized = normalizeActivityOverrides(config.activityOverrides, carMode);
    if (JSON.stringify(normalized) !== JSON.stringify(config.activityOverrides ?? {})) {
      calendarConfigs[id] = { ...config, activityOverrides: normalized };
      configsChanged = true;
    }
    savedCalendars = savedCalendars.map((cal) =>
      cal.id === id
        ? {
            ...cal,
            carMode: config.carMode,
            isCarCalendar: carMode !== 'none',
            activityOverrides: calendarConfigs[id].activityOverrides ?? {},
          }
        : cal
    );
  }

  for (const cal of savedCalendars) {
    if (!calendarConfigs[cal.id]) continue;
    const expected = calendarConfigs[cal.id].activityOverrides ?? {};
    if (JSON.stringify(cal.activityOverrides ?? {}) !== JSON.stringify(expected)) {
      savedCalendars = savedCalendars.map((c) =>
        c.id === cal.id ? { ...c, activityOverrides: expected } : c
      );
    }
  }

  const savedChanged = JSON.stringify(savedCalendars) !== originalSavedJson;
  return configsChanged || savedChanged
    ? { ...settings, calendarConfigs, savedCalendars }
    : settings;
}

export function overrideDescription(
  override: ActivityOverride,
  carMode: CalendarCarMode
): string {
  if (carMode === 'none') {
    if (override.eventId) return 'Unntak: denne hendelsen sperrer bilen';
    return 'Unntak: alle med dette navnet sperrer bilen';
  }
  if (override.eventId) return 'Unntak: denne hendelsen sperrer ikke bilen';
  return 'Unntak: alle med dette navnet sperrer ikke bilen';
}
