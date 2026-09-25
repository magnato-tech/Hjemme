import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import {
  Settings,
  User,
  Car,
  Calendar,
  Sparkles,
  RotateCw,
  Plus,
  Trash2,
  Shield,
  Edit2,
  Home,
  Database,
  MapPin,
  Clock,
  Layers,
  ExternalLink,
  RefreshCw,
  Check,
  X,
  Sliders,
  Tag,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  Link,
  Eye,
  EyeOff,
  FlaskConical,
  UserPlus,
  Lock,
  Unlock,
} from './Icons';
import { Role, HouseArea, TaskTemplate, RecurrenceType, GoogleCalendarItem } from '../types';
import { CalendarSettingsModal } from './Modals/CalendarSettingsModal';

export const AdminSettings: React.FC = () => {
  const {
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
    settings,
    updateSettings,
    areas,
    addArea,
    updateArea,
    deleteArea,
    addRoomToArea,
    removeRoomFromArea,
    updateCarRules,
    calendarConnections,
    updateCalendarConnection,
    googleAccessToken,
    isGoogleConnected,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    availableGoogleCalendars,
    isLoadingCalendars,
    refreshGoogleCalendars,
    setSelectedGoogleCalendar,
    toggleCarCalendar,
    setCalendarPrivacyMode,
    updateCalendarSettings,
    updateGoogleCalendarConfig,
    addCustomGoogleCalendar,
    updateGoogleCalendarName,
    toggleCalendarVisibility,
    removeCustomGoogleCalendar,
    clearAllMockData,
    toggleDisableMockData,
    addTestMember,
    removeTestMembers,
    loadAllTestData,
    removeAllTestData,
    isTwoWaySyncing,
    lastGoogleSyncTime,
    googleSyncStatusMessage,
    syncTwoWayWithGoogle,
    taskTemplates,
    createTaskTemplate,
    updateTaskTemplate,
    deleteTaskTemplate,
    resetAllData,
    firebaseUser,
    isFirestoreConnected,
    isFirestoreSyncing,
    signInWithFirebaseGoogle,
    signOutFirebaseUser,
    pushAllToFirestore,
  } = useFamily();

  const [activeSubTab, setActiveSubTab] = useState<
    'family' | 'areas' | 'tasks' | 'car' | 'calendar' | 'firestore' | 'system'
  >('family');

  // Add member form state
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<Role>('child');
  const [newMemberGoal, setNewMemberGoal] = useState(10);
  const [newMemberEmoji, setNewMemberEmoji] = useState('🧒');
  const [newMemberCanDrive, setNewMemberCanDrive] = useState(false);

  // New Area form state
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaDesc, setNewAreaDesc] = useState('');
  const [newAreaInitialRooms, setNewAreaInitialRooms] = useState('');
  const [newRoomInputs, setNewRoomInputs] = useState<Record<string, string>>({});

  // New Vehicle form state
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleFuel, setNewVehicleFuel] = useState<'electric' | 'hybrid' | 'petrol' | 'diesel'>('electric');
  const [newVehicleNotes, setNewVehicleNotes] = useState('');

  // Custom calendars and modal states
  const [customCalendarIdInput, setCustomCalendarIdInput] = useState('');
  const [customCalendarNameInput, setCustomCalendarNameInput] = useState('');
  const [customCalendarColorInput, setCustomCalendarColorInput] = useState('#0284c7');
  const [showCustomCalendarInput, setShowCustomCalendarInput] = useState(false);
  const [editingCalId, setEditingCalId] = useState<string | null>(null);
  const [editingCalName, setEditingCalName] = useState<string>('');
  const [settingsModalCal, setSettingsModalCal] = useState<GoogleCalendarItem | null>(null);
  const [calendarToDelete, setCalendarToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isClearingMock, setIsClearingMock] = useState(false);
  const [mockClearedFeedback, setMockClearedFeedback] = useState(false);

  // Test data and test persons state
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeKeepAdminOnly, setPurgeKeepAdminOnly] = useState(false);
  const [showAddTestPersonForm, setShowAddTestPersonForm] = useState(false);
  const [testPersonRole, setTestPersonRole] = useState<Role>('child');
  const [testPersonCustomName, setTestPersonCustomName] = useState('');

  // Task Template Create / Edit Modal in Admin
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [isCreatingTaskTemplate, setIsCreatingTaskTemplate] = useState(false);
  const [templateFormTitle, setTemplateFormTitle] = useState('');
  const [templateFormDesc, setTemplateFormDesc] = useState('');
  const [templateFormArea, setTemplateFormArea] = useState('1. etasje');
  const [templateFormRoom, setTemplateFormRoom] = useState('Stue');
  const [templateFormPoints, setTemplateFormPoints] = useState(2);
  const [templateFormRecurrence, setTemplateFormRecurrence] = useState<RecurrenceType>('weekly');
  const [templateFormDeadline, setTemplateFormDeadline] = useState('Søndag 20:00');
  const [templateFormIsMandatory, setTemplateFormIsMandatory] = useState(false);
  const [templateFormIcon, setTemplateFormIcon] = useState('brush');

  // Notification Banner
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => setBannerMessage(null), 3500);
  };

  // Handlers
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    addMember({
      name: newMemberName.trim(),
      role: newMemberRole,
      avatarColor: 'bg-emerald-600',
      avatarEmoji: newMemberEmoji,
      weeklyPointsGoal: Number(newMemberGoal) || 10,
      isActive: true,
      canReserveCar: newMemberRole !== 'child' || newMemberCanDrive,
      canManageTasks: newMemberRole === 'admin',
      canManageFamily: newMemberRole === 'admin',
    });

    setNewMemberName('');
    showNotification(`✅ ${newMemberName} er lagt til som familiemedlem!`);
  };

  const handleAddArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;

    const rooms = newAreaInitialRooms
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    addArea({
      name: newAreaName.trim(),
      description: newAreaDesc.trim() || undefined,
      rooms: rooms.length > 0 ? rooms : ['Hovedrom'],
    });

    setNewAreaName('');
    setNewAreaDesc('');
    setNewAreaInitialRooms('');
    showNotification(`✅ Området "${newAreaName}" er opprettet!`);
  };

  const handleAddRoom = (areaId: string) => {
    const roomName = (newRoomInputs[areaId] || '').trim();
    if (!roomName) return;
    addRoomToArea(areaId, roomName);
    setNewRoomInputs((prev) => ({ ...prev, [areaId]: '' }));
    showNotification(`✅ Rom "${roomName}" lagt til!`);
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicleName.trim()) return;

    addVehicle({
      name: newVehicleName.trim(),
      licensePlate: newVehiclePlate.trim() || undefined,
      ownerId: members[0]?.id || 'member_magnar',
      isAvailable: true,
      color: 'bg-slate-800',
      fuelType: newVehicleFuel,
      notes: newVehicleNotes.trim() || undefined,
    });

    setNewVehicleName('');
    setNewVehiclePlate('');
    setNewVehicleNotes('');
    showNotification(`✅ Kjøretøyet "${newVehicleName}" er registrert!`);
  };

  const openNewTaskTemplateModal = () => {
    setEditingTemplate(null);
    setTemplateFormTitle('');
    setTemplateFormDesc('');
    setTemplateFormArea(areas[0]?.name || '1. etasje');
    setTemplateFormRoom(areas[0]?.rooms[0] || 'Kjøkken');
    setTemplateFormPoints(2);
    setTemplateFormRecurrence('weekly');
    setTemplateFormDeadline('Søndag 20:00');
    setTemplateFormIsMandatory(false);
    setTemplateFormIcon('brush');
    setIsCreatingTaskTemplate(true);
  };

  const openEditTaskTemplateModal = (tmpl: TaskTemplate) => {
    setEditingTemplate(tmpl);
    setTemplateFormTitle(tmpl.title);
    setTemplateFormDesc(tmpl.description);
    setTemplateFormArea(tmpl.area);
    setTemplateFormRoom(tmpl.room);
    setTemplateFormPoints(tmpl.points);
    setTemplateFormRecurrence(tmpl.recurrence);
    setTemplateFormDeadline(tmpl.deadlineDay);
    setTemplateFormIsMandatory(tmpl.isMandatory);
    setTemplateFormIcon(tmpl.iconName);
    setIsCreatingTaskTemplate(true);
  };

  const handleSaveTaskTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateFormTitle.trim()) return;

    if (editingTemplate) {
      updateTaskTemplate(editingTemplate.id, {
        title: templateFormTitle.trim(),
        description: templateFormDesc.trim(),
        area: templateFormArea,
        room: templateFormRoom,
        points: Number(templateFormPoints) || 1,
        recurrence: templateFormRecurrence,
        deadlineDay: templateFormDeadline,
        isMandatory: templateFormIsMandatory,
        iconName: templateFormIcon,
      });
      showNotification(`✅ Oppgavemalen "${templateFormTitle}" er oppdatert!`);
    } else {
      createTaskTemplate({
        title: templateFormTitle.trim(),
        description: templateFormDesc.trim(),
        area: templateFormArea,
        room: templateFormRoom,
        points: Number(templateFormPoints) || 1,
        recurrence: templateFormRecurrence,
        deadlineDay: templateFormDeadline,
        eligibleMemberIds: members.map((m) => m.id),
        isActive: true,
        isMandatory: templateFormIsMandatory,
        iconName: templateFormIcon,
      });
      showNotification(`✅ Ny oppgavemal "${templateFormTitle}" er opprettet!`);
    }

    setIsCreatingTaskTemplate(false);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md bg-white/60 p-6 sm:p-7 rounded-3xl border border-white/60 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-13 h-13 bg-slate-900 text-white rounded-2xl flex items-center justify-center border border-slate-800 shadow-2xs">
            <Sliders className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Familiekontrollpanel & Administrasjon
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Konfigurer familiens rutiner, husstruktur, bilregler, oppgavebibliotek og datalager
            </p>
          </div>
        </div>

        {/* Firestore Cloud Status badge */}
        <div className="flex items-center space-x-2">
          <div
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all ${
              isFirestoreConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4 text-emerald-600" />
            <span>{isFirestoreConnected ? 'Firestore aktiv' : 'Firestore frakoblet'}</span>
          </div>
        </div>
      </div>

      {bannerMessage && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm text-center shadow-xs animate-fade-in">
          {bannerMessage}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex p-1.5 bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 space-x-1 overflow-x-auto shadow-2xs">
        {[
          { id: 'family', label: '1. Medlemmer & Roller', icon: User },
          { id: 'areas', label: '2. Husstruktur & Områder', icon: Home },
          { id: 'tasks', label: '3. Oppgavebibliotek', icon: Sparkles },
          { id: 'car', label: '4. Biler & Bilregler', icon: Car },
          { id: 'calendar', label: '5. Kalender & Reisetid', icon: Calendar },
          { id: 'firestore', label: '6. Firestore Skydatabase', icon: Cloud },
          { id: 'system', label: '7. System / Demo', icon: RotateCw },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`py-2.5 px-4 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: FAMILIE & MEDLEMMER */}
      {activeSubTab === 'family' && (
        <div className="space-y-6">
          <div className="backdrop-blur-md bg-white/60 rounded-3xl p-6 border border-white/60 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Familiemedlemmer, Roller & Poengmål</h2>
                <p className="text-xs text-slate-500">
                  Konfigurer hvem som er administrator, hvem som kan reservere bil, og ukentlige poengmål for hver person.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowAddTestPersonForm(!showAddTestPersonForm)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs transition-colors"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>+ Testperson</span>
                </button>
                {members.some((m) => m.isTestPerson || m.id === 'member_marcus' || m.id === 'member_synelle') && (
                  <button
                    type="button"
                    onClick={() => {
                      removeTestMembers();
                      showNotification('🧹 Alle testpersoner ble fjernet');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                    title="Fjern kun testpersoner"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Fjern testpersoner</span>
                  </button>
                )}
              </div>
            </div>

            {/* Hurtig-skjema for ny testperson */}
            {showAddTestPersonForm && (
              <div className="p-4 bg-purple-50/80 rounded-2xl border border-purple-200 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-purple-600" />
                    Legg til ny testperson for testing
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddTestPersonForm(false)}
                    className="text-purple-400 hover:text-purple-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={testPersonCustomName}
                    onChange={(e) => setTestPersonCustomName(e.target.value)}
                    placeholder="Valgfritt navn (f.eks. Ola Test)"
                    className="px-3 py-2 rounded-xl border border-purple-200 bg-white text-xs"
                  />
                  <select
                    value={testPersonRole}
                    onChange={(e) => setTestPersonRole(e.target.value as Role)}
                    className="px-3 py-2 rounded-xl border border-purple-200 bg-white text-xs font-semibold"
                  >
                    <option value="child">Barn / Ungdom (poeng & oppgaver)</option>
                    <option value="adult">Voksen (bilreservasjon & avtaler)</option>
                    <option value="admin">Administrator</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = addTestMember(testPersonRole, testPersonCustomName.trim() || undefined);
                      const assigned = members.find((m) => m.id === newId);
                      showNotification(`🧪 Testperson lagt til!`);
                      setTestPersonCustomName('');
                      setShowAddTestPersonForm(false);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                  >
                    Opprett testperson
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="p-4.5 rounded-2xl border border-white/80 bg-white/50 backdrop-blur-xs flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-13 h-13 rounded-2xl bg-white/80 border border-white/80 shadow-2xs flex items-center justify-center text-3xl shrink-0">
                      {m.avatarEmoji}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-base">{m.name}</h4>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-white/80 text-slate-700 capitalize border border-slate-200/50 shadow-2xs">
                          {m.role === 'admin'
                            ? 'Administrator'
                            : m.role === 'adult'
                            ? 'Voksen'
                            : 'Barn/Ungdom'}
                        </span>
                        {(m.isTestPerson || m.id === 'member_marcus' || m.id === 'member_synelle') && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
                            <FlaskConical className="w-2.5 h-2.5" />
                            Testperson
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Ukentlig poengmål: <strong className="text-slate-800">{m.weeklyPointsGoal} poeng</strong> •{' '}
                        {m.canReserveCar ? (
                          <span className="text-emerald-700 font-medium">🚗 Kan reservere bil</span>
                        ) : (
                          <span className="text-slate-400">Ingen bilrettighet</span>
                        )}
                        {m.email ? ` • ${m.email}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                    <div className="flex items-center space-x-1.5 bg-white/80 px-2.5 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-xs text-slate-500 font-medium">Ukemål:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={m.weeklyPointsGoal}
                        onChange={(e) =>
                          updateMember(m.id, { weeklyPointsGoal: Number(e.target.value) || 0 })
                        }
                        className="w-12 text-xs font-bold text-center border-b border-slate-300 focus:outline-hidden"
                      />
                      <span className="text-xs text-slate-500">p</span>
                    </div>

                    <select
                      value={m.role}
                      onChange={(e) => {
                        const role = e.target.value as Role;
                        updateMember(m.id, {
                          role,
                          canManageFamily: role === 'admin',
                          canManageTasks: role === 'admin',
                          canReserveCar: role !== 'child' || m.canReserveCar,
                        });
                      }}
                      className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200/80 bg-white/80 shadow-2xs"
                    >
                      <option value="admin">Administrator</option>
                      <option value="adult">Voksen</option>
                      <option value="child">Barn / Ungdom</option>
                    </select>

                    <label className="flex items-center space-x-1.5 text-xs text-slate-700 bg-white/80 px-2.5 py-2 rounded-xl border border-slate-200/80 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={m.canReserveCar}
                        onChange={(e) => updateMember(m.id, { canReserveCar: e.target.checked })}
                        className="w-3.5 h-3.5 rounded text-sky-600"
                      />
                      <span>Biladgang</span>
                    </label>

                    <button
                      onClick={() => deleteMember(m.id)}
                      disabled={members.length <= 1}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-30"
                      title="Fjern familiemedlem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Member Form */}
          <div className="backdrop-blur-md bg-white/60 rounded-3xl p-6 border border-white/60 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Legg til nytt familiemedlem</h3>
            <form onSubmit={handleAddMember} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Navn</label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="F.eks. Kari"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-xs text-sm shadow-2xs focus:ring-2 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Emoji / Avatar</label>
                <select
                  value={newMemberEmoji}
                  onChange={(e) => setNewMemberEmoji(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-xs text-sm shadow-2xs"
                >
                  <option value="👦">👦 Gutt</option>
                  <option value="👧">👧 Jente</option>
                  <option value="👨‍💼">👨‍💼 Far / Mann</option>
                  <option value="👩‍🦰">👩‍🦰 Mor / Kvinne</option>
                  <option value="🧑">🧑 Ungdom</option>
                  <option value="🧒">🧒 Barn</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Rolle</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => {
                    const r = e.target.value as Role;
                    setNewMemberRole(r);
                    if (r !== 'child') setNewMemberCanDrive(true);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-xs text-sm shadow-2xs"
                >
                  <option value="admin">Administrator</option>
                  <option value="adult">Voksen</option>
                  <option value="child">Barn/ungdom</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ukentlig poengmål</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newMemberGoal}
                  onChange={(e) => setNewMemberGoal(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-xs text-sm font-bold shadow-2xs"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-bold shadow-xs transition-colors"
                >
                  + Legg til person
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: HUSSTRUKTUR & OMRÅDER (PRIORITET 3) */}
      {activeSubTab === 'areas' && (
        <div className="space-y-6">
          <div className="backdrop-blur-md bg-white/60 rounded-3xl p-6 border border-white/60 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Husstruktur, Etasjer & Rom</h2>
                <p className="text-xs text-slate-500">
                  Opprett og administrer familiens områder og rom. Disse brukes direkte ved oppgaveopprettelse.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {areas.map((area) => (
                <div
                  key={area.id}
                  className="p-5 rounded-3xl border border-white/80 bg-white/50 backdrop-blur-xs space-y-3 shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2.5 bg-indigo-100/80 text-indigo-900 rounded-xl border border-indigo-200/60 shadow-2xs">
                          <Home className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">{area.name}</h4>
                          {area.description && (
                            <p className="text-xs text-slate-500">{area.description}</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => deleteArea(area.id)}
                        disabled={areas.length <= 1}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-20"
                        title="Slett område"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Rooms Pills */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Rom & soner i dette området:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {area.rooms.map((room) => (
                          <span
                            key={room}
                            className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/90 rounded-xl border border-slate-200/80 text-xs font-semibold text-slate-800 shadow-2xs"
                          >
                            <span>{room}</span>
                            <button
                              onClick={() => removeRoomFromArea(area.id, room)}
                              className="text-slate-400 hover:text-rose-600 text-xs"
                              title="Fjern rom"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Add Room input */}
                  <div className="pt-2 border-t border-slate-200/50 flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Legg til rom (f.eks. Gang)..."
                      value={newRoomInputs[area.id] || ''}
                      onChange={(e) =>
                        setNewRoomInputs((prev) => ({ ...prev, [area.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddRoom(area.id);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-white/80 bg-white/80 text-xs shadow-2xs focus:ring-1 focus:ring-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddRoom(area.id)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs"
                    >
                      + Rom
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Area Form */}
          <div className="backdrop-blur-md bg-white/60 rounded-3xl p-6 border border-white/60 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Opprett nytt område eller etasje</h3>
            <form onSubmit={handleAddArea} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Områdenavn</label>
                <input
                  type="text"
                  required
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder="F.eks. Loft / Anneks"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 bg-white/70 text-sm shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Beskrivelse</label>
                <input
                  type="text"
                  value={newAreaDesc}
                  onChange={(e) => setNewAreaDesc(e.target.value)}
                  placeholder="F.eks. Ekstra oppbevaring og gjesterom"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 bg-white/70 text-sm shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Rom (kommaseparert)
                </label>
                <input
                  type="text"
                  value={newAreaInitialRooms}
                  onChange={(e) => setNewAreaInitialRooms(e.target.value)}
                  placeholder="F.eks. Gjesterom, Bod, Trapp"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 bg-white/70 text-sm shadow-2xs"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold shadow-xs transition-colors"
                >
                  + Opprett område
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: OPPGAVEBIBLIOTEK (PRIORITET 2 & 5) */}
      {activeSubTab === 'tasks' && (
        <div className="space-y-6">
          <div className="backdrop-blur-md bg-white/60 rounded-3xl p-6 border border-white/60 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Konfigurerbart Oppgavebibliotek</h2>
                <p className="text-xs text-slate-500">
                  Definer familiens faste oppgaver, poeng, etasje, rom, frist og gjentakelsesfrekvens.
                </p>
              </div>
              <button
                onClick={openNewTaskTemplateModal}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-xs flex items-center gap-1.5 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Ny oppgavemal</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {taskTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-5 rounded-3xl border border-white/80 bg-white/50 backdrop-blur-xs flex flex-col justify-between space-y-3 shadow-2xs hover:border-indigo-200 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-white/80 border border-slate-200/70 text-slate-800 rounded-2xl shadow-2xs text-lg">
                          ✨
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">{tmpl.title}</h4>
                          <p className="text-xs text-slate-500">
                            {tmpl.area} • {tmpl.room}
                          </p>
                        </div>
                      </div>

                      <span className="px-3 py-1 bg-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-2xs">
                        {tmpl.points} poeng
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{tmpl.description}</p>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-1">
                      <span className="bg-white/80 px-2 py-0.5 rounded-lg border border-slate-200/60 font-medium">
                        🔄 {tmpl.recurrence === 'weekly' ? 'Hver uke (Auto)' : tmpl.recurrence}
                      </span>
                      <span className="bg-white/80 px-2 py-0.5 rounded-lg border border-slate-200/60 font-medium">
                        ⏰ Frist: {tmpl.deadlineDay}
                      </span>
                      {tmpl.isMandatory && (
                        <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-lg font-semibold border border-rose-100">
                          Obligatorisk
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/50 flex items-center justify-between">
                    <label className="flex items-center space-x-2 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tmpl.isActive}
                        onChange={(e) => updateTaskTemplate(tmpl.id, { isActive: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                      <span>Aktiv i pool</span>
                    </label>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => openEditTaskTemplateModal(tmpl)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white/80 rounded-xl transition-colors"
                        title="Rediger oppgavemal"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTaskTemplate(tmpl.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Slett oppgavemal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BILER & BILREGLER (PRIORITET 8) */}
      {activeSubTab === 'car' && (
        <div className="space-y-6">
          <div className="backdrop-blur-md bg-white/60 rounded-3xl p-6 border border-white/60 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Registrerte Biler & Kjøretøy</h2>
              <p className="text-xs text-slate-500">
                Administrer familiens biler. Appen støtter flere biler og automatisk konfliktvarsling.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className={`p-5 rounded-3xl border ${
                    v.id === activeVehicleId
                      ? 'border-indigo-400 bg-white/80 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-white/80 bg-white/50 shadow-2xs'
                  } backdrop-blur-xs space-y-3 flex flex-col justify-between`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-2xs">
                          <Car className="w-5 h-5 text-indigo-300" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">{v.name}</h4>
                          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200">
                            {v.licensePlate || 'IKKE REGISTRERT'}
                          </span>
                        </div>
                      </div>

                      {v.id === activeVehicleId && (
                        <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-xl border border-emerald-200">
                          Aktiv primærbil
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 pt-1">
                      <p>
                        Drivstoff:{' '}
                        <strong>
                          {v.fuelType === 'electric'
                            ? 'Elektrisk'
                            : v.fuelType === 'hybrid'
                            ? 'Hybrid'
                            : 'Fossilt'}
                        </strong>
                      </p>
                      {v.notes && <p className="italic text-slate-500">«{v.notes}»</p>}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/50 flex items-center justify-between">
                    {v.id !== activeVehicleId ? (
                      <button
                        onClick={() => setActiveVehicleId(v.id)}
                        className="text-xs text-indigo-600 font-bold hover:underline"
                      >
                        Sett som aktiv bil
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Valgt som standard</span>
                    )}

                    <button
                      onClick={() => deleteVehicle(v.id)}
                      disabled={vehicles.length <= 1}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-xl disabled:opacity-20"
                      title="Slett bil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bilregler & Prioritet */}
            <div className="pt-4 border-t border-slate-200/60 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Familiens Bilregler & Prioriteter</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white/60 rounded-2xl border border-white/80 space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Primærbruker & Prioritet (Prio 1)
                  </label>
                  <select
                    value={settings.carRules?.primaryUserId || 'member_magnar'}
                    onChange={(e) => updateCarRules({ primaryUserId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Avtaler for primærbrukeren får automatisk prioritet ved eventuell bilkonflikt.
                  </p>
                </div>

                <div className="p-4 bg-white/60 rounded-2xl border border-white/80 space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Konflikthåndtering
                  </label>
                  <select
                    value={settings.carRules?.priorityOverrideRule || 'work_always'}
                    onChange={(e) => updateCarRules({ priorityOverrideRule: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                  >
                    <option value="work_always">Jobbrelaterte avtaler overstyrer private turer</option>
                    <option value="primary_user_always">Primærbrukers avtaler har alltid forrang</option>
                    <option value="first_come">Førstemann til mølla</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Hva som skjer når to personer trenger bilen på samme tidspunkt.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Add New Car Form */}
          <div className="backdrop-blur-md bg-white/60 rounded-3xl p-6 border border-white/60 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Registrer ny bil</h3>
            <form onSubmit={handleAddVehicle} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Bilnavn</label>
                <input
                  type="text"
                  required
                  value={newVehicleName}
                  onChange={(e) => setNewVehicleName(e.target.value)}
                  placeholder="F.eks. Elbil 2 / Hyttebil"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 bg-white/70 text-sm shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Registreringsnr</label>
                <input
                  type="text"
                  value={newVehiclePlate}
                  onChange={(e) => setNewVehiclePlate(e.target.value)}
                  placeholder="F.eks. EC 12345"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 bg-white/70 text-sm font-mono uppercase shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Drivstoff</label>
                <select
                  value={newVehicleFuel}
                  onChange={(e) => setNewVehicleFuel(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 bg-white/70 text-sm shadow-2xs"
                >
                  <option value="electric">Elektrisk (Elbil)</option>
                  <option value="hybrid">Plug-in Hybrid</option>
                  <option value="petrol">Bensin</option>
                  <option value="diesel">Diesel</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-bold shadow-xs transition-colors"
                >
                  + Legg til bil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: KALENDER & REISETID (PRIORITET 9 & 10) */}
      {activeSubTab === 'calendar' && (
        <div className="space-y-6">
          {/* GOOGLE KALENDER – SKRIVEBESKYTTET INTEGRASJON */}
          <div className="backdrop-blur-md bg-white/70 rounded-3xl p-6 border border-white/70 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/70">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 rounded-2xl bg-white/90 text-blue-600 flex items-center justify-center font-black text-lg border border-blue-200/80 shadow-2xs">
                    G
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-bold text-slate-900">
                        Google Kalender-synkronisering
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Skrivebeskyttet (kun lesing)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Leser avtaler for å beregne ledig tid for bilen. Appen kan <strong>aldri endre eller slette</strong> noe i Google Kalender.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => refreshGoogleCalendars()}
                  disabled={isLoadingCalendars}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white/80 hover:bg-white text-xs font-semibold text-slate-700 flex items-center space-x-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                  title="Oppdater liste over kalendere fra din Google-konto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoadingCalendars ? 'animate-spin' : ''}`} />
                  <span>{isLoadingCalendars ? 'Henter...' : 'Oppdater kalenderliste'}</span>
                </button>

                {isGoogleConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={() => syncTwoWayWithGoogle('member_magnar')}
                      disabled={isTwoWaySyncing}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                      title="Oppdaterer hendelser fra Google Kalender"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTwoWaySyncing ? 'animate-spin' : ''}`} />
                      <span>{isTwoWaySyncing ? 'Oppdaterer hendelser...' : 'Oppdater hendelser'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        disconnectGoogleCalendar();
                        showNotification('ℹ️ Frakoblet Google Kalender');
                      }}
                      className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Koble fra
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => connectGoogleCalendar()}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Link className="w-3.5 h-3.5 text-blue-400" />
                    <span>Koble til Google (Lesetilgang)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Statuskort for tilkobling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-white/70 backdrop-blur-xs rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                <span className="text-slate-500 font-medium block">Google Kalender-konto:</span>
                <span className="font-bold text-slate-900 block truncate" title={settings.googleCalendarConfig?.calendarName || settings.googleCalendarConfig?.calendarId || 'Ikke valgt'}>
                  {settings.googleCalendarConfig?.calendarName || settings.googleCalendarConfig?.calendarId || 'Magnar Totland (Primær)'}
                </span>
                <span className="text-[10px] text-slate-400 block truncate font-mono">
                  {settings.googleCalendarConfig?.calendarId || 'primary'}
                </span>
              </div>

              <div className="p-3.5 bg-white/70 backdrop-blur-xs rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                <span className="text-slate-500 font-medium block">Siste synkronisering:</span>
                <span className="font-bold text-slate-800 block">
                  {lastGoogleSyncTime
                    ? new Date(lastGoogleSyncTime).toLocaleTimeString('nb-NO', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      }) + ' i dag'
                    : 'Aktiv (sanntid)'}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isGoogleConnected ? 'Tilkoblet og oppdatert' : 'Venter på tilkobling'}
                </span>
              </div>
            </div>

            {/* Google-konto statusmelding */}
            {googleSyncStatusMessage && (
              <div className="p-3 bg-sky-50/90 text-sky-950 text-xs rounded-2xl border border-sky-200/90 flex items-center justify-between gap-2">
                <span>ℹ️ {googleSyncStatusMessage}</span>
              </div>
            )}

            {/* KONTROLL FOR MOCK-DATA / EKTE DATA */}
            <div className="p-4 rounded-2xl bg-white/90 border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>🧹</span>
                    <span>Mock-data og ekte data</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {settings.disableMockData
                      ? 'Mock-data er slått AV. Kun faktiske Google-kalendere og reelle avtaler benyttes.'
                      : 'Mock-data er for øyeblikket PÅ. Eksempelavtaler og prøvekalendere vises i appen.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const next = !settings.disableMockData;
                      await toggleDisableMockData(next);
                      showNotification(next ? '✅ Mock-data er slått av (kun ekte data)' : 'ℹ️ Mock-data er slått på');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      settings.disableMockData
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {settings.disableMockData ? '✅ Mock-data: AV' : 'Slå av mock-data'}
                  </button>

                  <button
                    type="button"
                    disabled={isClearingMock}
                    onClick={async () => {
                      setIsClearingMock(true);
                      try {
                        await clearAllMockData();
                        setMockClearedFeedback(true);
                        showNotification('✅ Alle fiktive demodata er slettet og mock-data er deaktivert!');
                        setTimeout(() => setMockClearedFeedback(false), 3000);
                      } catch (err) {
                        console.error('Feil ved fjerning av demodata:', err);
                        showNotification('❌ Feil ved fjerning av demodata');
                      } finally {
                        setIsClearingMock(false);
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer border shadow-2xs ${
                      mockClearedFeedback
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400/30'
                        : isClearingMock
                        ? 'bg-rose-100 text-rose-500 border-rose-300 opacity-80 cursor-wait'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 hover:border-rose-300'
                    }`}
                    title="Fjern alle fiktive avtaler, testreservasjoner og demokalendere nå"
                  >
                    {isClearingMock ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Fjerner demodata...</span>
                      </>
                    ) : mockClearedFeedback ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Demodata fjernet!</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Fjern demodata nå</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* TILKOBLEDE KALENDERE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Tilkoblede kalendere
                  </h3>
                  <p className="text-xs text-slate-500">
                    Oversikt over familiens kalendere. Trykk på <strong>«Innstillinger»</strong> på en kalender for å styre bilsperre, unntak og reisetidsbuffer, eller bruk <strong>«Synlig»</strong>-knappen for å vise/skjule i kalendervisningen.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCustomCalendarInput(!showCustomCalendarInput)}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  {showCustomCalendarInput ? 'Skjul kalender-skjema' : '+ Legg til kalender (ID / iCal)'}
                </button>
              </div>

              {/* Kalendervalg kort */}
              {availableGoogleCalendars.length === 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>📅</span>
                    <span>Ingen Google-kalendere i listen</span>
                  </p>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    Trykk på <strong>«Koble til Google (Lesetilgang)»</strong> ovenfor for å hente kalenderne dine, eller klikk på <strong>«+ Angi tilpasset Kalender-ID»</strong> for å legge til en kalender med eget navn med én gang.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5">
                  {availableGoogleCalendars.map((cal) => {
                    const isLegacyPrimaryCar =
                      (settings.googleCalendarConfig?.calendarId || 'primary') === cal.id;
                    const isCarCalendar =
                      (settings.carCalendarIds && settings.carCalendarIds.length > 0)
                        ? settings.carCalendarIds.includes(cal.id)
                        : isLegacyPrimaryCar;
                    const perCal = settings.calendarConfigs?.[cal.id];
                    const carMode =
                      perCal?.carMode ||
                      (isCarCalendar
                        ? settings.googleCalendarConfig?.filterMode === 'work_only'
                          ? 'work_only'
                          : 'all'
                        : 'none');
                    const isCarActive = carMode !== 'none';
                    const isVisible =
                      perCal?.enabledForDisplay !== false &&
                      cal.enabledForDisplay !== false &&
                      !(settings.disabledCalendarIds || []).includes(cal.id);
                    const isEditing = editingCalId === cal.id;
                    const displayName = perCal?.customName || cal.customName || cal.summary;
                    const privacyMode =
                      perCal?.privacyMode ||
                      (settings.calendarPrivacyModes && settings.calendarPrivacyModes[cal.id]) ||
                      cal.privacyMode ||
                      'full';
                    const assignedMember = members.find(
                      (m) => m.id === (perCal?.assignedMemberId || cal.assignedMemberId)
                    );
                    const bufferBefore =
                      perCal?.bufferBeforeMinutes ??
                      cal.bufferBeforeMinutes ??
                      settings.defaultTravelBufferBefore ??
                      40;
                    const bufferAfter =
                      perCal?.bufferAfterMinutes ??
                      cal.bufferAfterMinutes ??
                      settings.defaultTravelBufferAfter ??
                      40;
                    const calVehicleId =
                      perCal?.targetVehicleId ||
                      cal.targetVehicleId ||
                      settings.googleCalendarConfig?.targetVehicleId ||
                      activeVehicleId;
                    const targetVehicle =
                      vehicles.find((v) => v.id === calVehicleId) || vehicles[0];

                    return (
                      <div
                        key={cal.id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          isCarActive
                            ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                            : isVisible
                            ? 'bg-white/80 hover:bg-white border-slate-200/90 shadow-2xs'
                            : 'bg-slate-50/70 border-slate-200/60 opacity-80'
                        }`}
                      >
                        <div className="flex flex-col gap-3">
                          {/* Øverste rad: Navn, fargeikon, etiketter og handlingsknapper */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div
                                className="w-4 h-4 rounded-full shrink-0 border border-black/10 shadow-2xs"
                                style={{ backgroundColor: cal.backgroundColor || '#0284c7' }}
                              />
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingCalName}
                                    onChange={(e) => setEditingCalName(e.target.value)}
                                    placeholder="Skriv inn kalendernavn..."
                                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-blue-400 bg-white focus:outline-hidden"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        updateGoogleCalendarName(cal.id, editingCalName);
                                        setEditingCalId(null);
                                        showNotification(`✅ Kalendernavn oppdatert til «${editingCalName}»`);
                                      } else if (e.key === 'Escape') {
                                        setEditingCalId(null);
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateGoogleCalendarName(cal.id, editingCalName);
                                      setEditingCalId(null);
                                      showNotification(`✅ Kalendernavn oppdatert til «${editingCalName}»`);
                                    }}
                                    className="p-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                                    title="Lagre navn"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingCalId(null)}
                                    className="p-1 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                                    title="Avbryt"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                  <span className="text-sm font-bold text-slate-900 truncate">
                                    {displayName}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCalId(cal.id);
                                      setEditingCalName(displayName);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                                    title="Hurtigendre visningsnavn"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  {cal.primary && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                      Primær
                                    </span>
                                  )}
                                  {cal.isCustom && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                      Egendefinert
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Handlingsknapper */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                id={`calendar-settings-btn-${cal.id}`}
                                onClick={() => setSettingsModalCal(cal)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 border border-slate-300 hover:border-blue-300 shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                                title="Åpne innstillinger for denne kalenderen"
                              >
                                <Settings className="w-3.5 h-3.5 text-blue-600" />
                                <span>Innstillinger</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  toggleCalendarVisibility(cal.id, !isVisible);
                                  showNotification(
                                    !isVisible
                                      ? `👁️ «${displayName}» vises nå i kalenderen for familien`
                                      : `🙈 «${displayName}» er nå skjult på brukersiden`
                                  );
                                }}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
                                  isVisible
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                                }`}
                                title={isVisible ? 'Klikk for å skjule' : 'Klikk for å vise'}
                              >
                                {isVisible ? (
                                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                )}
                                <span>{isVisible ? 'Synlig' : 'Skjult'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setCalendarToDelete({ id: cal.id, name: displayName });
                                }}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                title="Fjern denne kalenderen fra appen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Innstillingsbokser: Viser alle kalenderens innstillinger i egne separate bokser */}
                          <div className="pt-2.5 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                            {/* Boks 1: Reserveringsmodus */}
                            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                              isCarActive
                                ? 'bg-blue-100/70 border-blue-300 text-blue-950 font-bold'
                                : 'bg-slate-100/70 border-slate-200 text-slate-700 font-semibold'
                            }`}>
                              <div className={`p-1.5 rounded-lg shrink-0 ${isCarActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                <Car className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Modus</span>
                                <span className="truncate block font-bold">
                                  {isCarActive ? 'Sperrer bil' : 'Ingen bilsperre'}
                                </span>
                              </div>
                            </div>

                            {/* Boks 2: Reisebuffer (separat boks) */}
                            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                              isCarActive
                                ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                                : 'bg-slate-100/70 border-slate-200 text-slate-500 font-semibold'
                            }`}>
                              <div className={`p-1.5 rounded-lg shrink-0 ${isCarActive ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                <Clock className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Reisebuffer</span>
                                <span className="truncate block font-bold">
                                  {isCarActive ? `${bufferBefore}m før / ${bufferAfter}m etter` : 'Ingen (inaktiv)'}
                                </span>
                              </div>
                            </div>

                            {/* Boks 3: Reservert bil (separat boks) */}
                            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                              isCarActive
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                : 'bg-slate-100/70 border-slate-200 text-slate-500 font-semibold'
                            }`}>
                              <div className={`p-1.5 rounded-lg shrink-0 ${isCarActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                <Car className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Reservert bil</span>
                                <span className="truncate block font-bold" title={targetVehicle ? `${targetVehicle.name} (${targetVehicle.licensePlate || 'Bil'})` : 'Ingen'}>
                                  {isCarActive ? (targetVehicle?.name || 'Volkswagen ID.4') : 'Ingen bil valgt'}
                                </span>
                              </div>
                            </div>

                            {/* Boks 4: Person & Personvern */}
                            <div className="p-2.5 rounded-xl border bg-amber-50/70 border-amber-200/90 text-amber-950 font-semibold flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-amber-200/80 text-amber-900 shrink-0 text-xs font-black">
                                {assignedMember?.avatarEmoji || '👤'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold truncate">
                                  {assignedMember ? assignedMember.name : 'Felles kalender'}
                                </span>
                                <span className="truncate block text-[11px] font-bold text-amber-900">
                                  {privacyMode === 'busy_only' ? '🔒 Kun Opptatt' : '🔓 Fulle detaljer'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Manuell Kalender-ID / iCal og nytt navn input */}
              {showCustomCalendarInput && (
                <div className="p-5 bg-white/95 rounded-3xl border border-blue-200 shadow-sm space-y-4 mt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Legg til kalender (iCal eller Kalender-ID)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Støtter både offentlig og hemmelig iCal-adresse (.ics), embed-lenke eller Kalender-ID fra Google Kalender.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCustomCalendarInput(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        iCal-adresse (.ics) eller Kalender-ID
                      </label>
                      <input
                        type="text"
                        value={customCalendarIdInput}
                        onChange={(e) => setCustomCalendarIdInput(e.target.value)}
                        placeholder="f.eks. hemmelig iCal-adresse (.ics) eller Kalender-ID"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Visningsnavn i appen
                      </label>
                      <input
                        type="text"
                        value={customCalendarNameInput}
                        onChange={(e) => setCustomCalendarNameInput(e.target.value)}
                        placeholder="f.eks. Jobb Lillesand / Misjonskirken / Fotball"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Fargevelger for kalenderen */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-600">Kalenderfarge:</span>
                      <div className="flex items-center gap-1.5">
                        {[
                          { color: '#0284c7', label: 'Blå' },
                          { color: '#059669', label: 'Grønn' },
                          { color: '#ea580c', label: 'Oransje' },
                          { color: '#7c3aed', label: 'Lilla' },
                          { color: '#e11d48', label: 'Rose' },
                          { color: '#0d9488', label: 'Teal' },
                        ].map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => setCustomCalendarColorInput(c.color)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                              customCalendarColorInput === c.color ? 'scale-115 border-slate-900 shadow-2xs' : 'border-white'
                            }`}
                            style={{ backgroundColor: c.color }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const trimmedId = customCalendarIdInput.trim();
                        const trimmedName = customCalendarNameInput.trim() || trimmedId;
                        if (!trimmedId) {
                          showNotification('⚠️ Vennligst oppgi en gyldig Kalender-ID eller iCal-adresse');
                          return;
                        }
                        addCustomGoogleCalendar(trimmedId, trimmedName, customCalendarColorInput);
                        setCustomCalendarIdInput('');
                        setCustomCalendarNameInput('');
                        setShowCustomCalendarInput(false);
                        showNotification(`✅ La til «${trimmedName}» i kalenderlisten!`);
                      }}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Legg til i kalenderlisten</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    💡 I Google Kalender finner du dette under <em>Innstillinger for kalenderen &gt; Integrer kalender</em> (offentlig eller hemmelig iCal-adresse, eller Kalender-ID).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: FIRESTORE SKYDATABASE */}
      {activeSubTab === 'firestore' && (
        <div className="space-y-6">
          <div className="backdrop-blur-md bg-white/60 rounded-3xl p-6 border border-white/60 shadow-sm space-y-5">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-indigo-100 text-indigo-800 rounded-2xl border border-indigo-200 shadow-2xs">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Google Cloud Firestore – Sanntidssynkronisering
                </h2>
                <p className="text-xs text-slate-500">
                  Koble appen til Firestore for umiddelbar sanntidssynkronisering mellom alle familiemedlemmenes telefoner, nettbrett og datamaskiner.
                </p>
              </div>
            </div>

            {/* Connection status card */}
            <div className="p-5 rounded-3xl bg-white/70 border border-white/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        isFirestoreConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                      }`}
                    ></span>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {isFirestoreConnected
                        ? 'Firestore er tilkoblet og synkroniserer i sanntid'
                        : firebaseUser
                        ? 'Kobler til Firestore...'
                        : 'Lokal modus (Logg inn med Google for å aktivere skysynk)'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Database ID:{' '}
                    <code className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono text-slate-700">
                      ai-studio-remixhomeapp-625f37a7-cb03-43da-929f-5f2c6b42511e
                    </code>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Innlogget bruker:{' '}
                    <strong className="text-slate-800">
                      {firebaseUser?.email || 'Ingen (bruker lokal lagring)'}
                    </strong>
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {firebaseUser ? (
                    <>
                      <button
                        onClick={async () => {
                          await pushAllToFirestore();
                          showNotification('✅ Alle data er lastet opp og synkronisert med Firestore!');
                        }}
                        disabled={isFirestoreSyncing}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                        title="Last opp og overskriv Firestore med nåværende data"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFirestoreSyncing ? 'animate-spin' : ''}`} />
                        <span>{isFirestoreSyncing ? 'Synkroniserer...' : 'Last opp til Firestore'}</span>
                      </button>
                      <button
                        onClick={async () => {
                          await signOutFirebaseUser();
                          showNotification('Du er nå logget ut av Firestore.');
                        }}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Logg ut</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={async () => {
                        await signInWithFirebaseGoogle();
                        showNotification('✅ Innlogget med Google! Sanntidssynk er aktiv.');
                      }}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Logg inn med Google</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-2 pt-3 border-t border-slate-200/60 leading-relaxed">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60">
                    <span className="font-semibold text-slate-900 block mb-0.5">
                      Samlinger i databasen:
                    </span>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                      <li><code>members</code> – Familiemedlemmer, roller og mål</li>
                      <li><code>vehicles</code> – Biler og drivstofftype</li>
                      <li><code>reservations</code> – Bilreservasjoner og formål</li>
                      <li><code>calendarEvents</code> – Hendelser og kjørebehov</li>
                      <li><code>taskTemplates</code> – Oppgavemaler og poeng</li>
                      <li><code>taskInstances</code> – Ukentlige oppgaver og status</li>
                      <li><code>settings</code> – Familieinnstillinger og husstruktur</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60">
                    <span className="font-semibold text-slate-900 block mb-0.5">
                      Sikkerhet & rettigheter (Rules):
                    </span>
                    <p className="text-[11px] text-slate-600 leading-normal mb-1">
                      Sikkerhetsregler er konfigurert og utrullet til Firestore.
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                      <li>Verifisert e-post påkrevd for endringer</li>
                      <li>Administrator (<code>magnar.totland@gmail.com</code>) har full administrasjonstilgang</li>
                      <li>Familiemedlemmer kan reservere bil, ta og fullføre oppgaver</li>
                      <li>Automatisk fall-back til lokal lagring offline</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: SYSTEM & DEMO DATA */}
      {activeSubTab === 'system' && (
        <div className="space-y-6">
          {/* 1. STATUS FOR DRIFTSMODUS */}
          <div className="backdrop-blur-md bg-white/70 rounded-3xl p-6 border border-white/60 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Driftsmodus & Status</span>
                  {settings.disableMockData ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      🟢 Produksjon (Ren drift)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      🧪 Test- og demomodus
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Full oversikt over aktive testdata, testpersoner og kalendertilkoblinger.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const next = !settings.disableMockData;
                    await toggleDisableMockData(next);
                    showNotification(next ? '✅ Testdata er deaktivert' : 'ℹ️ Testdata er aktivert');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                    settings.disableMockData
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  {settings.disableMockData ? 'Testdata er AV (Klikk for PÅ)' : 'Testdata er PÅ (Klikk for AV)'}
                </button>
              </div>
            </div>

            {/* Stat-brikker */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-white/60 border border-slate-200/60">
                <span className="text-[11px] font-semibold text-slate-500 block">Testpersoner</span>
                <span className="text-lg font-bold text-purple-700">
                  {members.filter((m) => m.isTestPerson || m.id === 'member_marcus' || m.id === 'member_synelle').length} stk
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/60 border border-slate-200/60">
                <span className="text-[11px] font-semibold text-slate-500 block">Totalt medlemmer</span>
                <span className="text-lg font-bold text-slate-800">{members.length} personer</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/60 border border-slate-200/60">
                <span className="text-[11px] font-semibold text-slate-500 block">Google-status</span>
                <span className={`text-xs font-bold block mt-1 ${isGoogleConnected ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {isGoogleConnected ? '✓ Tilkoblet' : 'Ikke tilkoblet'}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/60 border border-slate-200/60">
                <span className="text-[11px] font-semibold text-slate-500 block">Aktive kalendere</span>
                <span className="text-lg font-bold text-blue-700">
                  {availableGoogleCalendars.filter((c) => c.enabledForDisplay !== false && !(settings.disabledCalendarIds || []).includes(c.id)).length} / {availableGoogleCalendars.length}
                </span>
              </div>
            </div>
          </div>

          {/* 2. NÅR LØSNINGEN SKAL TAS I BRUK: FJERN ALLE TESTDATA */}
          <div className="backdrop-blur-md bg-gradient-to-br from-rose-50/70 to-red-50/40 rounded-3xl p-6 border border-rose-200/80 shadow-sm space-y-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-950">
                  Klargjøring for ekte produksjon (Når løsningen skal tas i bruk)
                </h3>
                <p className="text-xs text-rose-800/90 leading-relaxed mt-1">
                  Når du er klar til å bruke systemet på ordentlig i hverdagen, trykker du her for å fjerne alle prøveavtaler, mock-bilreservasjoner og slå av testmodus. Du kan også velge å slette testpersonene slik at kun din egen brukerkonto står igjen.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 border border-rose-200/70 space-y-3">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={purgeKeepAdminOnly}
                  onChange={(e) => setPurgeKeepAdminOnly(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Behold kun meg som administrator (Magnar Totland)
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight">
                    Sletter Marcus, Synelle og andre opprettede testpersoner slik at du har en 100% ren familiemedlemsliste klar til å invitere dine egne.
                  </span>
                </div>
              </label>

              <div className="pt-2 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    await removeAllTestData(purgeKeepAdminOnly);
                    showNotification('🎉 Løsningen er klargjort for ekte drift! Alle testdata er fjernet.');
                  }}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Klargjør for ekte drift: Fjern alle testdata</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. TESTDATA & TESTPERSONER VERKTØYKASSE */}
          <div className="backdrop-blur-md bg-white/60 rounded-3xl p-6 border border-white/60 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-purple-600" />
                <span>Legg inn testdata og testpersoner</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bruk disse verktøyene når du vil prøve ut nye funksjoner, simulere bilreservasjoner eller teste oppgave- og poengsystemet.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Boks 1: Fyll på testdata */}
              <div className="p-4.5 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>Testavtaler og bilreservasjoner</span>
                  </h4>
                  <p className="text-[11px] text-purple-900/80 mt-1">
                    Legger inn realistiske testavtaler for uken (møter, fritidsaktiviteter, bilreservasjoner og poengoppgaver).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await loadAllTestData();
                    showNotification('🧪 Ferske testdata og avtaler er lagt inn!');
                  }}
                  className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Fyll inn ferske testdata</span>
                </button>
              </div>

              {/* Boks 2: Legg til ny testperson */}
              <div className="p-4.5 rounded-2xl bg-white/80 border border-slate-200 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Legg til ny testperson</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Oppretter en testbruker med spesifikk rolle for å verifisere poengberegning eller bilrettigheter.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={testPersonCustomName}
                      onChange={(e) => setTestPersonCustomName(e.target.value)}
                      placeholder="Navn (f.eks. Jonas Test)"
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                    <select
                      value={testPersonRole}
                      onChange={(e) => setTestPersonRole(e.target.value as Role)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                    >
                      <option value="child">Barn/Ungdom</option>
                      <option value="adult">Voksen</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      addTestMember(testPersonRole, testPersonCustomName.trim() || undefined);
                      showNotification(`🧪 Testperson opprettet!`);
                      setTestPersonCustomName('');
                    }}
                    className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Opprett testperson</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Administrer eksisterende testpersoner */}
            {members.some((m) => m.isTestPerson || m.id === 'member_marcus' || m.id === 'member_synelle') && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Aktive testpersoner i systemet ({members.filter((m) => m.isTestPerson || m.id === 'member_marcus' || m.id === 'member_synelle').length} stk)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {members
                      .filter((m) => m.isTestPerson || m.id === 'member_marcus' || m.id === 'member_synelle')
                      .map((m) => m.name)
                      .join(', ')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    removeTestMembers();
                    showNotification('🧹 Alle testpersoner ble fjernet');
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shrink-0"
                >
                  Fjern kun testpersoner
                </button>
              </div>
            )}
          </div>

          {/* 4. TOTAL TILBAKESTILLING */}
          <div className="backdrop-blur-md bg-white/60 rounded-3xl p-6 border border-white/60 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Total tilbakestilling</h2>
            <p className="text-xs text-slate-500">
              Nullstiller appen helt tilbake til utgangspunktet med standard demodata og konfigurasjon.
            </p>

            <button
              onClick={() => {
                resetAllData();
                showNotification('✅ Alle data er tilbakestilt til standard demo!');
              }}
              className="px-5 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
            >
              <RotateCw className="w-4 h-4" />
              <span>Tilbakestill til standard demo-data</span>
            </button>
          </div>
        </div>
      )}

      {/* TASK TEMPLATE MODAL (FOR PRIORITET 2 CRUD) */}
      {isCreatingTaskTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="backdrop-blur-xl bg-white/95 rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-white/80 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingTemplate ? 'Rediger oppgavemal' : 'Opprett ny oppgavemal'}
              </h3>
              <button
                onClick={() => setIsCreatingTaskTemplate(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTaskTemplate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Oppgavenavn</label>
                <input
                  type="text"
                  required
                  placeholder="F.eks. Vaske vinduer oppe"
                  value={templateFormTitle}
                  onChange={(e) => setTemplateFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Beskrivelse</label>
                <textarea
                  rows={2}
                  placeholder="Beskriv hva som skal gjøres..."
                  value={templateFormDesc}
                  onChange={(e) => setTemplateFormDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Område / Etasje</label>
                  <select
                    value={templateFormArea}
                    onChange={(e) => {
                      const selectedArea = areas.find((a) => a.name === e.target.value);
                      setTemplateFormArea(e.target.value);
                      if (selectedArea && selectedArea.rooms.length > 0) {
                        setTemplateFormRoom(selectedArea.rooms[0]);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Rom</label>
                  <select
                    value={templateFormRoom}
                    onChange={(e) => setTemplateFormRoom(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium"
                  >
                    {areas
                      .find((a) => a.name === templateFormArea)
                      ?.rooms.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      )) || <option value="Hovedrom">Hovedrom</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Poeng</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={templateFormPoints}
                    onChange={(e) => setTemplateFormPoints(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Gjentakelse</label>
                  <select
                    value={templateFormRecurrence}
                    onChange={(e) => setTemplateFormRecurrence(e.target.value as RecurrenceType)}
                    className="w-full px-2 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium"
                  >
                    <option value="weekly">Hver uke (Auto)</option>
                    <option value="biweekly">Hver 2. uke</option>
                    <option value="daily">Daglig</option>
                    <option value="monthly">Månedlig</option>
                    <option value="once">Engangs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Frist</label>
                  <input
                    type="text"
                    value={templateFormDeadline}
                    onChange={(e) => setTemplateFormDeadline(e.target.value)}
                    placeholder="Søndag 20:00"
                    className="w-full px-2.5 py-2.5 rounded-2xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={templateFormIsMandatory}
                    onChange={(e) => setTemplateFormIsMandatory(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span>Obligatorisk oppgave</span>
                </label>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingTaskTemplate(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-xs"
                  >
                    Lagre oppgavemal
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bekreftelse-modal for sletting av kalender */}
      {calendarToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Slett kalender fra appen?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Handlingen fjerner kalenderen fra listen og sletter tilknyttede hendelser og bilreservasjoner.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 mb-5">
              <div className="text-xs font-semibold text-slate-700">Kalender som fjernes:</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{calendarToDelete.name}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{calendarToDelete.id}</div>
            </div>

            <div className="flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setCalendarToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => {
                  removeCustomGoogleCalendar(calendarToDelete.id);
                  showNotification(`🗑️ Fjernet «${calendarToDelete.name}» fra kalenderlisten`);
                  setCalendarToDelete(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Slett kalender</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Per-Calendar Settings Modal */}
      {settingsModalCal && (
        <CalendarSettingsModal
          calendar={settingsModalCal}
          isOpen={true}
          currentConfig={settings.calendarConfigs?.[settingsModalCal.id]}
          members={members}
          vehicles={vehicles}
          onClose={() => setSettingsModalCal(null)}
          onDeleteRequest={(cal) => {
            setCalendarToDelete(cal);
          }}
          onSave={async (calId, updates) => {
            await updateCalendarSettings(calId, updates);
            showNotification(
              `✅ Innstillinger for «${updates.customName || settingsModalCal.customName || settingsModalCal.summary}» er oppdatert og avtaler er rekalkulert!`
            );
            setSettingsModalCal(null);
          }}
        />
      )}
    </div>
  );
};
