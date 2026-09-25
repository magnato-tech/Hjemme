/**
 * Google Calendar 2-Way Sync Engine & REST API Client
 */

import {
  CalendarEvent,
  CarReservation,
  FamilyMember,
  FamilySettings,
  GoogleCalendarItem,
  PerCalendarConfig,
  CalendarCarMode,
} from '../types';
import { calculateBufferedTime } from './dateUtils';

export interface GoogleCalendarEventItem {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
  status?: string;
  updated?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
}

export interface GoogleCalendarEventPayload {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
}

export interface SyncResult {
  success: boolean;
  importedCount: number;
  pushedCount: number;
  updatedCount: number;
  deletedCount: number;
  message: string;
  syncedAt: string;
  events: CalendarEvent[];
  newReservations: CarReservation[];
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
            error_callback?: (err: any) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

import firebaseConfig from '../../firebase-applet-config.json';

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
// Provisioned OAuth client ID from AI Studio & Google Cloud
const DEFAULT_CLIENT_ID = firebaseConfig.oAuthClientId || '212775398640-0945dho7drjn01kgdt6f9c5najre5aet.apps.googleusercontent.com';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

/**
 * Robust Google Calendar ID Sanitizer.
 * Automatically extracts the clean Google Calendar ID from:
 * - Direct IDs/emails: "user@gmail.com", "xyz@group.calendar.google.com", "primary"
 * - Embed URLs: "https://calendar.google.com/calendar/embed?src=user%40gmail.com&ctz=Europe%2FOslo"
 * - Embed iframe snippets: "<iframe src=\"https://calendar.google.com/calendar/embed?src=...\" ...>"
 * - iCal URLs: "https://calendar.google.com/calendar/ical/user%40gmail.com/public/basic.ics"
 * - URL encoded strings (%40 -> @)
 */
export function sanitizeGoogleCalendarId(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();

  // 1. If wrapped in iframe tag, extract src attribute
  const iframeMatch = cleaned.match(/src=["']([^"']+)["']/i);
  if (iframeMatch) {
    cleaned = iframeMatch[1];
  }

  // 2. If it is an embed URL with src parameter
  if (cleaned.includes('calendar.google.com') && (cleaned.includes('src=') || cleaned.includes('/embed'))) {
    try {
      // If it starts with http, parse with URL
      if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
        const urlObj = new URL(cleaned);
        const srcParam = urlObj.searchParams.get('src');
        if (srcParam) {
          cleaned = decodeURIComponent(srcParam);
        }
      } else {
        const match = cleaned.match(/[?&]src=([^&]+)/i);
        if (match) {
          cleaned = decodeURIComponent(match[1]);
        }
      }
    } catch {
      const match = cleaned.match(/[?&]src=([^&]+)/i);
      if (match) {
        cleaned = decodeURIComponent(match[1]);
      }
    }
  }

  // 3. If it is an iCal URL
  if (cleaned.includes('/calendar/ical/')) {
    const icalMatch = cleaned.match(/\/calendar\/ical\/([^/]+)/i);
    if (icalMatch) {
      cleaned = decodeURIComponent(icalMatch[1]);
    }
  }

  // 4. URL decode if still encoded
  if (cleaned.includes('%40') || cleaned.includes('%2F')) {
    try {
      cleaned = decodeURIComponent(cleaned);
    } catch {
      // ignore decoding error
    }
  }

  // 5. Strip surrounding quotes and whitespace
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();

  return cleaned;
}

/**
 * Request OAuth Access Token from user via Google Identity Services
 */
