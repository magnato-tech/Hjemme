import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, logoutFirebase } from '../lib/firebase';
import {
  subscribeMembers,
  saveMemberToFirestore,
  deleteMemberFromFirestore,
  subscribeVehicles,
  saveVehicleToFirestore,
  deleteVehicleFromFirestore,
  subscribeReservations,
  saveReservationToFirestore,
  deleteReservationFromFirestore,
  subscribeCalendarEvents,
  saveCalendarEventToFirestore,
  deleteCalendarEventFromFirestore,
  subscribeTaskTemplates,
  saveTaskTemplateToFirestore,
  deleteTaskTemplateFromFirestore,
  subscribeTaskInstances,
  saveTaskInstanceToFirestore,
  deleteTaskInstanceFromFirestore,
  subscribeSettings,
  saveSettingsToFirestore,
  subscribeWeeklyPoints,
  saveWeeklyPointsRecordToFirestore,
  seedInitialDataIfEmpty,
} from '../services/firestoreService';
import {
  FamilyMember,
  Vehicle,
  CarReservation,
  CalendarEvent,
  CalendarConnection,
  TaskTemplate,
  TaskInstance,
  FamilySettings,
  HouseArea,
  CarRuleConfig,
  CalendarRuleConfig,
  GoogleCalendarItem,
  GoogleCalendarConfig,
  Role,
  PerCalendarConfig,
  CalendarCarMode,
  CalendarPrivacyMode,
  MemberWeeklyPointsRecord,
} from '../types';
import {
  initialFamilyMembers,
  initialVehicles,
  initialSettings,
  initialCalendarConnections,
  initialCalendarEvents,
  initialReservations,
  initialTaskTemplates,
  initialTaskInstances,
} from '../data/initialData';
import {
  calculateBufferedTime,
  findConflictingReservations,
  getWeekNumber,
  getPointsWeekStart,
  formatLocalDateKey,
} from '../utils/dateUtils';
import {
  buildWeeklyPointsRecord,
  getWeeksToFinalize,
} from '../utils/pointsHistoryUtils';
import {
  buildRestartedTaskInstances,
  completeTaskInstance,
  createTaskInstanceFromTemplate,
  getMemberClaimedPoints as getMemberClaimedPointsUtil,
  getMemberCompletedPoints as getMemberCompletedPointsUtil,
  spawnNextTaskInstance,
} from '../utils/taskUtils';
import { migrateTaskTemplates } from '../utils/taskMigration';
import {
  requestGoogleAccessToken,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  executeTwoWayCalendarSync,
  executeMultiCalendarSync,
  fetchUserGoogleCalendars,
  SAMPLE_GOOGLE_CALENDARS,
  SyncResult,
  isLikelyWorkTrip,
  evaluateCalendarEventCarReservation,
  sanitizeGoogleCalendarId,
} from '../utils/googleCalendarService';

interface FamilyContextType {
  // Active member (the user viewing the app)
  activeMemberId: string;
  activeMember: FamilyMember;
  setActiveMemberId: (id: string) => void;

  // Family data
  members: FamilyMember[];
  addMember: (member: Omit<FamilyMember, 'id'>) => void;
  updateMember: (id: string, updates: Partial<FamilyMember>) => void;
  deleteMember: (id: string) => void;

  // Vehicles
  vehicles: Vehicle[];
  activeVehicleId: string;
  activeVehicle: Vehicle;
  setActiveVehicleId: (id: string) => void;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;

  // Car reservations & rules
  reservations: CarReservation[];
  checkCarAvailability: (
    startTime: string,
    endTime: string,
    vehicleId?: string,
    ignoreReservationId?: string
  ) => { isAvailable: boolean; conflicts: CarReservation[] };
  createCarReservation: (
    reservation: Omit<CarReservation, 'id' | 'createdAt'>
  ) => { success: boolean; conflicts: CarReservation[]; reservation?: CarReservation };
  cancelReservation: (id: string) => void;
  updateCarRules: (rules: Partial<CarRuleConfig>) => void;

  // Calendar & Rules
  calendarConnections: CalendarConnection[];
  calendarEvents: CalendarEvent[];
  addCalendarEvent: (
    event: Omit<CalendarEvent, 'id'>
  ) => Promise<{ event: CalendarEvent; reservation?: CarReservation }>;
  deleteCalendarEvent: (id: string) => Promise<void>;
  syncCalendar: (connectionId: string) => Promise<SyncResult | null>;
  syncTwoWayWithGoogle: (targetMemberId?: string) => Promise<SyncResult | null>;
  updateCalendarConnection: (id: string, updates: Partial<CalendarConnection>) => void;
  updateCalendarRules: (rules: Partial<CalendarRuleConfig>) => void;
  googleAccessToken: string | null;
  isGoogleConnected: boolean;
  isTwoWaySyncing: boolean;
  lastGoogleSyncTime: string | null;
  googleSyncStatusMessage: string | null;
  connectGoogleCalendar: (token?: string) => Promise<boolean>;
  disconnectGoogleCalendar: () => void;
  availableGoogleCalendars: GoogleCalendarItem[];
  isLoadingCalendars: boolean;
  refreshGoogleCalendars: () => Promise<GoogleCalendarItem[]>;
  setSelectedGoogleCalendar: (calendarId: string, calendarName?: string) => Promise<void>;
  updateGoogleCalendarConfig: (updates: Partial<GoogleCalendarConfig>) => Promise<void>;
  addCustomGoogleCalendar: (id: string, name: string, color?: string) => Promise<void>;
  updateGoogleCalendarName: (id: string, newName: string) => Promise<void>;
  toggleCalendarViewVisibility: (id: string, visible: boolean) => Promise<void>;
  toggleCalendarDisabled: (id: string, active: boolean) => Promise<void>;
  toggleCarCalendar: (id: string) => Promise<void>;
  setCalendarPrivacyMode: (id: string, mode: 'full' | 'busy_only') => Promise<void>;
  updateCalendarSettings: (calId: string, updates: Partial<PerCalendarConfig>, newCalendarId?: string) => Promise<void>;
  removeCustomGoogleCalendar: (id: string) => Promise<void>;
  clearAllMockData: () => Promise<void>;
  toggleDisableMockData: (disable: boolean) => Promise<void>;
  addTestMember: (role?: Role, name?: string) => void;
  removeTestMembers: () => void;
  loadAllTestData: () => Promise<void>;
  removeAllTestData: (keepAdminOnly?: boolean) => Promise<void>;

  // House Structure / Areas
  areas: HouseArea[];
  addArea: (area: Omit<HouseArea, 'id'>) => void;
  updateArea: (id: string, updates: Partial<HouseArea>) => void;
  deleteArea: (id: string) => void;
  addRoomToArea: (areaId: string, roomName: string) => void;
  removeRoomFromArea: (areaId: string, roomName: string) => void;

  // Location travel overrides
  updateLocationOverride: (locationName: string, minutes: number) => void;
  deleteLocationOverride: (locationName: string) => void;

  // Tasks
  taskTemplates: TaskTemplate[];
  taskInstances: TaskInstance[];
  claimTask: (instanceId: string, memberId?: string) => void;
  unclaimTask: (instanceId: string) => void;
  completeTask: (instanceId: string, memberId?: string) => void;
  claimSuggestedTasks: (instanceIds: string[], memberId?: string) => void;
  createTaskTemplate: (template: Omit<TaskTemplate, 'id'>) => void;
  updateTaskTemplate: (id: string, updates: Partial<TaskTemplate>) => void;
  deleteTaskTemplate: (id: string) => void;
  restartTaskPool: () => void;

  // Settings
  settings: FamilySettings;
  updateSettings: (updates: Partial<FamilySettings>) => void;

  // Firebase Auth & Firestore Realtime Cloud Storage
  firebaseUser: User | null;
  isFirebaseAuthReady: boolean;
  isFirestoreConnected: boolean;
  isFirestoreSyncing: boolean;
  signInWithFirebaseGoogle: () => Promise<void>;
  signOutFirebaseUser: () => Promise<void>;
  pushAllToFirestore: () => Promise<void>;

