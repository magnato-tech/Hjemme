import { CalendarEvent, PerCalendarConfig } from '../types';

export function isBusyOnlyEvent(
  event: CalendarEvent,
  calendarConfig?: PerCalendarConfig
): boolean {
  return (
    event.isConfidential === true ||
    event.privacyMode === 'busy_only' ||
    calendarConfig?.privacyMode === 'busy_only'
  );
}

export function getDisplayEventTitle(
  event: CalendarEvent,
  calendarConfig?: PerCalendarConfig
): string {
  if (isBusyOnlyEvent(event, calendarConfig)) return 'Opptatt';
  return event.title || 'Uten tittel';
}

export function getDisplayEventLocation(
  event: CalendarEvent,
  calendarConfig?: PerCalendarConfig
): string | undefined {
  if (isBusyOnlyEvent(event, calendarConfig)) return undefined;
  return event.location;
}

export function getDisplayEventDescription(
  event: CalendarEvent,
  calendarConfig?: PerCalendarConfig
): string | undefined {
  if (isBusyOnlyEvent(event, calendarConfig)) return undefined;
  return event.description;
}

export function getEventCalendarConfig(
  event: CalendarEvent,
  calendarConfigs?: Record<string, PerCalendarConfig>
): PerCalendarConfig | undefined {
  const calId = event.calendarId || event.googleCalendarId;
  if (!calId || !calendarConfigs) return undefined;
  return calendarConfigs[calId];
}
