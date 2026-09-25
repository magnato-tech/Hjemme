import React from 'react';
import { useFamily } from '../context/FamilyContext';
import {
  Home,
  Car,
  ListTodo,
  Calendar,
  TrendingUp,
  Settings,
  Sparkles,
  User,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
} from './Icons';

export type ActiveTab = 'dashboard' | 'car' | 'tasks' | 'calendar' | 'week' | 'settings';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenReserveCar: () => void;
  onOpenCreateTask: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenReserveCar,
  onOpenCreateTask,
}) => {
  const {
    members,
    activeMember,
    setActiveMemberId,
    currentWeek,
    getMemberCompletedPoints,
    reservations,
    firebaseUser,
    isFirestoreConnected,
    isFirestoreSyncing,
    signInWithFirebaseGoogle,
    signOutFirebaseUser,
  } = useFamily();

  const completedPoints = getMemberCompletedPoints(activeMember.id);
  const remainingPoints = Math.max(0, activeMember.weeklyPointsGoal - completedPoints);

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'I dag', icon: Home, badge: null },
    {
      id: 'car' as ActiveTab,
      label: 'Bil',
      icon: Car,
      badge: reservations.length > 0 ? reservations.length : null,
    },
    {
      id: 'tasks' as ActiveTab,
      label: 'Oppgaver',
      icon: ListTodo,
      badge: remainingPoints > 0 ? `${remainingPoints}p` : '✓',
      badgeColor: remainingPoints > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
    },
    { id: 'calendar' as ActiveTab, label: 'Kalender', icon: Calendar, badge: null },
    { id: 'week' as ActiveTab, label: 'Uke', icon: TrendingUp, badge: null },
    { id: 'settings' as ActiveTab, label: 'Innstillinger', icon: Settings, badge: null },
  ];

  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/65 border-b border-white/60 shadow-xs transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Left: Brand & Week */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center space-x-2.5 text-left group"
              >
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-orange-400 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform border border-white/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight block leading-tight">
                    Familiekoordinator
                  </span>
                  <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                    Uke {currentWeek} • Minst mulig administrasjon
                  </span>
                </div>
              </button>
            </div>

            {/* Middle (Desktop Navigation) */}
            <nav className="hidden md:flex items-center space-x-1 p-1 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/50 shadow-2xs">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                          isActive ? 'bg-slate-700 text-white' : item.badgeColor || 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right: Active Member Selector & Firestore Cloud Sync Status */}
            <div className="flex items-center space-x-2">
              {/* Firestore Cloud Sync Status */}
              <div className="hidden sm:flex items-center">
                {firebaseUser ? (
                  <div
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs font-medium"
                    title={`Firestore tilkoblet: ${firebaseUser.email}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden xl:inline text-[11px] font-semibold">Firestore aktiv</span>
                    <button
                      onClick={signOutFirebaseUser}
                      title="Logg ut av Firestore"
                      className="ml-1 text-emerald-600 hover:text-emerald-950"
                    >
                      <LogOut className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={signInWithFirebaseGoogle}
                    title="Logg inn med Google for å synkronisere data i sanntid med Firestore"
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70 text-xs font-medium transition-colors"
                  >
                    <Cloud className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-[11px] font-semibold">Aktiver Sky-synk</span>
                  </button>
                )}
              </div>

              {/* Member Selector */}
              <div className="flex items-center bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-white/60 shadow-2xs">
                <span className="text-xs text-slate-400 font-medium px-2 hidden lg:inline">
                  Viser som:
                </span>
                <div className="flex space-x-1">
                  {members.map((m) => {
                    const isCurrent = m.id === activeMember.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setActiveMemberId(m.id)}
                        title={`Bytt til ${m.name} (${m.role === 'admin' ? 'Admin' : m.role === 'adult' ? 'Voksen' : 'Barn/Ungdom'})`}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                          isCurrent
                            ? 'bg-white text-slate-900 shadow-xs border border-white/80 ring-1 ring-slate-900/5'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        }`}
                      >
                        <span>{m.avatarEmoji}</span>
                        <span className="truncate max-w-[65px] sm:max-w-none">{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md bg-white/80 border-t border-white/60 shadow-lg px-2 py-1.5">
        <div className="grid grid-cols-6 gap-0.5 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all relative ${
                  isActive ? 'text-indigo-900 font-bold bg-white/60 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                <span className="text-[10px] mt-0.5">{item.label}</span>
                {item.badge && (
                  <span className="absolute top-0.5 right-2 px-1 py-0.2 rounded-full text-[9px] font-bold bg-orange-500 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