  // Metrics & helpers
  getMemberCompletedPoints: (memberId: string) => number;
  getMemberClaimedPoints: (memberId: string) => number;
  weeklyPointsRecords: MemberWeeklyPointsRecord[];
  currentWeek: number;
  resetAllData: () => void;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

const STORAGE_KEY = 'familiekoordinator_state_v1';

export const mergeCalendarsList = (
  currentList: GoogleCalendarItem[] = [],
  savedList?: GoogleCalendarItem[],
  activeConfig?: GoogleCalendarConfig,
  disableMockData?: boolean,
  disabledIds?: string[],
  deletedIds?: string[],
  carCalendarIds?: string[],
  privacyModes?: Record<string, 'full' | 'busy_only'>
): GoogleCalendarItem[] => {
  const map = new Map<string, GoogleCalendarItem>();
  const deletedSet = new Set(deletedIds || []);

  // 1. If mock data is not disabled, seed with SAMPLE_GOOGLE_CALENDARS (unless deleted)
  if (!disableMockData) {
    SAMPLE_GOOGLE_CALENDARS.forEach((c) => {
      if (!deletedSet.has(c.id)) {
        map.set(c.id, { ...c, enabledForDisplay: true });
      }
    });
  }

  // 2. Add current list (unless deleted)
  currentList.forEach((c) => {
    if (deletedSet.has(c.id)) return;
    if (disableMockData && SAMPLE_GOOGLE_CALENDARS.some((s) => s.id === c.id)) return;
    map.set(c.id, { ...c });
  });

  // 3. Add saved list from settings (unless deleted)
  if (savedList && savedList.length > 0) {
    savedList.forEach((c) => {
      if (deletedSet.has(c.id)) return;
      if (disableMockData && SAMPLE_GOOGLE_CALENDARS.some((s) => s.id === c.id)) return;
      const existing = map.get(c.id);
      map.set(c.id, {
        ...existing,
        ...c,
        summary: c.customName || c.summary || existing?.summary || c.id,
      });
    });
  }

  // 4. Ensure active configured calendar exists in the list (unless deleted)
  if (activeConfig?.calendarId && !deletedSet.has(activeConfig.calendarId)) {
    const existing = map.get(activeConfig.calendarId);
    if (existing) {
      if (activeConfig.calendarName) {
        existing.customName = activeConfig.calendarName;
        existing.summary = activeConfig.calendarName;
      }
    } else {
      map.set(activeConfig.calendarId, {
        id: activeConfig.calendarId,
        summary:
          activeConfig.calendarName ||
          (activeConfig.calendarId === 'primary' ? 'Magnar Totland (Primær)' : activeConfig.calendarId),
        customName: activeConfig.calendarName,
        description: `Integrert kalender (${
          activeConfig.calendarId.length > 25
            ? activeConfig.calendarId.substring(0, 22) + '...'
            : activeConfig.calendarId
        })`,
        backgroundColor: '#0284c7',
        isCustom: activeConfig.calendarId !== 'primary',
        enabledForDisplay: true,
      });
    }
  }

  // 5. Apply disabledCalendarIds, carCalendarIds, and privacyModes
  const disabledSet = new Set(disabledIds || []);
  const carCalendarSet = new Set(carCalendarIds || (activeConfig?.calendarId ? [activeConfig.calendarId] : []));

  const result = Array.from(map.values())
    .filter((cal) => !deletedSet.has(cal.id))
    .map((cal) => {
      const isCar = carCalendarSet.has(cal.id) || (activeConfig?.calendarId === cal.id);
      const privacy = privacyModes?.[cal.id] || cal.privacyMode || 'full';
      return {
        ...cal,
        isCarCalendar: isCar,
        privacyMode: privacy,
        enabledForDisplay:
          cal.enabledForDisplay !== undefined
            ? disabledSet.has(cal.id)
              ? false
              : cal.enabledForDisplay
            : !disabledSet.has(cal.id),
      };
    });

  return result;
};

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentWeek = getWeekNumber(getPointsWeekStart());
  const currentYear = new Date().getFullYear();

