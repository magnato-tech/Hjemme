export type Role = 'admin' | 'adult' | 'child';

export interface FamilyMember {
  id: string;
  name: string;
  role: Role;
  avatarColor: string;
  avatarEmoji: string;
  weeklyPointsGoal: number;
  isActive: boolean;
  canReserveCar: boolean;
  canManageTasks: boolean;
  canManageFamily: boolean;
  email?: string;
  isTestPerson?: boolean;
}

export interface Vehicle {
  id: string;
  name: string;
  licensePlate?: string;
  ownerId: string;
  isAvailable: boolean;
  color: string;
  fuelType?: 'electric' | 'hybrid' | 'petrol' | 'diesel';
  notes?: string;
}

export interface CarReservation {
  id: string;
  vehicleId: string;
  memberId: string;
  memberName: string;
  startTime: string; // ISO or YYYY-MM-DDTHH:mm
  endTime: string;
  purpose: string;
  isWorkRelated: boolean;
  source: 'manual' | 'google_calendar' | 'recurrence';
  calendarEventId?: string;
  status: 'confirmed' | 'pending_conflict' | 'cancelled';
  location?: string;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  notes?: string;
  isConfidential?: boolean; // if confidential, hide details (e.g. pastor consultations)
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  memberId: string;
  memberName: string;
  calendarId: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  isWorkRelated: boolean;
  createsCarReservation: boolean;
  vehicleReservationId?: string;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  googleEventId?: string;
  googleCalendarId?: string;
  htmlLink?: string;
  isSyncedWithGoogle?: boolean;
  lastSyncedAt?: string;
  isConfidential?: boolean; // When true, rendered as "Opptatt" to protect pastoral/confidential duties
  privacyMode?: 'full' | 'busy_only';
}

export interface CalendarConnection {
  id: string;
  memberId: string;
  calendarName: string;
  calendarEmail: string;
  isConnected: boolean;
  autoCarReservationEnabled: boolean;
  defaultBufferBeforeMinutes: number;
  defaultBufferAfterMinutes: number;
  lastSyncedAt?: string;
  accessToken?: string;
  syncDirection?: 'two_way' | 'pull_only' | 'push_only';
  autoSync?: boolean;
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  area: string; // '1. etasje' | '2. etasje' | 'Kjeller' | 'Ute' | 'Hele huset' etc.
  room: string; // 'Kjøkken' | 'Bad' | 'Stue' | 'Gang' | 'Vaskerom' | 'Soverom' | 'Hage' etc.
  points: number;
  /** Dager mellom fullføringer. 0 = engangsoppgave. */
  intervalDays: number;
  /** 0=søndag … 6=lørdag (Date.getDay()). null = rullerende frist etter intervalDays. */
  fixedWeekday: number | null;
  eligibleMemberIds: string[]; // empty means all
  isActive: boolean;
  isMandatory: boolean;
  iconName: string;
}

export type TaskStatus = 'available' | 'claimed' | 'in_progress' | 'completed' | 'overdue';

export interface TaskInstance {
  id: string;
  templateId: string;
  title: string;
  description: string;
  area: string;
  room: string;
  points: number; // Historical point value locked at instance creation/completion
  weekNumber: number;
  year: number;
  status: TaskStatus;
  claimedByMemberId?: string;
  claimedByName?: string;
  claimedAt?: string;
  completedAt?: string;
  completedByMemberId?: string;
  completedByName?: string;
  deadlineDate: string; // ISO datetime, frist kl. 23:59:59
  iconName: string;
  isMandatory: boolean;
}

export interface HouseArea {
  id: string;
  name: string; // e.g. '1. etasje', '2. etasje', 'Kjeller', 'Ute', 'Hele huset'
  description?: string;
  rooms: string[]; // e.g. ['Kjøkken', 'Stue', 'Gang', 'Bad']
}

export interface CarRuleConfig {
  primaryUserId: string; // e.g. 'member_magnar'
  allowChildReservation: boolean;
  requireApprovalForMembers: string[]; // member IDs who need confirmation
  priorityOverrideRule: 'primary_user_always' | 'work_always' | 'first_come';
  allowAutoOverlapResolution: boolean;
  notifyOnConflict: boolean;
}