export async function requestGoogleAccessToken(customClientId?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not available'));
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      // Fallback if script is loading or blocked in iframe
      const storedToken = localStorage.getItem('gcal_access_token');
      if (storedToken) {
        resolve(storedToken);
        return;
      }
      reject(
        new Error(
          'Google Identity Services (GSI) biblioteket er ikke lastet ennå. Sjekk internettforbindelsen.'
        )
      );
      return;
    }

    const clientId = customClientId || DEFAULT_CLIENT_ID;

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_SCOPES,
        callback: (response) => {
          if (response.access_token) {
            localStorage.setItem('gcal_access_token', response.access_token);
            resolve(response.access_token);
          } else if (response.error) {
            reject(new Error(`Google OAuth feil: ${response.error}`));
          } else {
            reject(new Error('Ingen tilgangstoken mottatt fra Google'));
          }
        },
        error_callback: (err) => {
          const errStr = String(err?.message || err?.type || err || '');
          const isClosedOrBlocked =
            err?.type === 'popup_closed' ||
            err?.type === 'popup_failed_to_open' ||
            errStr.toLowerCase().includes('popup window closed') ||
            errStr.toLowerCase().includes('popup_closed') ||
            errStr.toLowerCase().includes('popup_failed_to_open');

          if (isClosedOrBlocked) {
            console.warn('GSI: Påloggingsvindu ble lukket eller blokkert av nettleseren.');
            const cancellationError = new Error('Popup window closed');
            (cancellationError as any).type = 'popup_closed';
            (cancellationError as any).isCancellation = true;
            reject(cancellationError);
            return;
          }

          console.warn('GSI advarsel:', err);
          reject(err instanceof Error ? err : new Error(errStr || 'Ukjent GSI feil'));
        },
      });

      // Avoid forcing 'consent' every time if user already authorized; empty string or no prompt works best
      client.requestAccessToken({ prompt: '' });
    } catch (e: any) {
      reject(new Error(`Kunne ikke starte Google pålogging: ${e.message || e}`));
    }
  });
}

/**
 * Default sample calendars shown when previewing or before connecting to Google
 */
export const SAMPLE_GOOGLE_CALENDARS: GoogleCalendarItem[] = [
  {
    id: 'primary',
    summary: 'Magnar Totland (Primær)',
    description: 'Hovedkalender for magnar.totland@gmail.com',
    primary: true,
    backgroundColor: '#0284c7',
    foregroundColor: '#ffffff',
    accessRole: 'owner',
  },
  {
    id: 'c_jobb_totland@group.calendar.google.com',
    summary: 'Jobb, Møter & Oppdrag (Magnar)',
    description: 'Arbeidsavtaler, befaringer og klientmøter som krever bil',
    primary: false,
    backgroundColor: '#059669',
    foregroundColor: '#ffffff',
    accessRole: 'owner',
  },
  {
    id: 'c_bil_familie@group.calendar.google.com',
    summary: 'Bil & Kjøring Familie',
    description: 'Dedikert kalender for når bilen er booket av familien',
    primary: false,
    backgroundColor: '#ea580c',
    foregroundColor: '#ffffff',
    accessRole: 'owner',
  },
  {
    id: 'c_familie_felles@group.calendar.google.com',
    summary: 'Familiekalender Felles',
    description: 'Felles familieaktiviteter, bursdager og helgeturer',
    primary: false,
    backgroundColor: '#7c3aed',
    foregroundColor: '#ffffff',
    accessRole: 'owner',
  },
];

/**
 * Fetch all available calendars from the authenticated Google user's account
 */
