import React from 'react';
import { useFamily } from '../context/FamilyContext';
import {
  Car,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  MapPin,
  Check,
  AlertTriangle,
  TaskIcon,
  Shield,
  Zap,
  Sliders,
  RotateCw,
  Lock,
} from './Icons';
import { formatNorwegianDate, formatTime, formatTimeRange, isToday } from '../utils/dateUtils';
import { ActiveTab } from './Header';

interface DashboardTodayProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenReserveCar: () => void;
  onOpenCreateTask: () => void;
  onOpenAddCalendarEvent: () => void;
}

export const DashboardToday: React.FC<DashboardTodayProps> = ({
  setActiveTab,
  onOpenReserveCar,
  onOpenCreateTask,
  onOpenAddCalendarEvent,
}) => {
  const {
    activeMember,
    activeVehicle,
    reservations,
    calendarEvents,
    taskInstances,
    claimTask,
    completeTask,
    claimSuggestedTasks,
    getMemberCompletedPoints,
    getMemberClaimedPoints,
    currentWeek,
    settings,
  } = useFamily();

  const completedPoints = getMemberCompletedPoints(activeMember.id);
  const claimedPoints = getMemberClaimedPoints(activeMember.id);
  const remainingPoints = Math.max(0, activeMember.weeklyPointsGoal - completedPoints);
  const progressPercent = Math.min(
    100,
    Math.round((completedPoints / (activeMember.weeklyPointsGoal || 1)) * 100)
  );

  // Today's calendar events
  const todayCalendarEvents = calendarEvents.filter((ev) => isToday(ev.startTime));

  // Today's car reservations
  const todayReservations = reservations
    .filter((r) => isToday(r.startTime) && r.status !== 'cancelled')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // First current/upcoming reservation for availability calculation
  const nextReservation = todayReservations[0];

  // Active member's claimed or available tasks
  const myClaimedTasks = taskInstances.filter(
    (t) => t.status === 'claimed' && t.claimedByMemberId === activeMember.id
  );

  const availableTasks = taskInstances.filter((t) => t.status === 'available');

  // Smart recommender: Find task combination to fulfill remaining points
  const getSuggestedTasks = () => {
    if (remainingPoints <= 0 || availableTasks.length === 0) return [];
    
    // Sort available by descending points
    const sorted = [...availableTasks].sort((a, b) => b.points - a.points);
    let accum = 0;
    const selected: typeof availableTasks = [];

    // Try exact or close match
    for (const task of sorted) {
      if (accum + task.points <= remainingPoints) {
        selected.push(task);
        accum += task.points;
      }
    }

    // If still have remaining points and have tasks, take the first available
    if (selected.length === 0 && availableTasks.length > 0) {
      return [availableTasks[0]];
    }

    return selected;
  };

  const suggestedTasks = getSuggestedTasks();
  const suggestedPointsSum = suggestedTasks.reduce((sum, t) => sum + t.points, 0);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Welcome & Top Banner */}
      <div className="backdrop-blur-xl bg-slate-900/90 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 bg-orange-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-orange-300 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>{formatNorwegianDate(new Date())}</span>
              <span>•</span>
              <span>Uke {currentWeek}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Hei, {activeMember.name}!</span>
              <span className="text-2xl">{activeMember.avatarEmoji}</span>
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Her er dagens oversikt for familien. Minst mulig administrasjon – alt oppdateres automatisk.
            </p>
          </div>

          {/* Quick Action Grid */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2.5 w-full sm:w-auto">
            <button
              onClick={onOpenReserveCar}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-4.5 py-2.5 rounded-2xl text-sm font-semibold shadow-sm transition-all border border-orange-400/30"
            >
              <Car className="w-4 h-4" />
              <span>Reserver bil</span>
            </button>
            <button
              onClick={onOpenCreateTask}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4.5 py-2.5 rounded-2xl text-sm font-semibold transition-all border border-white/20 backdrop-blur-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Ny oppgave</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Car & Calendar (7 Cols on desktop) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* BILMODUL – STATUS I DAG */}
          <div className="backdrop-blur-md bg-white/60 rounded-3xl p-5 sm:p-6 border border-white/60 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/50">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-orange-100/80 text-orange-800 rounded-2xl border border-orange-200/60 shadow-2xs">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>{activeVehicle.name}</span>
                    {activeVehicle.licensePlate && (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white/80 text-slate-700 rounded-lg border border-slate-200 shadow-2xs">
                        {activeVehicle.licensePlate}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500">Tilgjengelighet og dagens reservasjoner</p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('car')}
                className="text-xs font-semibold text-orange-700 hover:text-orange-800 flex items-center gap-1 group bg-orange-50/80 hover:bg-orange-100/80 px-3 py-1.5 rounded-xl border border-orange-200/50 transition-colors"
              >
                <span>Alle turer</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Car Live Status Card */}
            <div className="mt-4">
              {todayReservations.length > 0 ? (
                <div className="space-y-3">
                  {todayReservations.map((res) => {
                    const startFormatted = formatTime(res.startTime);
                    const endFormatted = formatTime(res.endTime);
                    return (
                      <div
                        key={res.id}
                        className="p-4 rounded-2xl border border-white/60 bg-white/50 hover:bg-white/70 transition-all shadow-2xs backdrop-blur-xs"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-orange-100 text-orange-900 border border-orange-200">
                                Opptatt {startFormatted}–{endFormatted}
                              </span>
                              <span className="text-xs font-semibold text-slate-800">
                                {res.memberName}
                              </span>
                              {res.isConfidential && (
                                <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-md font-bold border border-amber-300 flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5 text-amber-700" />
                                  Konfidensielt
                                </span>
                              )}
                              {res.source === 'google_calendar' && !res.isConfidential && (
                                <span className="text-[10px] bg-sky-100/80 text-sky-800 px-1.5 py-0.5 rounded-md font-medium border border-sky-200/50">
                                  Google Kalender Auto
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-slate-800">{res.purpose}</p>
                            {res.location && (
                              <div className="flex items-center text-xs text-slate-500 gap-1 pt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>{res.location}</span>
                              </div>
                            )}
                          </div>
                          
                          {res.isWorkRelated && (
                            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50/90 border border-indigo-200/60 px-2 py-1 rounded-lg shrink-0">
                              Prio 1 (Jobb)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Availability Window */}
                  <div className="p-3.5 bg-emerald-50/80 backdrop-blur-xs rounded-2xl border border-emerald-200/80 text-emerald-950 text-xs flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="font-bold block text-emerald-900">✅ Bilen er ledig:</span>
                      <span className="text-emerald-800">
                        Før {formatTime(todayReservations[0].startTime)} og etter{' '}
                        {formatTime(todayReservations[todayReservations.length - 1].endTime)}
                      </span>
                    </div>
                    <button
                      onClick={onOpenReserveCar}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-xs transition-colors shrink-0 shadow-2xs"
                    >
                      Be om bilen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4.5 bg-emerald-50/80 backdrop-blur-xs rounded-2xl border border-emerald-200/80 text-emerald-900 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-bold">Bilen er helt ledig i dag!</p>
                      <p className="text-xs text-emerald-700">Ingen oppførte reservasjoner ennå.</p>
                    </div>
                  </div>
                  <button
                    onClick={onOpenReserveCar}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-2xs"
                  >
                    Reserver nå
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* KALENDER – I DAG */}
          <div className="backdrop-blur-md bg-white/60 rounded-3xl p-5 sm:p-6 border border-white/60 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/50">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-sky-100/80 text-sky-800 rounded-2xl border border-sky-200/60 shadow-2xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Kalender for i dag</h2>
                  <p className="text-xs text-slate-500">Familieavtaler og jobbmøter</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={onOpenAddCalendarEvent}
                  className="px-3 py-1.5 text-xs font-semibold bg-white/80 hover:bg-white text-sky-900 rounded-xl border border-sky-200/80 transition-all flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Legg til</span>
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className="text-xs font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1 group bg-sky-50/80 hover:bg-sky-100/80 px-3 py-1.5 rounded-xl border border-sky-200/50 transition-colors"
                >
                  <span>Vis alle</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            <div className="mt-4 divide-y divide-slate-200/40">
              {todayCalendarEvents.length > 0 ? (
                todayCalendarEvents.map((ev) => (
                  <div key={ev.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-700 bg-white/80 border border-slate-200/60 px-2 py-0.5 rounded-lg shadow-2xs">
                          {formatTimeRange(ev.startTime, ev.endTime)}
                        </span>
                        <span className="text-xs font-semibold text-slate-900">{ev.memberName}</span>
                        {ev.isConfidential && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-md font-bold border border-amber-300 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-amber-700" />
                            Konfidensielt
                          </span>
                        )}
                        {ev.location && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-slate-500 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {ev.location}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-800 font-medium">{ev.title}</p>
                    </div>

                    {ev.createsCarReservation && (
                      <span className="text-[11px] font-medium text-orange-900 bg-orange-50/90 border border-orange-200/80 px-2.5 py-1 rounded-xl shrink-0 flex items-center gap-1 shadow-2xs">
                        <Car className="w-3 h-3 text-orange-600" />
                        <span>Reserverer bil (+40m)</span>
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-sm text-slate-400">
                  Ingen oppførte kalenderhendelser for i dag.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Chores & Point Progress (5 Cols on desktop) */}
        <div className="lg:col-span-5 space-y-6">

          {/* HUSOPPGAVER & POENGSTATUS */}
          <div className="backdrop-blur-md bg-white/60 rounded-3xl p-5 sm:p-6 border border-white/60 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/50">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-100/80 text-indigo-800 rounded-2xl border border-indigo-200/60 shadow-2xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Husoppgaver</h2>
                  <p className="text-xs text-slate-500">{activeMember.name}s ukestatus</p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('tasks')}
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 flex items-center gap-1 group bg-indigo-50/80 hover:bg-indigo-100/80 px-3 py-1.5 rounded-xl border border-indigo-200/50 transition-colors"
              >
                <span>Mine oppgaver</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Point Goal Progress Card */}
            <div className="mt-4 p-4 rounded-2xl bg-white/50 backdrop-blur-xs border border-white/60 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ukentlig poengmål
                  </span>
                  <div className="text-xl font-bold text-slate-900">
                    {completedPoints} / {activeMember.weeklyPointsGoal} poeng
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-slate-500 block">Gjenstår</span>
                  <span className={`text-base font-bold ${remainingPoints === 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                    {remainingPoints > 0 ? `${remainingPoints} poeng` : 'Fullført! 🎉'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200/70 rounded-full h-3 overflow-hidden p-0.5 border border-white/50">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progressPercent >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-orange-400'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 font-medium">
                <span>{progressPercent}% fullført</span>
                {claimedPoints > 0 && <span>{claimedPoints}p reservert/pågår</span>}
              </div>
            </div>

            {/* AUTOMATISK FORSLAG / SMART SUGGESTER */}
            {remainingPoints > 0 && suggestedTasks.length > 0 && (
              <div className="mt-4 p-4 rounded-2xl bg-orange-50/80 backdrop-blur-xs border border-orange-200/90 text-orange-950 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <Zap className="w-4 h-4 text-orange-600" />
                    <h3 className="text-xs font-bold text-orange-900 uppercase tracking-wider">
                      Foreslått fordeling ({suggestedPointsSum}p)
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-orange-800">
                    Mangler {remainingPoints}p
                  </span>
                </div>

                <p className="text-xs text-orange-800 mb-3">
                  Ta disse oppgavene for å nå ukemålet ditt raskt:
                </p>

                <div className="space-y-1.5 mb-3">
                  {suggestedTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between text-xs bg-white/80 backdrop-blur-xs px-3 py-2 rounded-xl border border-orange-200/60 font-medium shadow-2xs"
                    >
                      <div className="flex items-center space-x-2">
                        <TaskIcon name={t.iconName} className="w-3.5 h-3.5 text-orange-800" />
                        <span>{t.title}</span>
                      </div>
                      <span className="font-bold text-orange-900">+{t.points}p</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => claimSuggestedTasks(suggestedTasks.map((t) => t.id))}
                  className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all border border-orange-400/30"
                >
                  Ta foreslåtte oppgaver ({suggestedPointsSum} poeng)
                </button>
              </div>
            )}

            {/* My Active/Claimed Tasks list */}
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Dine pågående oppgaver
              </h3>
              {myClaimedTasks.length > 0 ? (
                <div className="space-y-2">
                  {myClaimedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-white/60 backdrop-blur-xs rounded-2xl border border-white/60 shadow-2xs flex items-center justify-between hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                          <TaskIcon name={task.iconName} className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{task.title}</p>
                          <p className="text-xs text-slate-500">
                            {task.area} • {task.points} poeng
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => completeTask(task.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Ferdig!</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 text-center border border-dashed border-slate-300/80 rounded-2xl text-xs text-slate-500 bg-white/30 backdrop-blur-xs">
                  Du har ingen pågående oppgaver.{' '}
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="text-indigo-600 font-semibold underline hover:text-indigo-800"
                  >
                    Velg oppgaver her
                  </button>
                </div>
              )}
            </div>

            {/* Gjenstående ledige oppgaver (Quick list) */}
            <div className="mt-4 pt-4 border-t border-slate-200/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ledige oppgaver i huset ({availableTasks.length})
                </span>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Se alle
                </button>
              </div>

              <div className="space-y-1.5">
                {availableTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/40 backdrop-blur-xs hover:bg-white/70 border border-white/50 transition-all shadow-2xs"
                  >
                    <div className="flex items-center space-x-2">
                      <TaskIcon name={task.iconName} className="w-4 h-4 text-slate-600" />
                      <span className="text-xs font-semibold text-slate-800">{task.title}</span>
                      <span className="text-[11px] text-slate-500">({task.area})</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-indigo-800 px-2 py-0.5 bg-indigo-50/80 rounded-lg border border-indigo-100">
                        {task.points}p
                      </span>
                      <button
                        onClick={() => claimTask(task.id)}
                        className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-700 text-slate-700 rounded-xl transition-all shadow-2xs"
                      >
                        Ta oppgave
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Quick Nav Links Footer */}
          <div className="p-4.5 bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 flex flex-wrap gap-2 text-xs shadow-2xs">
            <span className="text-slate-500 font-semibold w-full block mb-0.5">Hurtigvalg:</span>
            <button
              onClick={onOpenReserveCar}
              className="px-3.5 py-1.5 bg-white/80 border border-white/70 text-slate-700 hover:text-slate-900 rounded-xl font-medium shadow-2xs hover:bg-white transition-all"
            >
              🚗 Ny bilreservasjon
            </button>
            <button
              onClick={onOpenCreateTask}
              className="px-3.5 py-1.5 bg-white/80 border border-white/70 text-slate-700 hover:text-slate-900 rounded-xl font-medium shadow-2xs hover:bg-white transition-all"
            >
              🧹 Ny oppgave
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className="px-3.5 py-1.5 bg-white/80 border border-white/70 text-slate-700 hover:text-slate-900 rounded-xl font-medium shadow-2xs hover:bg-white transition-all"
            >
              📋 Mine oppgaver
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="px-3.5 py-1.5 bg-white/80 border border-white/70 text-slate-700 hover:text-slate-900 rounded-xl font-medium shadow-2xs hover:bg-white transition-all"
            >
              ⚙️ Innstillinger
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