export interface CalendarRuleConfig {
  autoReserveKeywords: string[]; // e.g. ['jobb', 'samtale', 'møte', 'klient', 'oppdrag', 'befaring', 'kurs']
  requireWorkTag: boolean;
  applyBufferToAllLocations: boolean;
  autoDetectLocationFromTitle: boolean;
}


export interface TravelBufferSetting {
  beforeMinutes: number;
  afterMinutes: number;
  label: string;
}

export type CalendarCarMode = 'none' | 'all' | 'work_only' | 'exclude_keywords';
export type CalendarPrivacyMode = 'full' | 'busy_only';

export interface ActivityOverride {
  activityTitle: string;
  blocksCar: boolean;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  targetVehicleId?: string;
}

export interface PerCalendarConfig {
  calendarId: string;
  icalUrl?: string;
  customName?: string;
  assignedMemberId?: string;
  privacyMode: CalendarPrivacyMode;
  carMode: CalendarCarMode;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  targetVehicleId?: string;
  enabledForDisplay?: boolean;
  excludedKeywords?: string[]; // e.g. ["Idda Hockey", "Hjemmekontor"]
  activityOverrides?: Record<string, ActivityOverride>; // keyed by normalized activity title
}

export interface GoogleCalendarItem {
  id: string;
  summary: string;
  icalUrl?: string;
  customName?: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: string;
  timeZone?: string;
  enabledForDisplay?: boolean;
  isCustom?: boolean;
  privacyMode?: 'full' | 'busy_only'; // 'full' = normal details, 'busy_only' = shows as "Opptatt" (confidential/pastor)
  isCarCalendar?: boolean; // if true, events in this calendar automatically reserve/block the car
  carMode?: CalendarCarMode; // 'none', 'all', 'work_only', or 'exclude_keywords'
  targetVehicleId?: string;
  assignedMemberId?: string;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  excludedKeywords?: string[];
  activityOverrides?: Record<string, ActivityOverride>;
}

export interface GoogleCalendarConfig {
  calendarId: string; // e.g. 'primary' or specific calendar email/ID
  calendarName: string; // Display name e.g. 'Magnars jobb & avtaler'
  autoReserveCar: boolean; // Whether events in this calendar block car availability
  filterMode: 'all' | 'work_only'; // 'all' = every event blocks car; 'work_only' = keywords & location only
  targetVehicleId?: string; // which vehicle gets booked (defaults to active car)
  lastSyncedAt?: string;
}

/** Lagret poengresultat for én medlem × én poenguke (mandag 06:00). */
export interface MemberWeeklyPointsRecord {
  id: string;
  memberId: string;
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  year: number;
  completedPoints: number;
  claimedPoints: number;
  weeklyPointsGoal: number;
  goalMet: boolean;
  finalizedAt: string;
}

export interface FamilySettings {
  familyName: string;
  carPriorityRule: string; // e.g. 'Magnars jobbrelaterte kalenderhendelser reserverer bilen automatisk'
  defaultTravelBufferBefore: number;
  defaultTravelBufferAfter: number;
  autoApproveWorkTrips: boolean;
  locationTravelTimeOverrides: Record<string, number>; // location name -> minutes
  weekStartDay: number; // 1 = Monday
  areas: HouseArea[];
  carRules: CarRuleConfig;
  calendarRules: CalendarRuleConfig;
  googleCalendarConfig?: GoogleCalendarConfig;
  carCalendarIds?: string[]; // IDs of all calendars that act as car calendars
  calendarPrivacyModes?: Record<string, 'full' | 'busy_only'>; // calendarId -> 'full' | 'busy_only'
  calendarConfigs?: Record<string, PerCalendarConfig>; // calendarId -> detailed settings
  disableMockData?: boolean;
  savedCalendars?: GoogleCalendarItem[];
  disabledCalendarIds?: string[];
  /** Skjult kun i kalendervisning; teller fortsatt for Familiebilen */
  calendarViewHiddenIds?: string[];
  deletedCalendarIds?: string[]; // permanently removed calendars
  /** When true, calendar views only show events/activities that reserve the car */
  calendarShowOnlyCarReservations?: boolean;
  /** When true (default), show the derived family-car occupancy line in week view */
  showFamilyCarLine?: boolean;
  /** YYYY-MM-DD for siste fullførte poenguke (mandag), brukes ved ukentlig finalisering. */
  lastFinalizedPointsWeekKey?: string;
}
