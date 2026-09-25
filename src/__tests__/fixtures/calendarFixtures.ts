import { CalendarEvent, FamilySettings, GoogleCalendarItem } from '../../types';

export const baseSettings: FamilySettings = {
  familyName: 'Test',
  carPriorityRule: '',
  defaultTravelBufferBefore: 40,
  defaultTravelBufferAfter: 40,
  autoApproveWorkTrips: true,
  locationTravelTimeOverrides: {},
  weekStartDay: 1,
  areas: [],
  carRules: {
    primaryUserId: 'm1',
    allowChildReservation: true,
    requireApprovalForMembers: [],
    priorityOverrideRule: 'work_always',
    allowAutoOverlapResolution: true,
    notifyOnConflict: true,
  },
  calendarRules: {
    autoReserveKeywords: [],
    requireWorkTag: false,
    applyBufferToAllLocations: true,
    autoDetectLocationFromTitle: true,
  },
  carCalendarIds: ['cal_job'],
  calendarConfigs: {
    cal_job: {
      calendarId: 'cal_job',
      privacyMode: 'full',
      carMode: 'all',
      bufferBeforeMinutes: 30,
      bufferAfterMinutes: 30,
    },
    cal_private: {
      calendarId: 'cal_private',
      privacyMode: 'full',
      carMode: 'none',
    },
  },
  disabledCalendarIds: [],
  calendarViewHiddenIds: [],
  deletedCalendarIds: [],
  showFamilyCarLine: true,
};

export const jobCalendar: GoogleCalendarItem = {
  id: 'cal_job',
  summary: 'Jobb',
  isCarCalendar: true,
};

export const privateCalendar: GoogleCalendarItem = {
  id: 'cal_private',
  summary: 'Privat',
};

export function makeTimedEvent(
  id: string,
  calendarId: string,
  start: string,
  end: string,
  title = 'Avtale'
): CalendarEvent {
  return {
    id,
    memberId: 'm1',
    memberName: 'Magnar',
    calendarId,
    title,
    startTime: start,
    endTime: end,
    isWorkRelated: true,
    createsCarReservation: false,
  };
}
