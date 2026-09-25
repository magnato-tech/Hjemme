import React, { useState, useMemo } from 'react';
import { useFamily } from '../context/FamilyContext';
import {
  Calendar,
  CalendarClock,
  Car,
  CheckCircle2,
  Clock,
  MapPin,
  Plus,
  RotateCw,
  Sliders,
  Sparkles,
  Trash2,
  Zap,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  RefreshCw,
  Check,
  CalendarRange,
  Lock,
  Shield,
  Settings,
  User,
} from './Icons';
import {
  formatNorwegianDate,
  formatTime,
  formatTimeRange,
  formatShortDate,
  formatLocalDateKey,
  isSameDay,
  isToday,
} from '../utils/dateUtils';
import { CalendarEvent, GoogleCalendarItem } from '../types';
import { WeekTimeGrid } from './WeekTimeGrid';
import { CalendarSettingsModal } from './Modals/CalendarSettingsModal';
import { SAMPLE_GOOGLE_CALENDARS } from '../utils/googleCalendarService';
import {
  buildCarReservationSpansByDay,
  FAMILY_CAR_LINE_COLOR,
  getFamilyCarOccupiedDateKeys,
} from '../utils/carReservationSpans';
import {
  getDisplayEventDescription,
  getDisplayEventLocation,
  getDisplayEventTitle,
  getEventCalendarConfig,
  isBusyOnlyEvent,
} from '../utils/calendarEventDisplay';
import { buildMonthCalendarCells, getWeekDates, getWeekStart } from '../utils/weekCalendarGrid';
import {
  isCalendarActiveForCar,
  isCalendarDisabled,
  isCalendarVisibleInView,
} from '../utils/calendarVisibility';

interface CalendarModuleProps {
  onOpenAddEvent?: () => void;
}

type ViewMode = 'month' | 'week' | 'agenda';

