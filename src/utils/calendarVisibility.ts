import { FamilySettings, GoogleCalendarItem } from '../types';

export function isCalendarDeleted(
  calId: string,
  deletedCalendarIds?: string[]
): boolean {
  return (deletedCalendarIds || []).includes(calId);
}

/** Deaktiveret i Innstillinger — fjernes fra kalenderlisten og Familiebilen */
export function isCalendarDisabled(
  calId: string,
  settings: FamilySettings,
  deletedCalendarIds?: string[]
): boolean {
  if (isCalendarDeleted(calId, deletedCalendarIds ?? settings.deletedCalendarIds)) {
    return true;
  }
  return (settings.disabledCalendarIds || []).includes(calId);
}

/** Skjult kun i kalendervisning — Familiebilen påvirkes ikke */
export function isCalendarHiddenInView(
  calId: string,
  settings: FamilySettings,
  calItem?: GoogleCalendarItem
): boolean {
  if ((settings.calendarViewHiddenIds || []).includes(calId)) return true;
  if (settings.calendarConfigs?.[calId]?.enabledForDisplay === false) return true;
  if (calItem?.enabledForDisplay === false) return true;
  return false;
}

/** Hendelser vises i måned/uke/liste */
export function isCalendarVisibleInView(
  calId: string,
  settings: FamilySettings,
  calItem?: GoogleCalendarItem,
  deletedCalendarIds?: string[]
): boolean {
  if (isCalendarDisabled(calId, settings, deletedCalendarIds)) return false;
  if (isCalendarHiddenInView(calId, settings, calItem)) return false;
  return true;
}

/** Kalenderen kan bidra til Familiebilen-streken (ignorerer visuell skjuling) */
export function isCalendarActiveForCar(
  calId: string,
  settings: FamilySettings,
  deletedCalendarIds?: string[]
): boolean {
  return !isCalendarDisabled(calId, settings, deletedCalendarIds);
}
