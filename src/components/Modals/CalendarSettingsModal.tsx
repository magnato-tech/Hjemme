import React, { useState, useMemo } from 'react';
import {
  X,
  Check,
  Lock,
  Unlock,
  Car,
  Clock,
  User,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  AlertCircle,
  Save,
  Plus,
  XCircle,
  Sparkles,
} from 'lucide-react';
import {
  GoogleCalendarItem,
  PerCalendarConfig,
  CalendarCarMode,
  CalendarPrivacyMode,
  ActivityOverride,
} from '../../types';
import { useFamily } from '../../context/FamilyContext';
import { sanitizeGoogleCalendarId } from '../../utils/googleCalendarService';

interface CalendarSettingsModalProps {
  calendar: GoogleCalendarItem;
  isOpen?: boolean;
  currentConfig?: PerCalendarConfig;
  members?: any[];
  vehicles?: any[];
  onClose: () => void;
  onDeleteRequest?: (cal: { id: string; name: string }) => void;
  onSave?: (calId: string, updates: Partial<PerCalendarConfig>, newCalendarId?: string) => Promise<void> | void;
}

export const CalendarSettingsModal: React.FC<CalendarSettingsModalProps> = ({
  calendar,
  isOpen = true,
  currentConfig: propConfig,
  members: propMembers,
  vehicles: propVehicles,
  onClose,
  onDeleteRequest,
  onSave,
}) => {
  const {
    members: contextMembers,
    vehicles: contextVehicles,
    activeVehicleId,
    settings,
    calendarEvents,
    updateCalendarSettings,
    showNotification,
  } = useFamily();

  const members = propMembers || contextMembers;
  const vehicles = propVehicles || contextVehicles;

  // Existing per-calendar config or defaults: Only 2 active modes: 'none' or 'all'
  const existingConfig = propConfig || settings.calendarConfigs?.[calendar.id];
  const initialCarMode: CalendarCarMode =
    existingConfig?.carMode === 'none' || calendar.carMode === 'none'
      ? 'none'
      : 'all';

  const initialPrivacy: CalendarPrivacyMode =
    existingConfig?.privacyMode ||
    calendar.privacyMode ||
    settings.calendarPrivacyModes?.[calendar.id] ||
    'full';

  const [name, setName] = useState(
    existingConfig?.customName || calendar.customName || calendar.summary || ''
  );
  const [icalAddress, setIcalAddress] = useState<string>(
    existingConfig?.icalUrl || calendar.icalUrl || calendar.id || ''
  );
  const [memberId, setMemberId] = useState<string>(
    existingConfig?.assignedMemberId || calendar.assignedMemberId || ''
  );
  const [privacyMode, setPrivacyMode] = useState<CalendarPrivacyMode>(initialPrivacy);
  const [carMode, setCarMode] = useState<CalendarCarMode>(initialCarMode);
  const [bufferBefore, setBufferBefore] = useState<number>(
    existingConfig?.bufferBeforeMinutes ??
      calendar.bufferBeforeMinutes ??
      settings.defaultTravelBufferBefore ??
      40
  );
  const [bufferAfter, setBufferAfter] = useState<number>(
    existingConfig?.bufferAfterMinutes ??
      calendar.bufferAfterMinutes ??
      settings.defaultTravelBufferAfter ??
      40
  );
  const [targetVehicleId, setTargetVehicleId] = useState<string>(
    existingConfig?.targetVehicleId ||
      settings.googleCalendarConfig?.targetVehicleId ||
      activeVehicleId ||
      vehicles[0]?.id ||
      'car_id4'
  );
  const [isVisible, setIsVisible] = useState<boolean>(
    existingConfig?.enabledForDisplay !== undefined
      ? existingConfig.enabledForDisplay
      : calendar.enabledForDisplay !== false &&
        !(settings.disabledCalendarIds || []).includes(calendar.id)
  );

  // Blokk 5: Gjentagende aktiviteter & overstyringer (Eneste unntaksmodul)
  const [activityOverrides, setActivityOverrides] = useState<Record<string, ActivityOverride>>(
    existingConfig?.activityOverrides || calendar.activityOverrides || {}
  );
  const [newActivityTitle, setNewActivityTitle] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  // Finn distinkte aktiviteter oppdaget i kalenderen for denne kalender-IDen
  const detectedCalendarActivities = useMemo(() => {
    const counts: Record<string, number> = {};
    (calendarEvents || []).forEach((ev) => {
      if (ev.calendarId === calendar.id || ev.googleCalendarId === calendar.id) {
        const t = (ev.title || '').trim();
        if (t && t !== 'Avtale uten tittel') {
          counts[t] = (counts[t] || 0) + 1;
        }
      }
    });
    return Object.entries(counts)
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count);
  }, [calendarEvents, calendar.id]);

  if (!isOpen) return null;

  const handleSetOverride = (
    title: string,
    blocksCar: boolean,
    customBufferBefore?: number,
    customBufferAfter?: number
  ) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const key = cleanTitle.toLowerCase();
    setActivityOverrides((prev) => ({
      ...prev,
      [key]: {
        activityTitle: cleanTitle,
        blocksCar,
        bufferBeforeMinutes: customBufferBefore,
        bufferAfterMinutes: customBufferAfter,
      },
    }));
    setNewActivityTitle('');
  };

  const handleRemoveOverride = (key: string) => {
    setActivityOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const trimmedIcal = icalAddress.trim();
      const cleanCalId = sanitizeGoogleCalendarId(trimmedIcal) || calendar.id;
      const isNewId = cleanCalId && cleanCalId !== calendar.id;

      const updates: Partial<PerCalendarConfig> = {
        calendarId: cleanCalId,
        icalUrl: trimmedIcal,
        customName: name.trim() || calendar.summary,
        assignedMemberId: memberId || undefined,
        privacyMode,
        carMode: carMode === 'none' ? 'none' : 'all',
        bufferBeforeMinutes: Number(bufferBefore) || 0,
        bufferAfterMinutes: Number(bufferAfter) || 0,
        targetVehicleId,
        enabledForDisplay: isVisible,
        excludedKeywords: [],
        activityOverrides,
      };

      if (onSave) {
        await onSave(calendar.id, updates, isNewId ? cleanCalId : undefined);
      } else {
        await updateCalendarSettings(calendar.id, updates, isNewId ? cleanCalId : undefined);
        showNotification(`✅ Innstillinger for «${name.trim() || calendar.summary}» er lagret!`);
        onClose();
      }
    } catch (err) {
      console.error('Feil ved lagring av kalenderinnstillinger:', err);
      showNotification('❌ Kunne ikke lagre kalenderinnstillinger');
    } finally {
      setIsSaving(false);
    }
  };

  const bufferOptions = [15, 30, 40, 45, 60];

  return (
    <div
      id="calendar-settings-modal-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="calendar-settings-modal-dialog"
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-blue-50/70 via-sky-50/40 to-white">
          <div className="flex items-center space-x-3.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs border border-black/10 shrink-0"
              style={{ backgroundColor: calendar.backgroundColor || '#0284c7' }}
            >
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                Kalenderinnstillinger
              </h2>
              <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md">
                {name.trim() || calendar.summary}
              </p>
            </div>
          </div>

          <button
            id="close-calendar-settings-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Section 1: Navn, iCal-adresse & Tilknyttet person */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Visningsnavn i appen
              </label>
              <input
                id="calendar-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="F.eks. Magnars jobb, Kjørekalender..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* iCal-adresse eller Kalender-ID */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  iCal-adresse (.ics) eller Kalender-ID
                </label>
                <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Offentlig eller hemmelig adresse
                </span>
              </div>
              <input
                id="calendar-ical-input"
                type="text"
                value={icalAddress}
                onChange={(e) => setIcalAddress(e.target.value)}
                placeholder="f.eks. hemmelig eller offentlig iCal-adresse (.ics), eller Kalender-ID"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-800 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Her kan du legge inn eller oppdatere adressen for denne kalenderen. Både hemmelig og offentlig iCal-adresse (.ics) eller Kalender-ID støttes. I Google Kalender finner du dette under <em>Innstillinger for kalenderen &gt; Integrer kalender</em>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tilknyttet person
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    id="calendar-member-select"
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="">Felles / Ingen spesifikk</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.avatarEmoji || '👤'} {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Synlighet for familien
                </label>
                <button
                  type="button"
                  id="toggle-visibility-btn"
                  onClick={() => setIsVisible(!isVisible)}
                  className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isVisible
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {isVisible ? (
                    <>
                      <Eye className="w-4 h-4 text-emerald-600" />
                      <span>Synlig i kalender</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 text-slate-400" />
                      <span>Skjult på brukerside</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Personvern / Visningsmodus */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div>
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Personvern (Innhold som vises for familien)
              </span>
              <p className="text-[11px] text-slate-500">
                Skal familien se hva avtalen gjelder, eller kun at tidspunktet er opptatt?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                id="privacy-mode-full-btn"
                onClick={() => setPrivacyMode('full')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  privacyMode === 'full'
                    ? 'bg-sky-50/90 border-sky-400 ring-2 ring-sky-500/20'
                    : 'bg-slate-50/70 hover:bg-slate-100/70 border-slate-200/80'
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    privacyMode === 'full' ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Unlock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    🔓 Fullt innhold
                  </span>
                  <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                    Tittel, sted og beskrivelse vises åpent i kalenderen.
                  </span>
                </div>
              </button>

              <button
                type="button"
                id="privacy-mode-busy-btn"
                onClick={() => setPrivacyMode('busy_only')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  privacyMode === 'busy_only'
                    ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-500/20'
                    : 'bg-slate-50/70 hover:bg-slate-100/70 border-slate-200/80'
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    privacyMode === 'busy_only'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-950 block">
                    🔒 Kun Opptatt
                  </span>
                  <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                    Skjuler tittel og sted. Vises kun som konfidensiell «Opptatt».
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Section 3: Bilreservering & Modus (Kun 2 moduser) */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div>
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Bilreservering (Skal avtaler i denne kalenderen sperre bilen?)
              </span>
              <p className="text-[11px] text-slate-500">
                Velg mellom to moduser for bilreservasjon for denne kalenderen.
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Modus 1: Alle hendelser sperrer bil (unntatt spesifiserte gjentakelser) */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  carMode === 'all'
                    ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-2xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="carMode"
                  checked={carMode === 'all'}
                  onChange={() => setCarMode('all')}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-blue-600" />
                      <span>Alle hendelser sperrer bil (unntatt spesifiserte gjentakelser)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      Standard for bilkalender 🚗
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-600 block mt-1">
                    Alle avtaler i denne kalenderen sperrer automatisk bilen med valgt reisetidsbuffer — <strong>minus</strong> de faste aktivitetene du spesifiserer i modulen for gjentagende aktiviteter under.
                  </span>
                </div>
              </label>

              {/* Modus 2: Ingen bilsperre */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  carMode === 'none'
                    ? 'bg-slate-100/90 border-slate-400 ring-2 ring-slate-400/20 shadow-2xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="carMode"
                  checked={carMode === 'none'}
                  onChange={() => setCarMode('none')}
                  className="mt-1 text-slate-600 focus:ring-slate-500"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-slate-400" />
                    <span>Ingen bilsperre</span>
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Avtaler i denne kalenderen reserverer aldri bil. Vises kun som vanlige kalenderoppføringer for familien.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Section 4: Reisetidsbuffer & Bil (kun hvis bilreservering er aktiv) */}
          {carMode !== 'none' && (
            <div className="pt-4 border-t border-slate-100 space-y-4 bg-blue-50/40 -mx-5 sm:-mx-6 px-5 sm:px-6 py-4 border-b">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                  Reisetidsbuffer for bilreservering
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Buffer FØR avtalen:
                  </label>
                  <div className="flex items-center gap-1.5">
                    {bufferOptions.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setBufferBefore(mins)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          bufferBefore === mins
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Buffer ETTER avtalen:
                  </label>
                  <div className="flex items-center gap-1.5">
                    {bufferOptions.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setBufferAfter(mins)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          bufferAfter === mins
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Hvilken bil som reserveres:
                </label>
                <select
                  id="target-vehicle-select"
                  value={targetVehicleId}
                  onChange={(e) => setTargetVehicleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 cursor-pointer"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      🚗 {v.name} ({v.model || v.plateNumber || 'Bil'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-100/60 text-blue-900 text-[11px] font-medium">
                <AlertCircle className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  Ved lagring oppdateres alle eksisterende avtaler fra denne kalenderen umiddelbart med valgt buffer og bilstatus!
                </span>
              </div>
            </div>
          )}

          {/* Section 5 (BLOKK 5): Gjentagende aktiviteter & overstyringer */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Gjentagende aktiviteter & overstyringer:</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Har du faste eller gjentagende aktiviteter i kalenderen? Spesifiser om de skal sperre bilen eller ikke. Disse overstyringene har alltid høyeste prioritet.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                {Object.keys(activityOverrides).length} aktive
              </span>
            </div>

            {/* Liste over eksisterende overstyringer */}
            {Object.keys(activityOverrides).length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Aktive regeloverstyringer:
                </span>
                <div className="space-y-2">
                  {(Object.entries(activityOverrides) as [string, ActivityOverride][]).map(([key, ov]) => (
                    <div
                      key={key}
                      className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          «{ov.activityTitle}»
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {ov.blocksCar
                            ? 'Låser alltid bilen (uansett stikkord)'
                            : 'Låser ALDRI bilen (fratatt bilsperre)'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Toggle knapp for status */}
                        <button
                          type="button"
                          onClick={() => handleSetOverride(ov.activityTitle, !ov.blocksCar)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            ov.blocksCar
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs hover:bg-blue-700'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                          title="Klikk for å endre om aktiviteten sperrer bil"
                        >
                          {ov.blocksCar ? (
                            <>
                              <Car className="w-3.5 h-3.5" />
                              <span>Sperrer bil</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-slate-400" />
                              <span>Sperrer IKKE</span>
                            </>
                          )}
                        </button>

                        {/* Slett overstyring */}
                        <button
                          type="button"
                          onClick={() => handleRemoveOverride(key)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Fjern denne overstyringen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legg til ny aktivitetsoverstyring */}
            <div className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-2.5">
              <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-purple-700" />
                <span>Legg til ny aktivitetsoverstyring:</span>
              </span>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newActivityTitle}
                  onChange={(e) => setNewActivityTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newActivityTitle.trim()) {
                        handleSetOverride(newActivityTitle, false);
                      }
                    }
                  }}
                  placeholder="Navn på gjentagende aktivitet (f.eks. Idda Hockey, Stabsmøte)..."
                  className="flex-1 px-3 py-2 rounded-xl border border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs font-semibold bg-white"
                />

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (newActivityTitle.trim()) {
                        handleSetOverride(newActivityTitle, false);
                      }
                    }}
                    disabled={!newActivityTitle.trim()}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Sett at denne aktiviteten ALDRI skal sperre bilen"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sperrer IKKE bil</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (newActivityTitle.trim()) {
                        handleSetOverride(newActivityTitle, true);
                      }
                    }}
                    disabled={!newActivityTitle.trim()}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Sett at denne aktiviteten ALLTID skal sperre bilen"
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>Sperrer bil</span>
                  </button>
                </div>
              </div>

              {/* Oppdagede aktiviteter fra kalenderen (forslag til 1-klikk overstyring) */}
              {detectedCalendarActivities.length > 0 && (
                <div className="pt-2 border-t border-purple-200/60 space-y-1.5">
                  <span className="text-[10px] font-bold text-purple-900 block">
                    💡 Aktiviteter funnet i denne kalenderen (klikk for å overstyre):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {detectedCalendarActivities.map(({ title, count }) => {
                      const isOverridden = Boolean(activityOverrides[title.toLowerCase()]);
                      return (
                        <div
                          key={title}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                            isOverridden
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-purple-300'
                          }`}
                        >
                          <span className="truncate max-w-[150px]">{title}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({count}x)
                          </span>
                          {!isOverridden ? (
                            <button
                              type="button"
                              onClick={() => handleSetOverride(title, false)}
                              className="text-[10px] text-rose-600 hover:underline font-semibold ml-1 cursor-pointer"
                              title="Sett at denne aktiviteten IKKE skal reservere bil"
                            >
                              Sperr ikke bil
                            </button>
                          ) : (
                            <span className="text-[10px] text-purple-700 font-semibold ml-1">
                              ✓ Overstyrt
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Slett kalender */}
          {onDeleteRequest && (
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                id="delete-calendar-btn"
                onClick={() => {
                  onClose();
                  onDeleteRequest({ id: calendar.id, name: name || calendar.summary });
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1.5 cursor-pointer py-1"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Slett denne kalenderen fra appen...</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 border border-slate-200 transition-colors cursor-pointer"
          >
            Avbryt
          </button>

          <button
            type="button"
            id="save-calendar-settings-btn"
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <span>Lagrer...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lagre endringer</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