export const CalendarModule: React.FC<CalendarModuleProps> = ({ onOpenAddEvent }) => {
  const {
    calendarConnections,
    calendarEvents,
    reservations,
    syncCalendar,
    syncTwoWayWithGoogle,
    deleteCalendarEvent,
    settings,
    updateSettings,
    members,
    vehicles,
    googleAccessToken,
    isGoogleConnected,
    isTwoWaySyncing,
    lastGoogleSyncTime,
    googleSyncStatusMessage,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    availableGoogleCalendars,
    toggleCalendarViewVisibility,
    updateCalendarSettings,
  } = useFamily();

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [selectedCalForModal, setSelectedCalForModal] = useState<GoogleCalendarItem | null>(null);
  const [showPastEvents, setShowPastEvents] = useState<boolean>(false);

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
  ];
  const dayNamesShort = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const calendarCells = useMemo(
    () =>
      buildMonthCalendarCells(year, month).map((cell) => ({
        ...cell,
        dateStr: formatLocalDateKey(cell.date),
      })),
    [year, month]
  );

  // Filter events according to mock data settings and admin-disabled calendars
  const disabledCalIds = useMemo(
    () => new Set(settings.disabledCalendarIds || []),
    [settings.disabledCalendarIds]
  );
  const deletedCalIds = useMemo(
    () => new Set(settings.deletedCalendarIds || []),
    [settings.deletedCalendarIds]
  );

  // List of all active/added calendars
  const allCalendars = useMemo(() => {
    const map = new Map<string, GoogleCalendarItem>();

    // 1. Saved calendars from settings
    (settings.savedCalendars || []).forEach((c) => {
      if (!deletedCalIds.has(c.id)) {
        map.set(c.id, { ...c });
      }
    });

    // 2. Available Google calendars in state
    (availableGoogleCalendars || []).forEach((c) => {
      if (!deletedCalIds.has(c.id)) {
        const existing = map.get(c.id);
        map.set(c.id, { ...existing, ...c });
      }
    });

    // 3. Fallback to sample calendars if empty and mock data is not disabled
    if (map.size === 0 && !settings.disableMockData) {
      SAMPLE_GOOGLE_CALENDARS.forEach((c) => {
        if (!deletedCalIds.has(c.id)) {
          map.set(c.id, { ...c });
        }
      });
    }

    return Array.from(map.values()).filter(
      (cal) => !isCalendarDisabled(cal.id, settings, Array.from(deletedCalIds))
    );
  }, [availableGoogleCalendars, settings.savedCalendars, deletedCalIds, settings.disableMockData, settings.disabledCalendarIds]);

  const isCalendarVisible = (calId: string, calItem?: GoogleCalendarItem) =>
    isCalendarVisibleInView(calId, settings, calItem, Array.from(deletedCalIds));

  const isCalendarActiveForCarCheck = (calId: string) =>
    isCalendarActiveForCar(calId, settings, Array.from(deletedCalIds));

  // Get the person associated with a calendar
  const getCalendarOwner = (cal: GoogleCalendarItem) => {
    const config = settings.calendarConfigs?.[cal.id];
    const memberId = config?.assignedMemberId || cal.assignedMemberId;
    if (memberId) {
      const member = members.find((m) => m.id === memberId);
      if (member) return member;
    }
    const nameLower = (cal.customName || cal.summary || '').toLowerCase();
    if (nameLower.includes('magnar') || cal.id === 'primary' || nameLower.includes('lillesand')) {
      return (
        members.find((m) => m.name.toLowerCase().includes('magnar')) || {
          id: 'member_magnar',
          name: 'Magnar Totland',
          role: 'Far',
          color: '#0284c7',
        }
      );
    }
    if (nameLower.includes('marcus')) {
      return (
        members.find((m) => m.name.toLowerCase().includes('marcus')) || {
          id: 'member_marcus',
          name: 'Marcus Totland',
          role: 'Sønn',
          color: '#f59e0b',
        }
      );
    }
    return null;
  };

  const visibleCalendarsCount = allCalendars.filter((c) => isCalendarVisible(c.id, c)).length;

  const onlyCarReservations = settings.calendarShowOnlyCarReservations === true;

  const eventReservesCar = (ev: CalendarEvent): boolean => {
    if (ev.createsCarReservation) return true;
    return reservations.some(
      (res) => res.status !== 'cancelled' && res.calendarEventId === ev.id
    );
  };

  const filteredEvents = calendarEvents.filter((ev) => {
    if (
      settings.disableMockData &&
      (ev.id === 'cal_ev_1' || ev.id === 'cal_ev_2' || ev.id.startsWith('mock_') || (ev as any).isMock)
    ) {
      return false;
    }
    // Check if calendar is disabled or hidden
    const calId = ev.calendarId || ev.googleCalendarId;
    if (calId && !isCalendarVisible(calId)) {
      return false;
    }
    if (ev.calendarId && !isCalendarVisible(ev.calendarId)) {
      return false;
    }
    if (ev.googleCalendarId && !isCalendarVisible(ev.googleCalendarId)) {
      return false;
    }
    if (ev.id === 'cal_ev_2' && disabledCalIds.has('c_jobb_totland@group.calendar.google.com')) {
      return false;
    }
    if (selectedMemberFilter !== 'all' && ev.memberId !== selectedMemberFilter) {
      return false;
    }
    if (onlyCarReservations && !eventReservesCar(ev)) {
      return false;
    }
    return true;
  });

  const sortedEvents = [...filteredEvents].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const showFamilyCarLine = settings.showFamilyCarLine !== false;

  const carSpanSourceEvents = useMemo(
    () =>
      calendarEvents.filter((ev) => {
        if (
          settings.disableMockData &&
          (ev.id === 'cal_ev_1' ||
            ev.id === 'cal_ev_2' ||
            ev.id.startsWith('mock_') ||
            (ev as { isMock?: boolean }).isMock)
        ) {
          return false;
        }
        return true;
      }),
    [calendarEvents, settings.disableMockData]
  );

  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const carSpansByDay = useMemo(
    () =>
      buildCarReservationSpansByDay(
        carSpanSourceEvents,
        settings,
        allCalendars,
        weekDates,
        (calId) => isCalendarActiveForCarCheck(calId)
      ),
    [carSpanSourceEvents, settings, allCalendars, weekDates, disabledCalIds, settings.calendarViewHiddenIds]
  );

  const monthCarOccupiedDateKeys = useMemo(
    () =>
      showFamilyCarLine
        ? getFamilyCarOccupiedDateKeys(
            carSpanSourceEvents,
            settings,
            allCalendars,
            calendarCells.map((cell) => cell.date),
            (calId) => isCalendarActiveForCarCheck(calId)
          )
        : new Set<string>(),
    [
      showFamilyCarLine,
      carSpanSourceEvents,
      settings,
      allCalendars,
      calendarCells,
      disabledCalIds,
      settings.calendarViewHiddenIds,
    ]
  );

  // Helper to determine if an event is in the future or active/ongoing
  const isFutureOrActiveEvent = (ev: CalendarEvent): boolean => {
    const now = new Date();
    if (ev.endTime) {
      const endTime = new Date(ev.endTime).getTime();
      if (!isNaN(endTime)) {
        return endTime >= now.getTime();
      }
    }
    if (ev.startTime) {
      const startTime = new Date(ev.startTime).getTime();
      if (!isNaN(startTime)) {
        if (startTime >= now.getTime()) {
          return true;
        }
        if (isSameDay(ev.startTime, now) && !ev.endTime) {
          return true;
        }
      }
    }
    return false;
  };

  const upcomingEvents = sortedEvents.filter(isFutureOrActiveEvent);
  const pastEventsCount = sortedEvents.length - upcomingEvents.length;
  const displayedAgendaEvents = showPastEvents ? sortedEvents : upcomingEvents;

  // Events for the selected date (timezone-safe comparison)
  const selectedDateEvents = sortedEvents.filter((ev) =>
    isSameDay(ev.startTime, selectedDate)
  );

  const getEventCalendarColor = (event: CalendarEvent): string => {
    const calId = event.calendarId || event.googleCalendarId;
    if (!calId) return '#0284c7';
    const cal = allCalendars.find((c) => c.id === calId);
    const configColor = settings.calendarConfigs?.[calId]?.color;
    return configColor || cal?.backgroundColor || '#0284c7';
  };

  // Manual or instant 2-way sync trigger
  const handleTriggerSync = async () => {
    const res = await syncTwoWayWithGoogle();
    if (res) {
      setFeedbackToast(`✅ Synk fullført: ${res.syncedFromGoogleCount} fra Google, ${res.pushedToGoogleCount} sendt`);
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  return (
    <div
      className={
        viewMode === 'week'
          ? 'flex flex-col gap-3 h-full min-h-0 overflow-hidden'
          : 'h-full min-h-0 overflow-y-auto space-y-6 pb-8'
      }
    >
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-900/90 text-emerald-100 px-5 py-3 rounded-2xl shadow-xl backdrop-blur-md border border-emerald-500/40 text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md bg-white/60 rounded-3xl border border-white/60 shadow-sm shrink-0 ${
          viewMode === 'week' ? 'p-3 sm:p-4' : 'p-6 sm:p-7'
        }`}
      >
        <div className="flex items-center space-x-4">
          <div className="w-13 h-13 bg-sky-100/80 text-sky-800 rounded-2xl flex items-center justify-center border border-sky-200/60 shadow-2xs">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Familiekalender
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                2-veis Google Sync
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Synkroniserer begge veier med Google Kalender & reserverer bil automatisk
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTriggerSync}
            disabled={isTwoWaySyncing}
            className="flex items-center space-x-2 bg-white/80 hover:bg-white text-slate-800 px-4 py-2.5 rounded-2xl text-sm font-bold shadow-2xs border border-white/80 transition-all cursor-pointer disabled:opacity-50"
            title="Synkroniser begge veier med Google Kalender nå"
          >
            <RotateCw className={`w-4 h-4 text-blue-600 ${isTwoWaySyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isTwoWaySyncing ? 'Synker...' : 'Synk Google nå'}
            </span>
          </button>

          <button
            onClick={onOpenAddEvent}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow-sm transition-all border border-sky-400/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ny hendelse</span>
          </button>
        </div>
      </div>

      {/* View Switcher & Member Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        {/* View Mode buttons */}
        <div className="flex items-center p-1 bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 shadow-2xs w-fit">
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'month'
                ? 'bg-white text-slate-900 shadow-2xs border border-white/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Måned
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'week'
                ? 'bg-white text-slate-900 shadow-2xs border border-white/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Uke
          </button>
          <button
            onClick={() => setViewMode('agenda')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'agenda'
                ? 'bg-white text-slate-900 shadow-2xs border border-white/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tidslinje / Liste
          </button>
        </div>

        {/* Member filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedMemberFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-2xs ${
              selectedMemberFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white/60 text-slate-700 hover:bg-white/90 border border-white/60'
            }`}
          >
            Alle familiemedlemmer
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMemberFilter(m.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-2xs ${
                selectedMemberFilter === m.id
                  ? 'bg-sky-600 text-white'
                  : 'bg-white/60 text-slate-700 hover:bg-white/90 border border-white/60'
              }`}
            >
              <span>{m.avatarEmoji}</span>
              <span>{m.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              updateSettings({ calendarShowOnlyCarReservations: !onlyCarReservations })
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-2xs ${
              onlyCarReservations
                ? 'bg-amber-500 text-white'
                : 'bg-white/60 text-slate-700 hover:bg-white/90 border border-white/60'
            }`}
            title="Vis kun hendelser som reserverer bilen"
          >
            <Car className="w-3.5 h-3.5" />
            <span>Kun bilreservasjoner</span>
          </button>
        </div>
      </div>

      {/* MAIN VIEW: Month Grid */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Month Calendar Grid (8 cols) */}
          <div className="lg:col-span-8 backdrop-blur-md bg-white/60 rounded-3xl p-5 sm:p-6 border border-white/60 shadow-sm space-y-4">
            {/* Month Header Navigation */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-bold text-slate-900">
                  {monthNames[month]} {year}
                </h2>
                <button
                  onClick={goToToday}
                  className="px-2.5 py-1 text-xs font-bold bg-white/80 hover:bg-white text-slate-700 rounded-xl border border-slate-200/60 shadow-2xs transition-colors cursor-pointer"
                >
                  I dag
                </button>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-xl bg-white/70 hover:bg-white text-slate-700 border border-white/60 shadow-2xs transition-colors cursor-pointer"
                  title="Forrige måned"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-xl bg-white/70 hover:bg-white text-slate-700 border border-white/60 shadow-2xs transition-colors cursor-pointer"
                  title="Neste måned"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {dayNamesShort.map((dayName, idx) => (
                <div
                  key={dayName}
                  className={`text-xs font-bold py-1.5 ${
                    idx >= 5 ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* 7x6 Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarCells.map((cell, idx) => {
                const dayEvents = sortedEvents.filter(
                  (e) => isSameDay(e.startTime, cell.date)
                );
                const hasFamilyCarOccupied =
                  showFamilyCarLine && monthCarOccupiedDateKeys.has(cell.dateStr);
                const isSelected = isSameDay(cell.date, selectedDate);
                const isCurrentToday = isToday(cell.date);

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(cell.date)}
                    className={`min-h-[85px] sm:min-h-[105px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-sky-50/90 border-sky-400 ring-2 ring-sky-400/30 shadow-md'
                        : cell.isCurrentMonth
                        ? 'bg-white/60 hover:bg-white/90 border-white/80 shadow-2xs'
                        : 'bg-white/20 text-slate-400 border-transparent hover:bg-white/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isCurrentToday
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isSelected
                            ? 'text-sky-900 font-extrabold'
                            : cell.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {cell.date.getDate()}
                      </span>

                      {hasFamilyCarOccupied && (
                        <span title="Familiebilen opptatt denne dagen (inkl. reisetid)">
                          <Car className="w-3.5 h-3.5 text-amber-600" />
                        </span>
                      )}
                    </div>

                    {/* Event pills in month cell */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev) => {
                        const evConfig = getEventCalendarConfig(ev, settings.calendarConfigs);
                        const displayTitle = getDisplayEventTitle(ev, evConfig);
                        const busyOnly = isBusyOnlyEvent(ev, evConfig);

                        return (
                        <div
                          key={ev.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium flex items-center justify-between ${
                            busyOnly
                              ? 'bg-amber-100/90 text-amber-900 border border-amber-300/80 font-bold'
                              : ev.isWorkRelated
                              ? 'bg-indigo-100/90 text-indigo-900 border border-indigo-200/60'
                              : 'bg-sky-100/80 text-sky-900 border border-sky-200/60'
                          }`}
                          title={busyOnly ? `${ev.memberName}: Opptatt (Konfidensielt)` : `${ev.memberName}: ${displayTitle}`}
                        >
                          <span className="truncate flex items-center gap-1">
                            {(ev.createsCarReservation || ev.vehicleReservationId) && (
                              <Car className="w-2.5 h-2.5 text-blue-700 shrink-0" title="Reserverer bil" />
                            )}
                            {busyOnly && <Lock className="w-2.5 h-2.5 text-amber-700 shrink-0" />}
                            <span>{displayTitle}</span>
                          </span>
                          {ev.isSyncedWithGoogle && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1 shrink-0" />
                          )}
                        </div>
                        );
                      })}

                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-slate-500 font-bold text-right pr-1">
                          +{dayEvents.length - 2} til
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Details Panel (4 cols) */}
          {/* Selected Day Details Panel (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="backdrop-blur-md bg-white/60 rounded-3xl p-5 sm:p-6 border border-white/60 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {formatNorwegianDate(selectedDate)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedDateEvents.length} hendelse(r) registrert
                  </p>
                </div>
              </div>

              {/* Event list for selected date */}
              <div className="space-y-3">
                {selectedDateEvents.length > 0 ? (
                  selectedDateEvents.map((ev) => {
                    const evConfig = getEventCalendarConfig(ev, settings.calendarConfigs);
                    const displayTitle = getDisplayEventTitle(ev, evConfig);
                    const displayLocation = getDisplayEventLocation(ev, evConfig);
                    const busyOnly = isBusyOnlyEvent(ev, evConfig);

                    return (
                    <div
                      key={ev.id}
                      className="p-4 rounded-2xl bg-white/70 backdrop-blur-xs border border-white/80 shadow-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">
                              {ev.memberName}
                            </span>
                            {(ev.createsCarReservation || ev.vehicleReservationId) && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1">
                                <Car className="w-2.5 h-2.5 text-blue-700" />
                                Bil reservert
                              </span>
                            )}
                            {busyOnly && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5 text-amber-700" />
                                Konfidensielt
                              </span>
                            )}
                            {ev.isWorkRelated && !busyOnly && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                                Jobb
                              </span>
                            )}
                            {ev.isSyncedWithGoogle && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-0.5">
                                <Globe className="w-2.5 h-2.5" />
                                Google Synk
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                            {displayTitle}
                          </h4>
                        </div>

                        <button
                          onClick={() => deleteCalendarEvent(ev.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Slett hendelse"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">
                            {formatTimeRange(ev.startTime, ev.endTime)}
                          </span>
                        </div>

                        {displayLocation && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{displayLocation}</span>
                          </div>
                        )}
                      </div>

                      {/* Auto Car Reservation Details */}
                      {ev.createsCarReservation && (
                        <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 text-xs space-y-0.5">
                          <div className="font-bold flex items-center gap-1 text-emerald-900">
                            <Car className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Bil reservert automatisk</span>
                          </div>
                          <p className="text-[11px] text-emerald-800">
                            Reisetid: <strong>{ev.bufferBeforeMinutes || 40}m</strong> før og{' '}
                            <strong>{ev.bufferAfterMinutes || 40}m</strong> etter
                          </p>
                        </div>
                      )}

                      {ev.htmlLink && (
                        <a
                          href={ev.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline pt-1"
                        >
                          <span>Åpne i Google Kalender</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <p>Ingen hendelser på denne datoen.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tilkoblede kalendere (Active Calendars with toggles and owner) */}
            <div className="backdrop-blur-md bg-white/60 rounded-3xl p-5 sm:p-6 border border-white/60 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-100/90 text-sky-800 flex items-center justify-center border border-sky-200/70 shadow-2xs">
                    <CalendarRange className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Tilkoblede kalendere
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Aktive kilder & synlighet
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/70 shadow-2xs">
                  {visibleCalendarsCount}/{allCalendars.length} synlige
                </span>
              </div>

              {/* Calendars List */}
              <div className="space-y-2">
                <div
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    showFamilyCarLine
                      ? 'bg-amber-50/80 border-amber-200/80 shadow-2xs'
                      : 'bg-slate-50/50 border-slate-200/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 shadow-2xs"
                      style={{ backgroundColor: FAMILY_CAR_LINE_COLOR }}
                      title={`Fargekode: ${FAMILY_CAR_LINE_COLOR}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-900 truncate">Familiebilen</h4>
                        <span
                          className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-0.5 shrink-0"
                          title="Avledet lag – ikke en egen kalender"
                        >
                          <Car className="w-2.5 h-2.5 text-amber-800" />
                          <span>Opptatt</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Sum av alle avtaler som sperrer bilen, pluss reisetid
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={showFamilyCarLine}
                    onClick={() => updateSettings({ showFamilyCarLine: !showFamilyCarLine })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      showFamilyCarLine ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                    title={
                      showFamilyCarLine
                        ? 'Klikk for å skjule bilstreken i ukevisning'
                        : 'Klikk for å vise bilstreken i ukevisning'
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        showFamilyCarLine ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {allCalendars.length > 0 ? (
                  allCalendars.map((cal) => {
                    const isVisible = isCalendarVisible(cal.id, cal);
                    const owner = getCalendarOwner(cal);
                    const calConfig = settings.calendarConfigs?.[cal.id];
                    const isCar =
                      (calConfig?.carMode && calConfig.carMode !== 'none') ||
                      cal.isCarCalendar ||
                      settings.carCalendarIds?.includes(cal.id);
                    const isConfidential =
                      calConfig?.privacyMode === 'busy_only' || cal.privacyMode === 'busy_only';
                    const targetVehicle = isCar
                      ? vehicles.find((v) => v.id === (calConfig?.targetVehicleId || cal.targetVehicleId)) || vehicles[0]
                      : null;

                    return (
                      <div
                        key={cal.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isVisible
                            ? 'bg-white/80 border-white/90 shadow-2xs hover:bg-white'
                            : 'bg-slate-50/50 border-slate-200/40 opacity-60'
                        }`}
                      >
                        {/* Left: Color dot & Details */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 shadow-2xs"
                            style={{ backgroundColor: cal.backgroundColor || '#0284c7' }}
                            title={`Fargekode: ${cal.backgroundColor || '#0284c7'}`}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {cal.customName || cal.summary}
                              </h4>
                              {isCar && (
                                <span
                                  className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-0.5 shrink-0"
                                  title={`Oppretter bilreservasjon for ${targetVehicle?.name || 'bil'}`}
                                >
                                  <Car className="w-2.5 h-2.5 text-blue-700" />
                                  <span>{targetVehicle?.name || 'Bil'}</span>
                                </span>
                              )}
                              {isConfidential && (
                                <span
                                  className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-0.5 shrink-0"
                                  title="Viser kun 'Opptatt' av personvernhensyn"
                                >
                                  <Lock className="w-2.5 h-2.5 text-amber-700" />
                                </span>
                              )}
                            </div>

                            {/* Person / Tilhørighet */}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              {owner ? (
                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                  <span
                                    className="w-2 h-2 rounded-full inline-block shrink-0"
                                    style={{ backgroundColor: owner.color || '#0284c7' }}
                                  />
                                  <span>{owner.name}</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 font-medium text-slate-500">
                                  <span>👥 Hele familien</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions (Settings gear & Visibility toggle switch) */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedCalForModal(cal)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            title="Kalenderinnstillinger (reisebuffer, bilreservering m.m.)"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Switch */}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isVisible}
                            onClick={() => toggleCalendarViewVisibility(cal.id, !isVisible)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                              isVisible ? 'bg-sky-600' : 'bg-slate-300'
                            }`}
                            title={
                              isVisible
                                ? 'Skjul hendelser i kalendervisning. Familiebilen påvirkes ikke.'
                                : 'Vis hendelser i kalendervisning'
                            }
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                isVisible ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400">
                    Ingen kalendere funnet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'week' && (
        <WeekTimeGrid
          events={sortedEvents}
          weekAnchor={currentDate}
          onWeekChange={setCurrentDate}
          onGoToToday={goToToday}
          getEventColor={getEventCalendarColor}
          dayNamesShort={dayNamesShort}
          monthNames={monthNames}
          carSpansByDay={carSpansByDay}
          showFamilyCarLine={showFamilyCarLine}
        />
      )}

      {/* MAIN VIEW: Agenda / List */}
      {viewMode === 'agenda' && (
        <div className="backdrop-blur-md bg-white/60 rounded-3xl p-6 border border-white/60 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/50 gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Kommende kalenderhendelser</h2>
              <p className="text-xs text-slate-500">
                {showPastEvents
                  ? 'Kronologisk tidslinje (viser både tidligere og fremtidige)'
                  : 'Kronologisk tidslinje for hele familien (kun fremtidige hendelser)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {pastEventsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPastEvents(!showPastEvents)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    showPastEvents
                      ? 'bg-blue-50 text-blue-800 border-blue-200 shadow-2xs'
                      : 'bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border-slate-200/80 shadow-2xs'
                  }`}
                  title={showPastEvents ? 'Skjul tidligere hendelser' : `Vis ${pastEventsCount} tidligere hendelser`}
                >
                  {showPastEvents ? 'Kun fremtidige' : `Vis tidligere (${pastEventsCount})`}
                </button>
              )}
              <span className="text-xs font-bold px-3 py-1.5 bg-white/80 backdrop-blur-xs text-slate-700 rounded-xl border border-white/60 shadow-2xs">
                {displayedAgendaEvents.length} {showPastEvents ? 'hendelser' : 'fremtidige'}
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-200/40">
            {displayedAgendaEvents.length > 0 ? (
              displayedAgendaEvents.map((ev) => {
                const evConfig = getEventCalendarConfig(ev, settings.calendarConfigs);
                const displayTitle = getDisplayEventTitle(ev, evConfig);
                const displayLocation = getDisplayEventLocation(ev, evConfig);
                const displayDescription = getDisplayEventDescription(ev, evConfig);
                const busyOnly = isBusyOnlyEvent(ev, evConfig);

                return (
                <div
                  key={ev.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-xs font-bold px-2.5 py-1 bg-white/80 border border-slate-200/60 text-slate-800 rounded-lg shadow-2xs">
                        {formatNorwegianDate(ev.startTime)}
                      </span>
                      <span className="text-xs font-bold text-sky-950 bg-sky-50/80 px-2.5 py-1 rounded-lg border border-sky-200/60 shadow-2xs">
                        {formatTimeRange(ev.startTime, ev.endTime)}
                      </span>
                      <span className="text-xs font-semibold text-slate-900">{ev.memberName}</span>
                      {busyOnly && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-amber-700" />
                          Konfidensielt
                        </span>
                      )}
                      {displayLocation && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-slate-600 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {displayLocation}
                        </span>
                      )}
                      {ev.isWorkRelated && !busyOnly && (
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                          Jobb
                        </span>
                      )}
                      {ev.isSyncedWithGoogle && (
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" />
                          2-veis Google Sync
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-bold text-slate-800">{displayTitle}</p>
                    {displayDescription && (
                      <p className="text-xs text-slate-600">{displayDescription}</p>
                    )}

                    {ev.createsCarReservation && (
                      <div className="flex items-center space-x-1.5 text-xs text-emerald-800 font-semibold pt-0.5">
                        <Car className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Automatisk bilreservasjon aktiv ({ev.bufferBeforeMinutes || 40}m før /{' '}
                          {ev.bufferAfterMinutes || 40}m etter)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    {ev.htmlLink && (
                      <a
                        href={ev.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-colors"
                        title="Åpne i Google Kalender"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => deleteCalendarEvent(ev.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Slett hendelse"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-sm text-slate-500 space-y-2">
                <p className="font-semibold text-slate-700">Ingen fremtidige kalenderhendelser funnet</p>
                <p className="text-xs text-slate-400">
                  {pastEventsCount > 0
                    ? `${pastEventsCount} tidligere hendelser er skjult for å holde listen ryddig.`
                    : 'Det er ingen planlagte avtaler fremover i tid for valgte filtre.'}
                </p>
                {pastEventsCount > 0 && !showPastEvents && (
                  <button
                    type="button"
                    onClick={() => setShowPastEvents(true)}
                    className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Vis tidligere hendelser ({pastEventsCount})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calendar Settings Modal */}
      {selectedCalForModal && (
        <CalendarSettingsModal
          calendar={selectedCalForModal}
          isOpen={true}
          currentConfig={settings.calendarConfigs?.[selectedCalForModal.id]}
          members={members}
          vehicles={vehicles}
          onClose={() => setSelectedCalForModal(null)}
          onSave={async (calId, updates) => {
            await updateCalendarSettings(calId, updates);
            setSelectedCalForModal(null);
          }}
        />
      )}
    </div>
  );
};