  // Load from localStorage or defaults
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeMemberId, setActiveMemberId] = useState<string>('member_marcus');
  const [members, setMembers] = useState<FamilyMember[]>(initialFamilyMembers);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [reservations, setReservations] = useState<CarReservation[]>(initialReservations);
  const [calendarConnections, setCalendarConnections] = useState<CalendarConnection[]>(initialCalendarConnections);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialCalendarEvents);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>(initialTaskTemplates);
  const [taskInstances, setTaskInstances] = useState<TaskInstance[]>(initialTaskInstances);
  const [settings, setSettings] = useState<FamilySettings>(initialSettings);
  const [weeklyPointsRecords, setWeeklyPointsRecords] = useState<MemberWeeklyPointsRecord[]>([]);

  // Firebase Auth & Firestore state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isFirebaseAuthReady, setIsFirebaseAuthReady] = useState(false);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);
  const [isFirestoreSyncing, setIsFirestoreSyncing] = useState(false);

  // Google Calendar 2-Way Sync state
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('gcal_access_token') || null;
  });
  const [isTwoWaySyncing, setIsTwoWaySyncing] = useState(false);
  const [lastGoogleSyncTime, setLastGoogleSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('gcal_last_synced') || null;
  });
  const [googleSyncStatusMessage, setGoogleSyncStatusMessage] = useState<string | null>(null);
  const [availableGoogleCalendars, setAvailableGoogleCalendars] = useState<GoogleCalendarItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return mergeCalendarsList(
          [],
          parsed.settings?.savedCalendars,
          parsed.settings?.googleCalendarConfig,
          parsed.settings?.disableMockData,
          parsed.settings?.disabledCalendarIds,
          parsed.settings?.deletedCalendarIds,
          parsed.settings?.carCalendarIds,
          parsed.settings?.calendarPrivacyModes
        );
      }
    } catch {
      // ignore
    }
    return SAMPLE_GOOGLE_CALENDARS;
  });
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);

  const isGoogleConnected = Boolean(googleAccessToken) || calendarConnections.some((c) => c.isConnected);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const isMockEv = (e: CalendarEvent) => e.id === 'cal_ev_1' || e.id === 'cal_ev_2' || e.id.startsWith('mock_') || (e as any).isMock;
        const isMockRes = (r: CarReservation) => r.id === 'res_auto_1' || r.id.startsWith('mock_') || (r as any).isMock;

        if (parsed.members) setMembers(parsed.members);
        if (parsed.vehicles) setVehicles(parsed.vehicles);
        if (parsed.reservations) {
          setReservations(parsed.settings?.disableMockData ? parsed.reservations.filter((r: CarReservation) => !isMockRes(r)) : parsed.reservations);
        }
        if (parsed.calendarConnections) setCalendarConnections(parsed.calendarConnections);
        if (parsed.calendarEvents) {
          setCalendarEvents(parsed.settings?.disableMockData ? parsed.calendarEvents.filter((e: CalendarEvent) => !isMockEv(e)) : parsed.calendarEvents);
        }
        if (parsed.taskTemplates) setTaskTemplates(migrateTaskTemplates(parsed.taskTemplates));
        if (parsed.taskInstances) setTaskInstances(parsed.taskInstances);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.weeklyPointsRecords) setWeeklyPointsRecords(parsed.weeklyPointsRecords);
        if (parsed.activeMemberId) setActiveMemberId(parsed.activeMemberId);
      }
    } catch (e) {
      console.error('Failed to load local storage state', e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when state updates
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const stateToSave = {
        activeMemberId,
        members,
        vehicles,
        reservations,
        calendarConnections,
        calendarEvents,
        taskTemplates,
        taskInstances,
        settings,
        weeklyPointsRecords,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }, [
    isLoaded,
    activeMemberId,
    members,
    vehicles,
    reservations,
    calendarConnections,
    calendarEvents,
    taskTemplates,
    taskInstances,
    settings,
    weeklyPointsRecords,
  ]);

  // Finaliser avsluttede poenguker og lagre historikk
  useEffect(() => {
    if (!isLoaded) return;

    const weeksToFinalize = getWeeksToFinalize(settings.lastFinalizedPointsWeekKey);
    if (weeksToFinalize.length === 0) return;

    const existingIds = new Set(weeklyPointsRecords.map((r) => r.id));
    const toAdd: MemberWeeklyPointsRecord[] = [];

    for (const weekStart of weeksToFinalize) {
      for (const member of members) {
        const record = buildWeeklyPointsRecord(member, taskInstances, weekStart);
        if (!existingIds.has(record.id)) {
          toAdd.push(record);
        }
      }
    }

    const latestKey = formatLocalDateKey(weeksToFinalize[weeksToFinalize.length - 1]);

    if (toAdd.length > 0) {
      setWeeklyPointsRecords((prev) => {
        const merged = [...prev];
        for (const record of toAdd) {
          if (!merged.some((r) => r.id === record.id)) {
            merged.push(record);
          }
        }
        return merged;
      });
      toAdd.forEach((r) => {
        if (firebaseUser) {
          saveWeeklyPointsRecordToFirestore(r).catch(console.error);
        }
      });
    }

    if (settings.lastFinalizedPointsWeekKey !== latestKey) {
      setSettings((prev) => {
        const updated = { ...prev, lastFinalizedPointsWeekKey: latestKey };
        if (firebaseUser) {
          saveSettingsToFirestore(updated).catch(console.error);
        }
        return updated;
      });
    }
  }, [isLoaded, members, taskInstances, settings.lastFinalizedPointsWeekKey, firebaseUser]);

  // Firebase Auth Listener & Firestore Real-Time Sync
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setIsFirebaseAuthReady(true);

      // Clean up previous Firestore listeners if any
      unsubs.forEach((u) => u());
      unsubs = [];

      if (user) {
        setIsFirestoreSyncing(true);
        console.log('Firebase Auth user active:', user.email);

        try {
          // Attempt seeding initial family dataset if collections in Firestore are empty
          await seedInitialDataIfEmpty({
            members,
            vehicles,
            reservations,
            calendarEvents,
            taskTemplates,
            taskInstances,
            settings,
          });

          // Subscribe to live Firestore changes across all clients
          const uMembers = subscribeMembers((cloudMembers) => {
            if (cloudMembers && cloudMembers.length > 0) {
              setMembers(cloudMembers);
              setIsFirestoreConnected(true);
            }
          });
          unsubs.push(uMembers);

          const uVehicles = subscribeVehicles((cloudVehicles) => {
            if (cloudVehicles && cloudVehicles.length > 0) {
              setVehicles(cloudVehicles);
            }
          });
          unsubs.push(uVehicles);

          const uReservations = subscribeReservations((cloudRes) => {
            if (cloudRes) {
              setReservations(cloudRes);
            }
          });
          unsubs.push(uReservations);

          const uCalendar = subscribeCalendarEvents((cloudCal) => {
            if (cloudCal) {
              setCalendarEvents(cloudCal);
            }
          });
          unsubs.push(uCalendar);

          const uTaskTemplates = subscribeTaskTemplates((cloudTmpl) => {
            if (cloudTmpl && cloudTmpl.length > 0) {
              setTaskTemplates(migrateTaskTemplates(cloudTmpl));
            }
          });
          unsubs.push(uTaskTemplates);

          const uTaskInstances = subscribeTaskInstances((cloudInst) => {
            if (cloudInst && cloudInst.length > 0) {
              setTaskInstances(cloudInst);
            }
          });
          unsubs.push(uTaskInstances);

          const uSettings = subscribeSettings((cloudSettings) => {
            if (cloudSettings) {
              setSettings(cloudSettings);
            }
          });
          unsubs.push(uSettings);

          const uWeeklyPoints = subscribeWeeklyPoints((cloudRecords) => {
            if (cloudRecords && cloudRecords.length > 0) {
              setWeeklyPointsRecords(cloudRecords);
            }
          });
          unsubs.push(uWeeklyPoints);

          setIsFirestoreConnected(true);
        } catch (syncErr) {
          console.warn('Firestore initial sync note:', syncErr);
        } finally {
          setIsFirestoreSyncing(false);
        }
      } else {
        setIsFirestoreConnected(false);
        setIsFirestoreSyncing(false);
      }
    });

    return () => {
      authUnsubscribe();
      unsubs.forEach((u) => u());
    };
  }, []);

  const signInWithFirebaseGoogle = async () => {
    try {
      setIsFirestoreSyncing(true);
      await signInWithGoogle();
    } catch (err) {
      console.error('Firebase Google sign-in failed:', err);
    } finally {
      setIsFirestoreSyncing(false);
    }
  };

  const signOutFirebaseUser = async () => {
    try {
      await logoutFirebase();
      setIsFirestoreConnected(false);
    } catch (err) {
      console.error('Firebase sign-out failed:', err);
    }
  };

  const pushAllToFirestore = async () => {
    if (!firebaseUser) return;
    try {
      setIsFirestoreSyncing(true);
      // Save all members
      for (const m of members) {
        await saveMemberToFirestore(m);
      }
      // Save all vehicles
      for (const v of vehicles) {
        await saveVehicleToFirestore(v);
      }
      // Save all reservations
      for (const r of reservations) {
        await saveReservationToFirestore(r);
      }
      // Save all calendar events
      for (const c of calendarEvents) {
        await saveCalendarEventToFirestore(c);
      }
      // Save all templates
      for (const t of taskTemplates) {
        await saveTaskTemplateToFirestore(t);
      }
      // Save all task instances
      for (const inst of taskInstances) {
        await saveTaskInstanceToFirestore(inst);
      }
      // Save settings
      await saveSettingsToFirestore(settings);
      // Save weekly points history
      for (const record of weeklyPointsRecords) {
        await saveWeeklyPointsRecordToFirestore(record);
      }
      setIsFirestoreConnected(true);
    } catch (err) {
      console.error('Push to Firestore failed:', err);
    } finally {
      setIsFirestoreSyncing(false);
    }
  };

  const [activeVehicleId, setActiveVehicleId] = useState<string>(() => initialVehicles[0].id);


  const activeMember = members.find((m) => m.id === activeMemberId) || members[0] || initialFamilyMembers[0];
  const activeVehicle = vehicles.find((v) => v.id === activeVehicleId) || vehicles[0] || initialVehicles[0];

  // House Areas Management
  const areas = settings.areas || initialSettings.areas;

  const addArea = (areaData: Omit<HouseArea, 'id'>) => {
    const newArea: HouseArea = {
      ...areaData,
      id: 'area_' + Date.now().toString(36),
    };
    setSettings((prev) => ({
      ...prev,
      areas: [...(prev.areas || []), newArea],
    }));
  };

  const updateArea = (id: string, updates: Partial<HouseArea>) => {
    setSettings((prev) => ({
      ...prev,
      areas: (prev.areas || []).map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
  };

  const deleteArea = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      areas: (prev.areas || []).filter((a) => a.id !== id),
    }));
  };

  const addRoomToArea = (areaId: string, roomName: string) => {
    if (!roomName.trim()) return;
    setSettings((prev) => ({
      ...prev,
      areas: (prev.areas || []).map((a) =>
        a.id === areaId && !a.rooms.includes(roomName.trim())
          ? { ...a, rooms: [...a.rooms, roomName.trim()] }
          : a
      ),
    }));
  };

  const removeRoomFromArea = (areaId: string, roomName: string) => {
    setSettings((prev) => ({
      ...prev,
      areas: (prev.areas || []).map((a) =>
        a.id === areaId ? { ...a, rooms: a.rooms.filter((r) => r !== roomName) } : a
      ),
    }));
  };

  // Car & Calendar Rules
  const updateCarRules = (rules: Partial<CarRuleConfig>) => {
    setSettings((prev) => ({
      ...prev,
      carRules: { ...(prev.carRules || initialSettings.carRules), ...rules },
    }));
  };

  const updateCalendarRules = (rules: Partial<CalendarRuleConfig>) => {
    setSettings((prev) => ({
      ...prev,
      calendarRules: { ...(prev.calendarRules || initialSettings.calendarRules), ...rules },
    }));
  };

  const updateLocationOverride = (locationName: string, minutes: number) => {
    setSettings((prev) => ({
      ...prev,
      locationTravelTimeOverrides: {
        ...(prev.locationTravelTimeOverrides || {}),
        [locationName.trim()]: minutes,
      },
    }));
  };

  const deleteLocationOverride = (locationName: string) => {
    setSettings((prev) => {
      const copy = { ...(prev.locationTravelTimeOverrides || {}) };
      delete copy[locationName];
      return {
        ...prev,
        locationTravelTimeOverrides: copy,
      };
    });
  };

  // Delete vehicle
  const deleteVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    if (activeVehicleId === id && vehicles.length > 1) {
      setActiveVehicleId(vehicles.find((v) => v.id !== id)?.id || vehicles[0].id);
    }
    if (firebaseUser) {
      deleteVehicleFromFirestore(id).catch(console.error);
    }
  };


  // Car Availability & Conflicts
  const checkCarAvailability = (
    startTime: string,
    endTime: string,
    vehicleId?: string,
    ignoreReservationId?: string
  ) => {
    const targetVehicleId = vehicleId || activeVehicle.id;
    const vehicleRes = reservations.filter((r) => r.vehicleId === targetVehicleId);
    const conflicts = findConflictingReservations(startTime, endTime, vehicleRes, ignoreReservationId);
    return {
      isAvailable: conflicts.length === 0,
      conflicts,
    };
  };

  const createCarReservation = (
    reservationData: Omit<CarReservation, 'id' | 'createdAt'>
  ) => {
    const { isAvailable, conflicts } = checkCarAvailability(
      reservationData.startTime,
      reservationData.endTime,
      reservationData.vehicleId
    );

    const newReservation: CarReservation = {
      ...reservationData,
      id: 'res_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      status: isAvailable ? 'confirmed' : 'pending_conflict',
    };

    setReservations((prev) => [newReservation, ...prev]);

    if (firebaseUser) {
      saveReservationToFirestore(newReservation).catch(console.error);
    }

    return {
      success: isAvailable,
      conflicts,
      reservation: newReservation,
    };
  };

  const cancelReservation = (id: string) => {
    setReservations((prev) => prev.filter((r) => r.id !== id));
    if (firebaseUser) {
      deleteReservationFromFirestore(id).catch(console.error);
    }
  };

  // Calendar Events & Auto Car Reservations
  const addCalendarEvent = async (eventData: Omit<CalendarEvent, 'id'>) => {
    const eventId = 'cal_ev_' + Date.now();
    let reservation: CarReservation | undefined;
    let googleEventId: string | undefined = eventData.googleEventId;
    let htmlLink: string | undefined = eventData.htmlLink;
    let isSyncedWithGoogle = eventData.isSyncedWithGoogle || false;

    // Check if auto car reservation is requested or default for work events
    if (eventData.createsCarReservation) {
      const bufferBefore = eventData.bufferBeforeMinutes ?? settings.defaultTravelBufferBefore;
      const bufferAfter = eventData.bufferAfterMinutes ?? settings.defaultTravelBufferAfter;

      const { reservationStart, reservationEnd } = calculateBufferedTime(
        eventData.startTime,
        eventData.endTime,
        bufferBefore,
        bufferAfter
      );

      const resResult = createCarReservation({
        vehicleId: activeVehicle.id,
        memberId: eventData.memberId,
        memberName: eventData.memberName,
        startTime: reservationStart,
        endTime: reservationEnd,
        purpose: `${eventData.isWorkRelated ? 'Jobb: ' : ''}${eventData.title}${
          eventData.location ? ` (${eventData.location})` : ''
        } (inkl. ${bufferBefore}m reise før / ${bufferAfter}m etter)`,
        isWorkRelated: eventData.isWorkRelated,
        source: 'google_calendar',
        calendarEventId: eventId,
        status: 'confirmed',
        location: eventData.location,
        bufferBeforeMinutes: bufferBefore,
        bufferAfterMinutes: bufferAfter,
      });

      reservation = resResult.reservation;
    }

    // Google Calendar is read-only: Events created in the app are saved locally and in Firestore,
    // and NEVER pushed to the user's external Google Calendar.
    const targetCalendarId = settings.googleCalendarConfig?.calendarId || 'primary';

    const newEvent: CalendarEvent = {
      ...eventData,
      id: eventId,
      vehicleReservationId: reservation?.id,
      googleEventId,
      googleCalendarId: targetCalendarId,
      htmlLink,
      isSyncedWithGoogle,
      lastSyncedAt: isSyncedWithGoogle ? new Date().toISOString() : undefined,
    };

    setCalendarEvents((prev) => [...prev, newEvent]);
    if (firebaseUser) {
      saveCalendarEventToFirestore(newEvent).catch(console.error);
    }
    return { event: newEvent, reservation };
  };

  const deleteCalendarEvent = async (id: string) => {
    const ev = calendarEvents.find((e) => e.id === id);
    if (ev?.vehicleReservationId) {
      cancelReservation(ev.vehicleReservationId);
    }

    if (firebaseUser) {
      deleteCalendarEventFromFirestore(id).catch(console.error);
    }

    // Google Calendar is read-only: Sletting i appen rører ALDRI din eksterne Google Kalender
    setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const refreshGoogleCalendars = async (): Promise<GoogleCalendarItem[]> => {
    setIsLoadingCalendars(true);
    try {
      const token = googleAccessToken || localStorage.getItem('gcal_access_token') || undefined;
      const calendars = await fetchUserGoogleCalendars(token, !settings.disableMockData);
      const merged = mergeCalendarsList(
        calendars,
        settings.savedCalendars,
        settings.googleCalendarConfig,
        settings.disableMockData,
        settings.disabledCalendarIds,
        settings.deletedCalendarIds,
        settings.carCalendarIds,
        settings.calendarPrivacyModes
      );
      setAvailableGoogleCalendars(merged);
      setIsLoadingCalendars(false);
      return merged;
    } catch (e) {
      console.warn('Feil ved henting av Google-kalendere:', e);
      setIsLoadingCalendars(false);
      return availableGoogleCalendars;
    }
  };

  const isMockEvent = (e: CalendarEvent) => {
    return (
      e.id === 'cal_ev_1' ||
      e.id === 'cal_ev_2' ||
      e.id.startsWith('mock_') ||
      e.id.startsWith('sample_') ||
      (e as any).isMock ||
      SAMPLE_GOOGLE_CALENDARS.some((s) => s.id === e.calendarId || s.id === e.googleCalendarId)
    );
  };

  const isMockReservation = (r: CarReservation) => {
    return (
      r.id === 'res_auto_1' ||
      r.id.startsWith('mock_') ||
      r.id.startsWith('sample_') ||
      (r as any).isMock
    );
  };

  const addCustomGoogleCalendar = async (id: string, name: string, color?: string): Promise<void> => {
    const rawInput = id.trim();
    if (!rawInput) return;

    const cleanId = sanitizeGoogleCalendarId(rawInput) || rawInput;
    const isUrl = rawInput.startsWith('http://') || rawInput.startsWith('https://') || rawInput.includes('.ics');
    const trimmedName = name.trim() || cleanId;

    const newCal: GoogleCalendarItem = {
      id: cleanId,
      icalUrl: isUrl ? rawInput : undefined,
      summary: trimmedName,
      customName: trimmedName,
      description: `Tilpasset kalender (${cleanId})`,
      backgroundColor: color || '#0284c7',
      isCustom: true,
      enabledForDisplay: true,
      carMode: 'all',
      targetVehicleId: activeVehicle.id,
    };

    const currentConfigs = { ...(settings.calendarConfigs || {}) };
    if (!currentConfigs[cleanId]) {
      currentConfigs[cleanId] = {
        calendarId: cleanId,
        icalUrl: isUrl ? rawInput : undefined,
        customName: trimmedName,
        privacyMode: 'full',
        carMode: 'all',
        bufferBeforeMinutes: settings.defaultTravelBufferBefore ?? 40,
        bufferAfterMinutes: settings.defaultTravelBufferAfter ?? 40,
        targetVehicleId: activeVehicle.id,
        enabledForDisplay: true,
      };
    }

    setAvailableGoogleCalendars((prev) => {
      const filtered = prev.filter((c) => c.id !== cleanId && c.id !== rawInput);
      return [...filtered, newCal];
    });

    const saved = settings.savedCalendars || [];
    const updatedSaved = [...saved.filter((c) => c.id !== cleanId && c.id !== rawInput), newCal];
    const newSettings: FamilySettings = {
      ...settings,
      savedCalendars: updatedSaved,
      calendarConfigs: currentConfigs,
    };
    setSettings(newSettings);

    if (firebaseUser) {
      await saveSettingsToFirestore(newSettings).catch(console.error);
    }
  };

  const updateGoogleCalendarName = async (id: string, newName: string): Promise<void> => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setAvailableGoogleCalendars((prev) =>
      prev.map((c) => (c.id === id ? { ...c, summary: trimmed, customName: trimmed } : c))
    );

    const saved = settings.savedCalendars || [];
    const exists = saved.some((c) => c.id === id);
    const calObj = availableGoogleCalendars.find((c) => c.id === id);
    const updatedSaved = exists
      ? saved.map((c) => (c.id === id ? { ...c, summary: trimmed, customName: trimmed } : c))
      : calObj
      ? [...saved, { ...calObj, summary: trimmed, customName: trimmed }]
      : saved;

    const newSettings: FamilySettings = {
      ...settings,
      savedCalendars: updatedSaved,
      googleCalendarConfig:
        settings.googleCalendarConfig?.calendarId === id
          ? { ...settings.googleCalendarConfig, calendarName: trimmed }
          : settings.googleCalendarConfig,
    };
    setSettings(newSettings);

    if (firebaseUser) {
      await saveSettingsToFirestore(newSettings).catch(console.error);
    }
  };

  const toggleCalendarViewVisibility = async (id: string, visible: boolean): Promise<void> => {
    setAvailableGoogleCalendars((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabledForDisplay: visible } : c))
    );

    const viewHidden = new Set(settings.calendarViewHiddenIds || []);
    if (visible) {
      viewHidden.delete(id);
    } else {
      viewHidden.add(id);
    }

    const saved = settings.savedCalendars || [];
    const calObj = availableGoogleCalendars.find((c) => c.id === id);
    const exists = saved.some((c) => c.id === id);
    const updatedSaved = exists
      ? saved.map((c) => (c.id === id ? { ...c, enabledForDisplay: visible } : c))
      : calObj
      ? [...saved, { ...calObj, enabledForDisplay: visible }]
      : saved;

    const currentCalendarConfigs = { ...(settings.calendarConfigs || {}) };
    if (currentCalendarConfigs[id]) {
      currentCalendarConfigs[id] = {
        ...currentCalendarConfigs[id],
        enabledForDisplay: visible,
      };
    }

    const newSettings: FamilySettings = {
      ...settings,
      calendarViewHiddenIds: Array.from(viewHidden),
      savedCalendars: updatedSaved,
      calendarConfigs: currentCalendarConfigs,
    };
    setSettings(newSettings);

    if (firebaseUser) {
      await saveSettingsToFirestore(newSettings).catch(console.error);
    }
  };

  const toggleCalendarDisabled = async (id: string, active: boolean): Promise<void> => {
    const currentDisabled = new Set(settings.disabledCalendarIds || []);
    if (active) {
      currentDisabled.delete(id);
    } else {
      currentDisabled.add(id);
    }

    const saved = settings.savedCalendars || [];
    const calObj = availableGoogleCalendars.find((c) => c.id === id);
    const exists = saved.some((c) => c.id === id);
    const updatedSaved = exists
      ? saved.map((c) => (c.id === id ? { ...c } : c))
      : calObj
      ? [...saved, { ...calObj }]
      : saved;

    const newSettings: FamilySettings = {
      ...settings,
      disabledCalendarIds: Array.from(currentDisabled),
      savedCalendars: updatedSaved,
    };
    setSettings(newSettings);

    if (firebaseUser) {
      await saveSettingsToFirestore(newSettings).catch(console.error);
    }
  };

  const toggleCarCalendar = async (id: string): Promise<void> => {
    const currentCarIds = new Set(settings.carCalendarIds || (settings.googleCalendarConfig?.calendarId ? [settings.googleCalendarConfig.calendarId] : ['primary']));
    const isNowCar = !currentCarIds.has(id);
    if (isNowCar) {
      currentCarIds.add(id);
    } else {
      currentCarIds.delete(id);
    }
    const updatedCarIds = Array.from(currentCarIds);

    setAvailableGoogleCalendars((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isCarCalendar: isNowCar } : c))
    );

    const newSettings: FamilySettings = {
      ...settings,
      carCalendarIds: updatedCarIds,
    };
    setSettings(newSettings);

    if (firebaseUser) {
      await saveSettingsToFirestore(newSettings).catch(console.error);
    }
  };

  const setCalendarPrivacyMode = async (id: string, mode: 'full' | 'busy_only'): Promise<void> => {
    const currentModes = { ...(settings.calendarPrivacyModes || {}) };
    currentModes[id] = mode;

    setAvailableGoogleCalendars((prev) =>
      prev.map((c) => (c.id === id ? { ...c, privacyMode: mode } : c))
    );

    // Update existing calendar events from this calendar
    setCalendarEvents((prev) =>
      prev.map((ev) => {
        if (ev.calendarId === id || ev.googleCalendarId === id) {
          return {
            ...ev,
            isConfidential: mode === 'busy_only',
            privacyMode: mode,
          };
        }
        return ev;
      })
    );

    // Update reservations linked to events from this calendar
    setReservations((prev) =>
      prev.map((res) => {
        const matchingEv = calendarEvents.find((e) => e.vehicleReservationId === res.id || e.id === res.calendarEventId);
        if (matchingEv && (matchingEv.calendarId === id || matchingEv.googleCalendarId === id)) {
          return {
            ...res,
            isConfidential: mode === 'busy_only',
            purpose: mode === 'busy_only' ? `Opptatt: Kalenderavtale [${res.bufferBeforeMinutes || 40}m buffer]` : res.purpose,
            location: mode === 'busy_only' ? undefined : res.location,
          };
        }
        return res;
      })
    );

    const newSettings: FamilySettings = {
      ...settings,
      calendarPrivacyModes: currentModes,
    };
    setSettings(newSettings);

    if (firebaseUser) {
      await saveSettingsToFirestore(newSettings).catch(console.error);
    }
  };

  const updateCalendarSettings = async (
    id: string,
    updates: Partial<PerCalendarConfig>,
    newCalendarId?: string
  ): Promise<void> => {
    const targetId = (newCalendarId || updates.calendarId || id).trim();
    const currentCalendarConfigs = { ...(settings.calendarConfigs || {}) };
    const existingConfig: PerCalendarConfig = currentCalendarConfigs[id] || {
      calendarId: id,
      privacyMode: (settings.calendarPrivacyModes?.[id] as any) || 'full',
      carMode: settings.carCalendarIds?.includes(id) ? 'all' : 'none',
      bufferBeforeMinutes: settings.defaultTravelBufferBefore || 40,
      bufferAfterMinutes: settings.defaultTravelBufferAfter || 40,
      assignedMemberId: undefined,
      enabledForDisplay:
        !(settings.calendarViewHiddenIds || []).includes(id) &&
        !(settings.disabledCalendarIds || []).includes(id),
    };

    const updatedConfig: PerCalendarConfig = {
      ...existingConfig,
      ...updates,
      calendarId: targetId,
    };

    if (targetId !== id) {
      delete currentCalendarConfigs[id];
    }
    currentCalendarConfigs[targetId] = updatedConfig;

    // Backwards compatibility mappings
    const currentCarIds = new Set(settings.carCalendarIds || []);
    if (updatedConfig.carMode === 'none') {
      currentCarIds.delete(id);
      currentCarIds.delete(targetId);
    } else {
      currentCarIds.delete(id);
      currentCarIds.add(targetId);
    }

    const currentPrivacyModes = { ...(settings.calendarPrivacyModes || {}) };
    if (targetId !== id) {
      delete currentPrivacyModes[id];
    }
    currentPrivacyModes[targetId] = updatedConfig.privacyMode;

    const viewHidden = new Set(settings.calendarViewHiddenIds || []);
    if (updatedConfig.enabledForDisplay === false) {
      viewHidden.delete(id);
      viewHidden.add(targetId);
    } else {
      viewHidden.delete(id);
      viewHidden.delete(targetId);
    }

    const targetVehicle =
      updatedConfig.targetVehicleId ||
      activeVehicleId ||
      vehicles[0]?.id ||
      'car_id4';
    const bufferBefore =
      updatedConfig.bufferBeforeMinutes ?? settings.defaultTravelBufferBefore ?? 40;
    const bufferAfter =
      updatedConfig.bufferAfterMinutes ?? settings.defaultTravelBufferAfter ?? 40;
    const assignedMember = members.find((m) => m.id === updatedConfig.assignedMemberId);

    // 1. Update availableGoogleCalendars in state & savedCalendars
    setAvailableGoogleCalendars((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            id: targetId,
            icalUrl: updatedConfig.icalUrl || c.icalUrl,
            customName: updatedConfig.customName || c.customName || c.summary,
            summary: updatedConfig.customName || c.summary,
            privacyMode: updatedConfig.privacyMode,
            isCarCalendar: updatedConfig.carMode !== 'none',
            carMode: updatedConfig.carMode,
            targetVehicleId: targetVehicle,
            assignedMemberId: updatedConfig.assignedMemberId,
            bufferBeforeMinutes: bufferBefore,
            bufferAfterMinutes: bufferAfter,
            enabledForDisplay: updatedConfig.enabledForDisplay !== false,
          };
        }
        return c;
      })
    );

    const saved = settings.savedCalendars || [];
    const calInSaved = saved.some((c) => c.id === id);
    const existingCal = availableGoogleCalendars.find((c) => c.id === id);
    const updatedSaved = calInSaved
      ? saved.map((c) =>
          c.id === id
            ? {
                ...c,
                id: targetId,
                icalUrl: updatedConfig.icalUrl || c.icalUrl,
                customName: updatedConfig.customName || c.customName || c.summary,
                summary: updatedConfig.customName || c.summary,
                privacyMode: updatedConfig.privacyMode,
                isCarCalendar: updatedConfig.carMode !== 'none',
                carMode: updatedConfig.carMode,
                targetVehicleId: targetVehicle,
                assignedMemberId: updatedConfig.assignedMemberId,
                bufferBeforeMinutes: bufferBefore,
                bufferAfterMinutes: bufferAfter,
                enabledForDisplay: updatedConfig.enabledForDisplay !== false,
                excludedKeywords: updatedConfig.excludedKeywords,
                activityOverrides: updatedConfig.activityOverrides,
              }
            : c
        )
      : existingCal
      ? [
          ...saved.filter((c) => c.id !== targetId),
          {
            ...existingCal,
            id: targetId,
            icalUrl: updatedConfig.icalUrl || existingCal.icalUrl,
            customName: updatedConfig.customName || existingCal.customName || existingCal.summary,
            summary: updatedConfig.customName || existingCal.summary,
            privacyMode: updatedConfig.privacyMode,
            isCarCalendar: updatedConfig.carMode !== 'none',
            carMode: updatedConfig.carMode,
            targetVehicleId: targetVehicle,
            assignedMemberId: updatedConfig.assignedMemberId,
            bufferBeforeMinutes: bufferBefore,
            bufferAfterMinutes: bufferAfter,
            enabledForDisplay: updatedConfig.enabledForDisplay !== false,
            excludedKeywords: updatedConfig.excludedKeywords,
            activityOverrides: updatedConfig.activityOverrides,
          },
        ]
      : saved;

    // 2. Immediate Re-calculation of all calendarEvents and reservations for this calendar!
    const updatedEvents: CalendarEvent[] = [];
    const eventIdsToRemoveReservations = new Set<string>();
    const reservationsToUpsert: CarReservation[] = [];

    calendarEvents.forEach((ev) => {
      if (ev.calendarId === id || ev.googleCalendarId === id || ev.calendarId === targetId || ev.googleCalendarId === targetId) {
        const isConfidential = updatedConfig.privacyMode === 'busy_only';
        const isWork = isLikelyWorkTrip(ev.title, ev.location);

        const evalResult = evaluateCalendarEventCarReservation({
          title: ev.title,
          location: ev.location,
          calendarConfig: updatedConfig,
          defaultCarMode: 'work_only',
          defaultVehicleId: targetVehicle,
          defaultBufferBefore: bufferBefore,
          defaultBufferAfter: bufferAfter,
          isCarCalendarFallback: updatedConfig.carMode !== 'none',
        });

        const shouldCreateCar = evalResult.shouldCreateCar;
        const effectiveBufferBefore = evalResult.bufferBefore;
        const effectiveBufferAfter = evalResult.bufferAfter;
        const effectiveVehicle = evalResult.targetVehicleId || targetVehicle;

        const memberId = updatedConfig.assignedMemberId || ev.memberId;
        const memberName = assignedMember?.name || ev.memberName;

        const { reservationStart, reservationEnd } = calculateBufferedTime(
          ev.startTime,
          ev.endTime,
          effectiveBufferBefore,
          effectiveBufferAfter
        );

        let reservationId = ev.vehicleReservationId;

        if (shouldCreateCar) {
          if (!reservationId) {
            reservationId = `res_cal_${ev.id}_${Date.now()}`;
          }
          const res: CarReservation = {
            id: reservationId,
            vehicleId: effectiveVehicle,
            memberId,
            memberName,
            startTime: reservationStart,
            endTime: reservationEnd,
            purpose: isConfidential
              ? `Opptatt: Kalenderavtale [${effectiveBufferBefore}m buffer]`
              : `${isWork ? 'Jobb: ' : 'Avtale: '}${ev.title}${
                  ev.location ? ` (${ev.location})` : ''
                } [${effectiveBufferBefore}m buffer]`,
            isWorkRelated: isWork,
            source: 'google_calendar',
            calendarEventId: ev.id,
            status: 'confirmed',
            location: isConfidential ? undefined : ev.location,
            bufferBeforeMinutes: effectiveBufferBefore,
            bufferAfterMinutes: effectiveBufferAfter,
            isConfidential,
            createdAt: ev.lastSyncedAt || new Date().toISOString(),
          };
          reservationsToUpsert.push(res);
        } else {
          if (ev.vehicleReservationId) {
            eventIdsToRemoveReservations.add(ev.id);
            eventIdsToRemoveReservations.add(ev.vehicleReservationId);
          }
          reservationId = undefined;
        }

        updatedEvents.push({
          ...ev,
          calendarId: targetId,
          googleCalendarId: targetId,
          memberId,
          memberName,
          isConfidential,
          privacyMode: updatedConfig.privacyMode,
          createsCarReservation: shouldCreateCar,
          vehicleReservationId: reservationId,
          bufferBeforeMinutes: effectiveBufferBefore,
          bufferAfterMinutes: effectiveBufferAfter,
        });
      } else {
        updatedEvents.push(ev);
      }
    });

    setCalendarEvents(updatedEvents);
    if (firebaseUser) {
      updatedEvents
        .filter((e) => e.calendarId === targetId || e.googleCalendarId === targetId || e.calendarId === id || e.googleCalendarId === id)
        .forEach((e) => {
          saveCalendarEventToFirestore(e).catch(console.error);
        });
    }

    setReservations((prev) => {
      const remaining = prev.filter((r) => {
        if (r.calendarEventId && eventIdsToRemoveReservations.has(r.calendarEventId)) return false;
        if (eventIdsToRemoveReservations.has(r.id)) return false;
        if (
          r.calendarEventId &&
          reservationsToUpsert.some((u) => u.calendarEventId === r.calendarEventId)
        ) {
          return false;
        }
        return true;
      });
      return [...remaining, ...reservationsToUpsert];
    });

    if (firebaseUser) {
      reservationsToUpsert.forEach((r) => {
        saveReservationToFirestore(r).catch(console.error);
      });
    }

    const newSettings: FamilySettings = {
      ...settings,
      calendarConfigs: currentCalendarConfigs,
      carCalendarIds: Array.from(currentCarIds),
      calendarPrivacyModes: currentPrivacyModes,
      calendarViewHiddenIds: Array.from(viewHidden),
      savedCalendars: updatedSaved,
      googleCalendarConfig:
        settings.googleCalendarConfig?.calendarId === id
          ? { ...settings.googleCalendarConfig, calendarId: targetId }
          : settings.googleCalendarConfig,
    };
    setSettings(newSettings);

    if (firebaseUser) {
      await saveSettingsToFirestore(newSettings).catch(console.error);
    }
  };

  const removeCustomGoogleCalendar = async (id: string): Promise<void> => {
    // 1. Remove from in-memory available calendars
    setAvailableGoogleCalendars((prev) => prev.filter((c) => c.id !== id));

    // 2. Remove saved calendar
    const saved = settings.savedCalendars || [];
    const updatedSaved = saved.filter((c) => c.id !== id);

    // 3. Add to persistent deletedCalendarIds list
    const deletedSet = new Set(settings.deletedCalendarIds || []);
    deletedSet.add(id);

    // 4. Remove from carCalendarIds if present
    const carSet = new Set(settings.carCalendarIds || []);
    carSet.delete(id);

    // 5. Clean up calendarPrivacyModes
    const privacyModes = { ...(settings.calendarPrivacyModes || {}) };
    delete privacyModes[id];

    // 6. Update googleCalendarConfig if this was the primary selected calendar
    let updatedConfig = settings.googleCalendarConfig;
    if (updatedConfig?.calendarId === id) {
      updatedConfig = {
        ...updatedConfig,
        calendarId: 'primary',
        calendarName: 'Magnar Totland (Primær)',
      };
    }

    // 7. Remove local events and linked reservations for this deleted calendar
    const deletedEventIds = new Set(
      calendarEvents
        .filter((e) => e.calendarId === id || e.googleCalendarId === id)
        .map((e) => e.id)
    );
    setCalendarEvents((prev) => prev.filter((e) => e.calendarId !== id && e.googleCalendarId !== id));
    setReservations((prev) =>
      prev.filter((r) => !r.calendarEventId || !deletedEventIds.has(r.calendarEventId))
    );

    const newSettings: FamilySettings = {
      ...settings,
      savedCalendars: updatedSaved,
      deletedCalendarIds: Array.from(deletedSet),
      carCalendarIds: Array.from(carSet),
      calendarPrivacyModes: privacyModes,
      googleCalendarConfig: updatedConfig,
    };
    setSettings(newSettings);

    if (firebaseUser) {
      await saveSettingsToFirestore(newSettings).catch(console.error);
    }
  };

  const addTestMember = (role: Role = 'child', name?: string) => {
    const count = members.filter((m) => m.name.includes('Test') || m.isTestPerson).length + 1;
    const testName =
      name ||
      (role === 'child'
        ? `Test-ungdom ${count}`
        : role === 'adult'
        ? `Test-voksen ${count}`
        : `Test-admin ${count}`);
    const emoji = role === 'child' ? '🧑' : role === 'adult' ? '👩' : '👨‍💼';
    const newTestMember: FamilyMember = {
      id: `member_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: testName,
      role,
      avatarColor:
        role === 'child' ? 'bg-amber-600' : role === 'adult' ? 'bg-teal-600' : 'bg-purple-600',
      avatarEmoji: emoji,
      weeklyPointsGoal: role === 'child' ? 10 : 8,
      isActive: true,
      canReserveCar: role !== 'child',
      canManageTasks: role === 'admin',
      canManageFamily: role === 'admin',
      email: `test${count}@example.com`,
      isTestPerson: true,
    };
    setMembers((prev) => [...prev, newTestMember]);
  };

  const removeTestMembers = () => {
    setMembers((prev) => {
      const remaining = prev.filter(
        (m) => !m.isTestPerson && m.id !== 'member_marcus' && m.id !== 'member_synelle'
      );
      if (remaining.length === 0) {
        return initialFamilyMembers.filter((m) => m.role === 'admin');
      }
      return remaining;
    });
  };

  const loadAllTestData = async (): Promise<void> => {
    setMembers(initialFamilyMembers);
    setVehicles(initialVehicles);
    setReservations(initialReservations);
    setCalendarEvents(initialCalendarEvents);
    setCalendarConnections(initialCalendarConnections);
    setTaskTemplates(initialTaskTemplates);
    setTaskInstances(initialTaskInstances);
    setAvailableGoogleCalendars(
      SAMPLE_GOOGLE_CALENDARS.map((c) => ({ ...c, enabledForDisplay: true }))
    );

    const newSettings: FamilySettings = {
      ...initialSettings,
      disableMockData: false,
      disabledCalendarIds: [],
    };
    setSettings(newSettings);
    setActiveMemberId('member_marcus');

    if (firebaseUser) {
      await saveSettingsToFirestore(newSettings).catch(console.error);
    }
  };

  const removeAllTestData = async (keepAdminOnly: boolean = false): Promise<void> => {
    // 1. Remove mock calendar events & reservations
    const cleanedEvents = calendarEvents.filter((e) => !isMockEvent(e));
    const cleanedReservations = reservations.filter((r) => !isMockReservation(r));
    setCalendarEvents(cleanedEvents);
    setReservations(cleanedReservations);

    // 2. Remove mock / sample calendars so only real user calendar remains
    const cleanedCalendars = availableGoogleCalendars
      .filter((c) => !SAMPLE_GOOGLE_CALENDARS.some((s) => s.id === c.id && s.id !== 'primary'))
      .map((c) => ({ ...c, enabledForDisplay: true }));
    setAvailableGoogleCalendars(cleanedCalendars);

    // 3. Clean test members if requested
    if (keepAdminOnly) {
      const adminMember = members.find((m) => m.role === 'admin') || initialFamilyMembers[0];
      setMembers([adminMember]);
      setActiveMemberId(adminMember.id);
    } else {
      setMembers((prev) => {
        const withoutTest = prev.filter((m) => !m.isTestPerson);
        return withoutTest.length > 0 ? withoutTest : prev;
      });
    }

    // 4. Update settings
    const newSettings: FamilySettings = {
      ...settings,
      disableMockData: true,
      disabledCalendarIds: [],
    };
    setSettings(newSettings);

    if (firebaseUser) {
      deleteCalendarEventFromFirestore('cal_ev_1').catch(() => {});
      deleteCalendarEventFromFirestore('cal_ev_2').catch(() => {});
      await saveSettingsToFirestore(newSettings).catch(console.error);
    }
  };

  const clearAllMockData = async (): Promise<void> => {
    await removeAllTestData(false);
  };

  const toggleDisableMockData = async (disable: boolean): Promise<void> => {
    if (disable) {
      await removeAllTestData(false);
    } else {
      await loadAllTestData();
    }
  };

  const setSelectedGoogleCalendar = async (calendarId: string, calendarName?: string): Promise<void> => {
    const found = availableGoogleCalendars.find((c) => c.id === calendarId);
    const resolvedName =
      calendarName || found?.summary || (calendarId === 'primary' ? 'Magnar Totland (Primær)' : calendarId);

    const currentConfig = settings.googleCalendarConfig || {
      autoReserveCar: true,
      filterMode: 'work_only' as const,
    };

    const newCalendarConfig: GoogleCalendarConfig = {
      ...currentConfig,
      calendarId,
      calendarName: resolvedName,
      lastSyncedAt: new Date().toISOString(),
    };

    const newSettings: FamilySettings = {
      ...settings,
      googleCalendarConfig: newCalendarConfig,
    };

    setSettings(newSettings);

    if (firebaseUser) {
      await saveSettingsToFirestore(newSettings).catch(console.error);
    }

    // Automatically trigger sync for this chosen calendar if connected
    const token = googleAccessToken || localStorage.getItem('gcal_access_token');
    if (token) {
      syncTwoWayWithGoogle('member_magnar').catch((err) =>
        console.warn('Bakgrunnssynkronisering avbrutt/ikke fullført:', err)
      );
    }
  };

  const updateGoogleCalendarConfig = async (updates: Partial<GoogleCalendarConfig>): Promise<void> => {
    const currentConfig = settings.googleCalendarConfig || {
      calendarId: 'primary',
      calendarName: 'Magnar Totland (Primær)',
      autoReserveCar: true,
      filterMode: 'work_only' as const,
    };

    const updatedConfig: GoogleCalendarConfig = {
      ...currentConfig,
      ...updates,
    };

    const newSettings: FamilySettings = {
      ...settings,
      googleCalendarConfig: updatedConfig,
    };

    setSettings(newSettings);

    if (firebaseUser) {
      await saveSettingsToFirestore(newSettings).catch(console.error);
    }
  };

  const connectGoogleCalendar = async (customToken?: string): Promise<boolean> => {
    try {
      setIsTwoWaySyncing(true);
      setGoogleSyncStatusMessage('Kobler til Google-konto...');
      let token = customToken;
      if (!token) {
        token = await requestGoogleAccessToken();
      }

      setGoogleAccessToken(token);
      localStorage.setItem('gcal_access_token', token);

      // Refresh list of calendars from this user's Google account
      const calendars = await fetchUserGoogleCalendars(token);
      setAvailableGoogleCalendars(calendars);

      // Perform initial 2-way synchronization with the configured or primary calendar
      const targetCalendarId = settings.googleCalendarConfig?.calendarId || 'primary';
      const res = await executeTwoWayCalendarSync({
        accessToken: token,
        localEvents: calendarEvents,
        localReservations: reservations,
        members,
        targetMemberId: 'member_magnar',
        calendarId: targetCalendarId,
        settings,
        vehicleId: activeVehicle.id,
      });

      if (res.events) {
        setCalendarEvents(res.events);
      }
      if (res.newReservations && res.newReservations.length > 0) {
        setReservations((prev) => [...res.newReservations, ...prev]);
      }

      const syncTime = new Date().toISOString();
      setLastGoogleSyncTime(syncTime);
      localStorage.setItem('gcal_last_synced', syncTime);
      setGoogleSyncStatusMessage(res.message);

      setCalendarConnections((prev) =>
        prev.map((c) =>
          c.id === 'cal_conn_1'
            ? { ...c, isConnected: true, accessToken: token, lastSyncedAt: syncTime }
            : c
        )
      );

      setIsTwoWaySyncing(false);
      return true;
    } catch (err: any) {
      const errStr = String(err?.message || err?.type || err || '');
      const isCancellation =
        err?.type === 'popup_closed' ||
        err?.isCancellation ||
        errStr.toLowerCase().includes('popup window closed') ||
        errStr.toLowerCase().includes('popup_closed') ||
        errStr.toLowerCase().includes('avbrutt') ||
        errStr.toLowerCase().includes('lukket');

      if (isCancellation) {
        console.info('Google Kalender-tilkobling: Påloggingsvinduet ble lukket eller avbrutt.');
        setGoogleSyncStatusMessage(
          'Påloggingsvinduet ble lukket. Trykk på «Koble til Google» for å prøve igjen, eller åpne appen i en ny fane (dersom forhåndsvisningsrammen blokkerer popups).'
        );
      } else {
        console.warn('Tilkobling til Google Kalender ikke fullført:', err);
        setGoogleSyncStatusMessage(`Tilkobling ikke fullført: ${err?.message || err}`);
      }
      setIsTwoWaySyncing(false);
      return false;
    }
  };

  const disconnectGoogleCalendar = () => {
    setGoogleAccessToken(null);
    localStorage.removeItem('gcal_access_token');
    localStorage.removeItem('gcal_last_synced');
    setCalendarConnections((prev) =>
      prev.map((c) => (c.id === 'cal_conn_1' ? { ...c, isConnected: false } : c))
    );
    setGoogleSyncStatusMessage('Google Kalender er frakoblet.');
  };

  const syncTwoWayWithGoogle = async (targetMemberId: string = 'member_magnar'): Promise<SyncResult | null> => {
    const token = googleAccessToken || localStorage.getItem('gcal_access_token');
    if (!token) {
      // Connect first if not connected
      const connected = await connectGoogleCalendar();
      if (!connected) return null;
      return null;
    }

    try {
      setIsTwoWaySyncing(true);
      setGoogleSyncStatusMessage('Synkroniserer hendelser med Google Kalender...');

      const activeCalendars = availableGoogleCalendars
        .filter((c) => !(settings.disabledCalendarIds || []).includes(c.id))
        .map((c) => ({
          id: c.id,
          name: c.customName || c.summary,
          assignedMemberId: c.assignedMemberId,
        }));

      const calendarsToSync = activeCalendars.length > 0
        ? activeCalendars
        : [{ id: settings.googleCalendarConfig?.calendarId || 'primary', name: 'Primærkalender' }];

      const multiResult = await executeMultiCalendarSync({
        accessToken: token,
        localEvents: calendarEvents,
        localReservations: reservations,
        members,
        targetMemberId,
        calendars: calendarsToSync,
        settings,
        vehicleId: activeVehicle.id,
      });

      setCalendarEvents(multiResult.events);
      if (multiResult.newReservations.length > 0) {
        setReservations((prev) => [...multiResult.newReservations, ...prev]);
      }

      const nowIso = new Date().toISOString();
      setLastGoogleSyncTime(nowIso);
      localStorage.setItem('gcal_last_synced', nowIso);
      setGoogleSyncStatusMessage(multiResult.message);

      setCalendarConnections((prev) =>
        prev.map((c) =>
          c.memberId === targetMemberId || c.id === 'cal_conn_1'
            ? { ...c, isConnected: true, lastSyncedAt: nowIso }
            : c
        )
      );

      setIsTwoWaySyncing(false);
      return {
        success: true,
        message: multiResult.message,
        importedCount: multiResult.totalImported,
        pushedCount: 0,
        updatedCount: 0,
        deletedCount: 0,
        events: multiResult.events,
        newReservations: multiResult.newReservations,
        syncedAt: nowIso,
      };
    } catch (err: any) {
      console.error('2-veis synkronisering feilet:', err);
      setGoogleSyncStatusMessage(`Synkronisering feilet: ${err.message || err}`);
      setIsTwoWaySyncing(false);
      return null;
    }
  };

  const syncCalendar = async (connectionId: string): Promise<SyncResult | null> => {
    return await syncTwoWayWithGoogle();
  };

  const updateCalendarConnection = (id: string, updates: Partial<CalendarConnection>) => {
    setCalendarConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Task Operations
  const claimTask = (instanceId: string, memberId?: string) => {
    const targetMemberId = memberId || activeMemberId;
    const member = members.find((m) => m.id === targetMemberId);
    if (!member) return;

    let updatedInst: TaskInstance | undefined;
    setTaskInstances((prev) =>
      prev.map((t) => {
        if (t.id === instanceId) {
          updatedInst = {
            ...t,
            status: 'claimed',
            claimedByMemberId: member.id,
            claimedByName: member.name,
            claimedAt: new Date().toISOString(),
          };
          return updatedInst;
        }
        return t;
      })
    );

    if (firebaseUser && updatedInst) {
      saveTaskInstanceToFirestore(updatedInst).catch(console.error);
    }
  };

  const unclaimTask = (instanceId: string) => {
    let updatedInst: TaskInstance | undefined;
    setTaskInstances((prev) =>
      prev.map((t) => {
        if (t.id === instanceId && t.status === 'claimed') {
          updatedInst = {
            ...t,
            status: 'available',
            claimedByMemberId: undefined,
            claimedByName: undefined,
            claimedAt: undefined,
          };
          return updatedInst;
        }
        return t;
      })
    );

    if (firebaseUser && updatedInst) {
      saveTaskInstanceToFirestore(updatedInst).catch(console.error);
    }
  };

  const completeTask = (instanceId: string, memberId?: string) => {
    const targetMemberId = memberId || activeMemberId;
    const member = members.find((m) => m.id === targetMemberId) || activeMember;
    const completedAt = new Date().toISOString();
    let completedInstance: TaskInstance | undefined;
    let nextInstance: TaskInstance | undefined;

    setTaskInstances((prev) => {
      const updated = prev.map((t) => {
        if (t.id !== instanceId) return t;
        completedInstance = completeTaskInstance(t, member, completedAt);
        return completedInstance;
      });

      if (completedInstance) {
        const template = taskTemplates.find((tmpl) => tmpl.id === completedInstance?.templateId);
        if (template) {
          nextInstance = spawnNextTaskInstance(template, completedAt, updated) ?? undefined;
          if (nextInstance) updated.push(nextInstance);
        }
      }

      return updated;
    });

    if (firebaseUser) {
      if (completedInstance) saveTaskInstanceToFirestore(completedInstance).catch(console.error);
      if (nextInstance) saveTaskInstanceToFirestore(nextInstance).catch(console.error);
    }
  };

  const claimSuggestedTasks = (instanceIds: string[], memberId?: string) => {
    const targetMemberId = memberId || activeMemberId;
    const member = members.find((m) => m.id === targetMemberId);
    if (!member) return;

    setTaskInstances((prev) =>
      prev.map((t) => {
        if (instanceIds.includes(t.id) && t.status === 'available') {
          return {
            ...t,
            status: 'claimed',
            claimedByMemberId: member.id,
            claimedByName: member.name,
            claimedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
  };

  const createTaskTemplate = (templateData: Omit<TaskTemplate, 'id'>) => {
    const templateId = 'tmpl_' + Date.now().toString(36);
    const newTemplate: TaskTemplate = {
      ...templateData,
      id: templateId,
    };
    setTaskTemplates((prev) => [...prev, newTemplate]);

    if (newTemplate.isActive) {
      const newInstance = createTaskInstanceFromTemplate(newTemplate, new Date());
      setTaskInstances((prev) => [...prev, newInstance]);

      if (firebaseUser) {
        saveTaskTemplateToFirestore(newTemplate).catch(console.error);
        saveTaskInstanceToFirestore(newInstance).catch(console.error);
        return;
      }
    }

    if (firebaseUser) {
      saveTaskTemplateToFirestore(newTemplate).catch(console.error);
    }
  };

  const updateTaskTemplate = (id: string, updates: Partial<TaskTemplate>) => {
    let updatedTmpl: TaskTemplate | undefined;
    setTaskTemplates((prev) =>
      prev.map((tmpl) => {
        if (tmpl.id === id) {
          updatedTmpl = { ...tmpl, ...updates };
          return updatedTmpl;
        }
        return tmpl;
      })
    );
    if (firebaseUser && updatedTmpl) {
      saveTaskTemplateToFirestore(updatedTmpl).catch(console.error);
    }
  };

  const deleteTaskTemplate = (id: string) => {
    setTaskTemplates((prev) => prev.filter((tmpl) => tmpl.id !== id));
    if (firebaseUser) {
      deleteTaskTemplateFromFirestore(id).catch(console.error);
    }
  };

  const restartTaskPool = () => {
    const oldInstanceIds = taskInstances.map((inst) => inst.id);
    const freshInstances = buildRestartedTaskInstances(taskTemplates, new Date());
    setTaskInstances(freshInstances);

    if (firebaseUser) {
      oldInstanceIds.forEach((id) => {
        deleteTaskInstanceFromFirestore(id).catch(console.error);
      });
      freshInstances.forEach((inst) => {
        saveTaskInstanceToFirestore(inst).catch(console.error);
      });
    }
  };

  // Family Members Management
  const addMember = (memberData: Omit<FamilyMember, 'id'>) => {
    const newMember: FamilyMember = {
      ...memberData,
      id: 'member_' + Date.now().toString(36),
    };
    setMembers((prev) => [...prev, newMember]);
    if (firebaseUser) {
      saveMemberToFirestore(newMember).catch(console.error);
    }
  };

  const updateMember = (id: string, updates: Partial<FamilyMember>) => {
    let updatedMember: FamilyMember | undefined;
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          updatedMember = { ...m, ...updates };
          return updatedMember;
        }
        return m;
      })
    );
    if (firebaseUser && updatedMember) {
      saveMemberToFirestore(updatedMember).catch(console.error);
    }
  };

  const deleteMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    if (firebaseUser) {
      deleteMemberFromFirestore(id).catch(console.error);
    }
  };

  // Vehicles
  const addVehicle = (vehicleData: Omit<Vehicle, 'id'>) => {
    const newVehicle: Vehicle = {
      ...vehicleData,
      id: 'veh_' + Date.now().toString(36),
    };
    setVehicles((prev) => [...prev, newVehicle]);
    if (firebaseUser) {
      saveVehicleToFirestore(newVehicle).catch(console.error);
    }
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    let updatedVeh: Vehicle | undefined;
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          updatedVeh = { ...v, ...updates };
          return updatedVeh;
        }
        return v;
      })
    );
    if (firebaseUser && updatedVeh) {
      saveVehicleToFirestore(updatedVeh).catch(console.error);
    }
  };

  // Settings
  const updateSettings = (updates: Partial<FamilySettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...updates };
      if (firebaseUser) {
        saveSettingsToFirestore(updated).catch(console.error);
      }
      return updated;
    });
  };

  const getMemberCompletedPoints = (memberId: string) =>
    getMemberCompletedPointsUtil(taskInstances, memberId);

  const getMemberClaimedPoints = (memberId: string) =>
    getMemberClaimedPointsUtil(taskInstances, memberId);

  const resetAllData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMembers(initialFamilyMembers);
    setVehicles(initialVehicles);
    setReservations(initialReservations);
    setCalendarConnections(initialCalendarConnections);
    setCalendarEvents(initialCalendarEvents);
    setTaskTemplates(initialTaskTemplates);
    setTaskInstances(initialTaskInstances);
    setSettings(initialSettings);
    setWeeklyPointsRecords([]);
    setActiveMemberId('member_marcus');
  };

  return (
    <FamilyContext.Provider
      value={{
        activeMemberId,
        activeMember,
        setActiveMemberId,
        members,
        addMember,
        updateMember,
        deleteMember,
        vehicles,
        activeVehicleId,
        activeVehicle,
        setActiveVehicleId,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        reservations,
        checkCarAvailability,
        createCarReservation,
        cancelReservation,
        updateCarRules,
        calendarConnections,
        calendarEvents,
        addCalendarEvent,
        deleteCalendarEvent,
        syncCalendar,
        syncTwoWayWithGoogle,
        updateCalendarConnection,
        updateCalendarRules,
        googleAccessToken,
        isGoogleConnected,
        isTwoWaySyncing,
        lastGoogleSyncTime,
        googleSyncStatusMessage,
        connectGoogleCalendar,
        disconnectGoogleCalendar,
        availableGoogleCalendars,
        isLoadingCalendars,
        refreshGoogleCalendars,
        setSelectedGoogleCalendar,
        updateGoogleCalendarConfig,
        addCustomGoogleCalendar,
        updateGoogleCalendarName,
        toggleCalendarViewVisibility,
        toggleCalendarDisabled,
        toggleCarCalendar,
        setCalendarPrivacyMode,
        updateCalendarSettings,
        removeCustomGoogleCalendar,
        clearAllMockData,
        toggleDisableMockData,
        addTestMember,
        removeTestMembers,
        loadAllTestData,
        removeAllTestData,
        areas,
        addArea,
        updateArea,
        deleteArea,
        addRoomToArea,
        removeRoomFromArea,
        updateLocationOverride,
        deleteLocationOverride,
        taskTemplates,
        taskInstances,
        claimTask,
        unclaimTask,
        completeTask,
        claimSuggestedTasks,
        createTaskTemplate,
        updateTaskTemplate,
        deleteTaskTemplate,
        restartTaskPool,
        settings,
        updateSettings,
        firebaseUser,
        isFirebaseAuthReady,
        isFirestoreConnected,
        isFirestoreSyncing,
        signInWithFirebaseGoogle,
        signOutFirebaseUser,
        pushAllToFirestore,
        getMemberCompletedPoints,
        getMemberClaimedPoints,
        weeklyPointsRecords,
        currentWeek,
        resetAllData,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
};