export async function fetchUserGoogleCalendars(
  accessToken?: string,
  allowSampleFallback: boolean = false
): Promise<GoogleCalendarItem[]> {
  if (!accessToken) {
    return allowSampleFallback ? SAMPLE_GOOGLE_CALENDARS : [];
  }

  try {
    const url = `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('gcal_access_token');
        throw new Error('Google-tilgangstoken har utløpt. Vennligst logg inn på nytt.');
      }
      console.warn('Google Calendar API feil ved henting av kalenderliste:', response.status);
      return allowSampleFallback ? SAMPLE_GOOGLE_CALENDARS : [];
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      return allowSampleFallback ? SAMPLE_GOOGLE_CALENDARS : [];
    }

    return data.items.map((item: any) => ({
      id: item.id,
      summary: item.summaryOverride || item.summary || item.id,
      description: item.description,
      primary: Boolean(item.primary),
      backgroundColor: item.backgroundColor || (item.primary ? '#0284c7' : '#64748b'),
      foregroundColor: item.foregroundColor || '#ffffff',
      accessRole: item.accessRole,
      timeZone: item.timeZone,
    }));
  } catch (err) {
    console.warn('Feil ved henting av Google-kalendere:', err);
    return allowSampleFallback ? SAMPLE_GOOGLE_CALENDARS : [];
  }
}

/**
 * Fetch events from Google Calendar (Pull)
 */
export async function fetchGoogleCalendarEvents(
  accessToken: string,
  calendarId: string = 'primary',
  timeMin?: string,
  timeMax?: string
): Promise<GoogleCalendarEventItem[]> {
  const cleanCalId = sanitizeGoogleCalendarId(calendarId) || 'primary';
  const minTime = timeMin || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const maxTime = timeMax || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(
    cleanCalId
  )}/events?timeMin=${encodeURIComponent(minTime)}&timeMax=${encodeURIComponent(
    maxTime
  )}&singleEvents=true&orderBy=startTime&maxResults=150`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('gcal_access_token');
      throw new Error('Google-tilgangstoken har utløpt. Vennligst logg inn på nytt.');
    }
    const errText = await response.text();
    throw new Error(`Google Calendar API feil (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Create an event in Google Calendar (Push)
 * GUARANTEE: In read-only mode, the app NEVER modifies user's Google Calendar.
 */
export async function createGoogleCalendarEvent(
  _accessToken: string,
  _event: GoogleCalendarEventPayload,
  _calendarId: string = 'primary'
): Promise<GoogleCalendarEventItem> {
  // Read-only guarantee: App never writes to Google Calendar
  console.info('Google Calendar er konfigurert i skrivebeskyttet modus (kun lesing). Ingen hendelse opprettet i Google.');
  return { id: `local_readonly_${Date.now()}` };
}

/**
 * Update an event in Google Calendar (Push update)
 * GUARANTEE: In read-only mode, the app NEVER modifies user's Google Calendar.
 */
export async function updateGoogleCalendarEvent(
  _accessToken: string,
  googleEventId: string,
  _event: Partial<GoogleCalendarEventPayload>,
  _calendarId: string = 'primary'
): Promise<GoogleCalendarEventItem> {
  console.info('Google Calendar er konfigurert i skrivebeskyttet modus. Ingen endring sendt til Google.');
  return { id: googleEventId };
}

/**
 * Delete an event in Google Calendar (Push delete)
 * GUARANTEE: In read-only mode, the app NEVER modifies user's Google Calendar.
 */
export async function deleteGoogleCalendarEvent(
  _accessToken: string,
  _googleEventId: string,
  _calendarId: string = 'primary'
): Promise<boolean> {
  console.info('Google Calendar er konfigurert i skrivebeskyttet modus. Ingen sletting sendt til Google.');
  return true;
}

/**
 * Intelligently detect if an event title/summary represents a work meeting or appointment needing a car
 */
export function isLikelyWorkTrip(summary: string = '', location: string = ''): boolean {
  const text = `${summary} ${location}`.toLowerCase();
  const workKeywords = [
    'jobb',
    'arbeid',
    'møte',
    'samtale',
    'klient',
    'kunde',
    'prosjekt',
    'lillesand',
    'kristiansand',
    'grimstad',
    'arendal',
    'befaring',
    'inspeksjon',
    'avtale',
    'kontor',
    'sykehus',
    'tannlege',
  ];
  return workKeywords.some((kw) => text.includes(kw));
}

export interface EventCarEvaluationResult {
  shouldCreateCar: boolean;
  bufferBefore: number;
  bufferAfter: number;
  targetVehicleId?: string;
  matchedRule: string;
}

/**
 * Robust evaluation engine that determines whether a calendar appointment should reserve the car,
 * including per-activity overrides (Block 5) and excluded keywords filter (Filter 4: exclude_keywords).
 */
export function evaluateCalendarEventCarReservation(params: {
  title: string;
  location?: string;
  calendarConfig?: PerCalendarConfig;
  defaultCarMode?: 'all' | 'work_only' | 'none';
  defaultVehicleId?: string;
  defaultBufferBefore?: number;
  defaultBufferAfter?: number;
  isCarCalendarFallback?: boolean;
}): EventCarEvaluationResult {
  const {
    title = '',
    location = '',
    calendarConfig,
    defaultCarMode = 'work_only',
    defaultVehicleId,
    defaultBufferBefore = 40,
    defaultBufferAfter = 40,
    isCarCalendarFallback = true,
  } = params;

  const normalizedTitle = (title || '').trim().toLowerCase();
  const normalizedLocation = (location || '').trim().toLowerCase();

  const bufferBefore =
    calendarConfig?.bufferBeforeMinutes ?? defaultBufferBefore;
  const bufferAfter =
    calendarConfig?.bufferAfterMinutes ?? defaultBufferAfter;
  const targetVehicleId =
    calendarConfig?.targetVehicleId || defaultVehicleId;

  // 1. Highest Priority: Specific Activity Overrides (Blokk 5)
  if (calendarConfig?.activityOverrides) {
    const overrides = Object.values(calendarConfig.activityOverrides);
    for (const ov of overrides) {
      if (!ov || !ov.activityTitle) continue;
      const ovTitle = ov.activityTitle.trim().toLowerCase();
      if (ovTitle && (normalizedTitle === ovTitle || normalizedTitle.includes(ovTitle))) {
        return {
          shouldCreateCar: ov.blocksCar,
          bufferBefore: ov.bufferBeforeMinutes ?? bufferBefore,
          bufferAfter: ov.bufferAfterMinutes ?? bufferAfter,
          targetVehicleId: ov.targetVehicleId || targetVehicleId,
          matchedRule: `Aktivitetsoverstyring: «${ov.activityTitle}» (${ov.blocksCar ? 'Sperrer bil' : 'Sperrer IKKE bil'})`,
        };
      }
    }
  }

  // 2. Evaluate based on carMode
  const carMode: CalendarCarMode | undefined = calendarConfig?.carMode;

  if (carMode === 'none') {
    return {
      shouldCreateCar: false,
      bufferBefore,
      bufferAfter,
      targetVehicleId,
      matchedRule: 'Ingen bilreservasjon valgt for denne kalenderen',
    };
  }

  if (carMode === 'all') {
    return {
      shouldCreateCar: true,
      bufferBefore,
      bufferAfter,
      targetVehicleId,
      matchedRule: 'Alle hendelser sperrer bil',
    };
  }

  if (carMode === 'exclude_keywords') {
    const excludedKeywords = calendarConfig?.excludedKeywords || [];
    const matchedKw = excludedKeywords.find((kw) => {
      const cleanKw = kw.trim().toLowerCase();
      return cleanKw && (normalizedTitle.includes(cleanKw) || normalizedLocation.includes(cleanKw));
    });

    if (matchedKw) {
      return {
        shouldCreateCar: false,
        bufferBefore,
        bufferAfter,
        targetVehicleId,
        matchedRule: `Unntaksord: «${matchedKw}» (sperrer ikke bil)`,
      };
    }

    return {
      shouldCreateCar: true,
      bufferBefore,
      bufferAfter,
      targetVehicleId,
      matchedRule: 'Alle hendelser sperrer bil (sikkerhetsmodus, ingen unntaksord matchet)',
    };
  }

  if (carMode === 'work_only') {
    const isWork = isLikelyWorkTrip(title, location);
    const creates = isWork || Boolean(location);
    return {
      shouldCreateCar: creates,
      bufferBefore,
      bufferAfter,
      targetVehicleId,
      matchedRule: creates
        ? 'Jobb- eller reiserelatert avtale'
        : 'Ikke jobb- eller reiserelatert',
    };
  }

  // Fallback if no per-calendar carMode is configured
  if (!isCarCalendarFallback) {
    return {
      shouldCreateCar: false,
      bufferBefore,
      bufferAfter,
      targetVehicleId,
      matchedRule: 'Kalender ikke markert for bilreservasjon',
    };
  }

  const isWork = isLikelyWorkTrip(title, location);
  const creates = defaultCarMode === 'all' || isWork || Boolean(location);
  return {
    shouldCreateCar: creates,
    bufferBefore,
    bufferAfter,
    targetVehicleId,
    matchedRule: creates
      ? 'Standardregel: Reserverer bil'
      : 'Standardregel: Reserverer ikke bil',
  };
}

/**
 * Perform bi-directional 2-way synchronization
 */
export async function executeTwoWayCalendarSync(params: {
  accessToken: string;
  localEvents: CalendarEvent[];
  localReservations: CarReservation[];
  members: FamilyMember[];
  targetMemberId: string;
  calendarId?: string;
  settings: FamilySettings;
  vehicleId: string;
}): Promise<SyncResult> {
  const {
    accessToken,
    localEvents,
    localReservations,
    members,
    targetMemberId,
    settings,
    vehicleId,
  } = params;

  // Use configured calendar from settings or fallback to primary
  const targetCalendarId = params.calendarId || settings.googleCalendarConfig?.calendarId || 'primary';
  const targetVehicleId = settings.googleCalendarConfig?.targetVehicleId || vehicleId;
  const autoReserve = settings.googleCalendarConfig?.autoReserveCar ?? true;
  const filterMode = settings.googleCalendarConfig?.filterMode ?? 'work_only';
  const calLabel = settings.googleCalendarConfig?.calendarName || (targetCalendarId === 'primary' ? 'Primærkalender' : targetCalendarId);

  const targetMember = members.find((m) => m.id === targetMemberId) || members[0];
  const nowIso = new Date().toISOString();

  let importedCount = 0;
  let pushedCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;

  // 1. Fetch remote Google Calendar events from the chosen calendar (Pull)
  const remoteEvents = await fetchGoogleCalendarEvents(accessToken, targetCalendarId);

  const updatedEventsMap = new Map<string, CalendarEvent>();
  localEvents.forEach((ev) => updatedEventsMap.set(ev.id, { ...ev }));

  const newReservations: CarReservation[] = [];

  // 2. Process Remote Events -> Local Sync (Pull & Update)
  for (const remote of remoteEvents) {
    if (remote.status === 'cancelled') {
      // Find matching local event and remove
      const localMatch = Array.from(updatedEventsMap.values()).find(
        (e) => e.googleEventId === remote.id
      );
      if (localMatch) {
        updatedEventsMap.delete(localMatch.id);
        deletedCount++;
      }
      continue;
    }

    let startTime: string | null = null;
    let endTime: string | null = null;

    if (remote.start?.dateTime) {
      startTime = remote.start.dateTime;
    } else if (remote.start?.date) {
      startTime = `${remote.start.date}T08:00:00`;
    }

    if (remote.end?.dateTime) {
      endTime = remote.end.dateTime;
    } else if (remote.end?.date && remote.start?.date) {
      // Google Calendar end.date for all-day events is exclusive (+1 day).
      // For a single-day event on Sep 18, Google returns start.date = "2026-09-18" and end.date = "2026-09-19".
      // We must not treat this as ending on the 19th!
      const sDate = new Date(remote.start.date);
      const eDate = new Date(remote.end.date);
      const dayDiff = Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff <= 1) {
        // Single-day all-day event: ends at 17:00 on the same date
        endTime = `${remote.start.date}T17:00:00`;
      } else {
        // Multi-day event: end date in Google is exclusive, subtract 1 day
        const actualLastDay = new Date(eDate.getTime() - 24 * 60 * 60 * 1000);
        const y = actualLastDay.getFullYear();
        const m = String(actualLastDay.getMonth() + 1).padStart(2, '0');
        const d = String(actualLastDay.getDate()).padStart(2, '0');
        endTime = `${y}-${m}-${d}T17:00:00`;
      }
    } else if (remote.start?.date) {
      endTime = `${remote.start.date}T17:00:00`;
    }

    if (!startTime || !endTime) continue;

    const title = remote.summary || 'Avtale uten tittel';
    const location = remote.location || '';
    const isWork = isLikelyWorkTrip(title, location);

    // Check per-calendar configuration if available
    const perCal = settings.calendarConfigs?.[targetCalendarId];

    // Privacy setting check: Is this calendar configured as confidential / busy_only?
    const calPrivacy = perCal?.privacyMode || settings.calendarPrivacyModes?.[targetCalendarId];
    const isConfidential = calPrivacy === 'busy_only';

    // Determine if this event should block/reserve the car using the centralized evaluation engine
    const isCarCal =
      settings.carCalendarIds?.includes(targetCalendarId) ||
      (settings.googleCalendarConfig?.calendarId === targetCalendarId && autoReserve);

    const carEval = evaluateCalendarEventCarReservation({
      title,
      location,
      calendarConfig: perCal,
      defaultCarMode: filterMode,
      defaultVehicleId: targetVehicleId,
      defaultBufferBefore: settings.defaultTravelBufferBefore || 40,
      defaultBufferAfter: settings.defaultTravelBufferAfter || 40,
      isCarCalendarFallback: isCarCal,
    });

    const createsCar = carEval.shouldCreateCar;
    const effectiveMember =
      (perCal?.assignedMemberId && members.find((m) => m.id === perCal.assignedMemberId)) ||
      targetMember;
    const bufferBefore = carEval.bufferBefore;
    const bufferAfter = carEval.bufferAfter;
    const effectiveVehicleId = carEval.targetVehicleId || targetVehicleId;

    // Look for existing local event matched by googleEventId or exact time+title
    const existingLocal = Array.from(updatedEventsMap.values()).find(
      (e) => e.googleEventId === remote.id || (e.title === title && e.startTime === startTime)
    );

    if (existingLocal) {
      // Update local event if changed
      let hasChanges = false;
      if (
        existingLocal.title !== title ||
        existingLocal.startTime !== startTime ||
        existingLocal.endTime !== endTime ||
        existingLocal.isConfidential !== isConfidential ||
        existingLocal.createsCarReservation !== createsCar
      ) {
        existingLocal.title = title;
        existingLocal.startTime = startTime;
        existingLocal.endTime = endTime;
        existingLocal.location = location;
        existingLocal.googleEventId = remote.id;
        existingLocal.googleCalendarId = targetCalendarId;
        existingLocal.htmlLink = remote.htmlLink;
        existingLocal.isSyncedWithGoogle = true;
        existingLocal.lastSyncedAt = nowIso;
        existingLocal.isConfidential = isConfidential;
        existingLocal.privacyMode = isConfidential ? 'busy_only' : 'full';
        existingLocal.createsCarReservation = createsCar;
        existingLocal.memberId = effectiveMember.id;
        existingLocal.memberName = effectiveMember.name;
        existingLocal.bufferBeforeMinutes = bufferBefore;
        existingLocal.bufferAfterMinutes = bufferAfter;
        hasChanges = true;
        updatedCount++;
      }
      updatedEventsMap.set(existingLocal.id, existingLocal);
    } else {
      // Create new local event from Google Calendar
      const eventId = `cal_g_${remote.id.substring(0, 12)}_${Date.now()}`;

      let reservationId: string | undefined;

      if (createsCar) {
        const { reservationStart, reservationEnd } = calculateBufferedTime(
          startTime,
          endTime,
          bufferBefore,
          bufferAfter
        );

        reservationId = `res_g_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

        const newRes: CarReservation = {
          id: reservationId,
          vehicleId: effectiveVehicleId,
          memberId: effectiveMember.id,
          memberName: effectiveMember.name,
          startTime: reservationStart,
          endTime: reservationEnd,
          purpose: isConfidential
            ? `Opptatt: Kalenderavtale [${bufferBefore}m buffer]`
            : `${isWork ? 'Jobb: ' : 'Avtale: '}${title}${
                location ? ` (${location})` : ''
              } [${bufferBefore}m buffer]`,
          isWorkRelated: isWork,
          source: 'google_calendar',
          calendarEventId: eventId,
          status: 'confirmed',
          location: isConfidential ? undefined : location,
          bufferBeforeMinutes: bufferBefore,
          bufferAfterMinutes: bufferAfter,
          isConfidential,
          createdAt: nowIso,
        };

        newReservations.push(newRes);
      }

      const newLocalEvent: CalendarEvent = {
        id: eventId,
        memberId: effectiveMember.id,
        memberName: effectiveMember.name,
        calendarId: targetCalendarId,
        title: title,
        startTime: startTime,
        endTime: endTime,
        location: location,
        description: remote.description,
        isWorkRelated: isWork,
        createsCarReservation: createsCar,
        vehicleReservationId: reservationId,
        bufferBeforeMinutes: bufferBefore,
        bufferAfterMinutes: bufferAfter,
        googleEventId: remote.id,
        googleCalendarId: targetCalendarId,
        htmlLink: remote.htmlLink,
        isSyncedWithGoogle: true,
        lastSyncedAt: nowIso,
        isConfidential,
        privacyMode: isConfidential ? 'busy_only' : 'full',
      };

      updatedEventsMap.set(eventId, newLocalEvent);
      importedCount++;
    }
  }

  // 3. In Read-Only Mode: We do NOT push or write any local events to Google Calendar.
  // The user's Google Calendar is left completely untouched.

  const finalEvents = Array.from(updatedEventsMap.values());

  return {
    success: true,
    importedCount,
    pushedCount: 0,
    updatedCount,
    deletedCount,
    message: `Lesing fullført for «${calLabel}»! Hentet ${importedCount} hendelser. (Skrivebeskyttet modus – Google Kalender endres aldri).`,
    syncedAt: nowIso,
    events: finalEvents,
    newReservations,
  };
}

export interface MultiCalendarSyncItem {
  id: string;
  name?: string;
  assignedMemberId?: string;
}

export interface MultiCalendarSyncParams {
  accessToken: string;
  localEvents: CalendarEvent[];
  localReservations: CarReservation[];
  members: FamilyMember[];
  targetMemberId: string;
  calendars: MultiCalendarSyncItem[];
  settings: FamilySettings;
  vehicleId: string;
}

export interface MultiCalendarSyncResult {
  success: boolean;
  totalImported: number;
  resultsByCalendar: Array<{
    calendarId: string;
    calendarName: string;
    importedCount: number;
    error?: string;
  }>;
  message: string;
  syncedAt: string;
  events: CalendarEvent[];
  newReservations: CarReservation[];
}

/**
 * Sync multiple Google Calendars concurrently or sequentially and aggregate all events & reservations
 */
export async function executeMultiCalendarSync(
  params: MultiCalendarSyncParams
): Promise<MultiCalendarSyncResult> {
  const {
    accessToken,
    localEvents,
    localReservations,
    members,
    targetMemberId,
    calendars,
    settings,
    vehicleId,
  } = params;

  const nowIso = new Date().toISOString();
  const updatedEventsMap = new Map<string, CalendarEvent>();
  localEvents.forEach((ev) => updatedEventsMap.set(ev.id, { ...ev }));

  const allNewReservations: CarReservation[] = [];
  const resultsByCalendar: Array<{
    calendarId: string;
    calendarName: string;
    importedCount: number;
    error?: string;
  }> = [];

  let totalImported = 0;

  for (const cal of calendars) {
    const cleanId = sanitizeGoogleCalendarId(cal.id);
    if (!cleanId) continue;

    const calLabel = cal.name || cleanId;
    try {
      const res = await executeTwoWayCalendarSync({
        accessToken,
        localEvents: Array.from(updatedEventsMap.values()),
        localReservations,
        members,
        targetMemberId: cal.assignedMemberId || targetMemberId,
        calendarId: cleanId,
        settings,
        vehicleId,
      });

      // Update the accumulated events map with the results for this calendar
      res.events.forEach((ev) => updatedEventsMap.set(ev.id, ev));
      allNewReservations.push(...res.newReservations);
      totalImported += res.importedCount;

      resultsByCalendar.push({
        calendarId: cleanId,
        calendarName: calLabel,
        importedCount: res.importedCount,
      });
    } catch (err: any) {
      console.warn(`Feil ved synkronisering av kalender «${calLabel}» (${cleanId}):`, err);
      resultsByCalendar.push({
        calendarId: cleanId,
        calendarName: calLabel,
        importedCount: 0,
        error: err?.message || String(err),
      });
    }
  }

  // Build descriptive summary message
  const successList = resultsByCalendar.filter((r) => !r.error);
  const errorList = resultsByCalendar.filter((r) => r.error);

  let message = '';
  if (successList.length > 0) {
    const parts = successList.map((s) => `«${s.calendarName}» (${s.importedCount} hendelser)`);
    message = `Synkronisering fullført! Hentet hendelser fra: ${parts.join(', ')}.`;
  } else if (errorList.length > 0) {
    message = `Kunne ikke hente kalenderhendelser: ${errorList.map((e) => `${e.calendarName} (${e.error})`).join(', ')}`;
  } else {
    message = 'Ingen aktive kalendere var funnet for synkronisering.';
  }

  if (errorList.length > 0 && successList.length > 0) {
    message += ` (Advarsel for: ${errorList.map((e) => `«${e.calendarName}»`).join(', ')})`;
  }

  return {
    success: successList.length > 0,
    totalImported,
    resultsByCalendar,
    message,
    syncedAt: nowIso,
    events: Array.from(updatedEventsMap.values()),
    newReservations: allNewReservations,
  };
}

