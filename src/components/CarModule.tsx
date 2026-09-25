import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import {
  Car,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Shield,
  Plus,
  Trash2,
  Info,
  Calendar,
  Zap,
  Lock,
} from './Icons';
import { formatNorwegianDate, formatTime, formatTimeRange, toDatetimeLocal } from '../utils/dateUtils';

interface CarModuleProps {
  onOpenReserveCar: () => void;
}

export const CarModule: React.FC<CarModuleProps> = ({ onOpenReserveCar }) => {
  const {
    vehicles,
    activeVehicle,
    reservations,
    cancelReservation,
    activeMember,
    checkCarAvailability,
    createCarReservation,
    settings,
  } = useFamily();

  // Test reservation interactive playground right on the car page
  const now = new Date();
  const defStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 30);
  const defEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0);

  const [testStart, setTestStart] = useState(toDatetimeLocal(defStart));
  const [testEnd, setTestEnd] = useState(toDatetimeLocal(defEnd));
  const [testPurpose, setTestPurpose] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const availabilityCheck = checkCarAvailability(
    new Date(testStart).toISOString(),
    new Date(testEnd).toISOString()
  );

  const handleQuickBook = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createCarReservation({
      vehicleId: activeVehicle.id,
      memberId: activeMember.id,
      memberName: activeMember.name,
      startTime: new Date(testStart).toISOString(),
      endTime: new Date(testEnd).toISOString(),
      purpose: testPurpose.trim() || 'Privat tur',
      isWorkRelated: false,
      source: 'manual',
      status: availabilityCheck.isAvailable ? 'confirmed' : 'pending_conflict',
    });

    if (res.success) {
      setFeedback('✅ Bilen ble reservert uten konflikter!');
    } else {
      setFeedback('⚠️ Reservasjon lagt inn (konflikt registrert).');
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const sortedReservations = [...reservations].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md bg-white/60 p-6 sm:p-7 rounded-3xl border border-white/60 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-13 h-13 bg-orange-100/80 text-orange-800 rounded-2xl flex items-center justify-center border border-orange-200/60 shadow-2xs">
            <Car className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span>{activeVehicle.name}</span>
              {activeVehicle.licensePlate && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white/80 text-slate-700 rounded-lg border border-slate-200 shadow-2xs">
                  {activeVehicle.licensePlate}
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Koordinering, tilgjengelighet og automatisk reisetidsstyring
            </p>
          </div>
        </div>

        <button
          onClick={onOpenReserveCar}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow-sm transition-all border border-orange-400/30"
        >
          <Plus className="w-4 h-4" />
          <span>Ny reservasjon</span>
        </button>
      </div>

      {/* Grid: Live Availability Checker & Priority Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Quick Check & Request form (Left, 6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="backdrop-blur-md bg-white/60 rounded-3xl p-6 border border-white/60 shadow-sm">
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-200/50">
              <Clock className="w-5 h-5 text-slate-700" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Be om bilen / Sjekk tid</h2>
                <p className="text-xs text-slate-500">Test et tidsrom og se umiddelbart om bilen er ledig</p>
              </div>
            </div>

            <form onSubmit={handleQuickBook} className="mt-4 space-y-4">
              <div className="p-3 bg-white/50 backdrop-blur-xs rounded-2xl border border-white/60 text-xs text-slate-600 shadow-2xs">
                Logget inn som: <span className="font-bold text-slate-900">{activeMember.name} {activeMember.avatarEmoji}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Ønsket start
                  </label>
                  <input
                    type="datetime-local"
                    value={testStart}
                    onChange={(e) => setTestStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-xs text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Ønsket slutt
                  </label>
                  <input
                    type="datetime-local"
                    value={testEnd}
                    onChange={(e) => setTestEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-xs text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Hva skal du?
                </label>
                <input
                  type="text"
                  placeholder="F.eks. Kjøre på trening, besøke venner"
                  value={testPurpose}
                  onChange={(e) => setTestPurpose(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-xs text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500 shadow-2xs"
                />
              </div>

              {/* Real-time feedback badge */}
              <div
                className={`p-4 rounded-2xl border transition-all shadow-2xs backdrop-blur-xs ${
                  availabilityCheck.isAvailable
                    ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-900'
                    : 'bg-orange-50/80 border-orange-200/80 text-orange-900'
                }`}
              >
                {availabilityCheck.isAvailable ? (
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">✅ Bilen er tilgjengelig!</p>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Ingen andre reservasjoner kolliderer med dette tidspunktet.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">⚠️ Bilen er allerede reservert</p>
                      {availabilityCheck.conflicts.map((c, i) => (
                        <p key={i} className="text-xs text-orange-800 font-semibold mt-1">
                          {formatTime(c.startTime)}–{formatTime(c.endTime)} av {c.memberName} ({c.purpose})
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {feedback && (
                <div className="p-3 bg-emerald-600 text-white rounded-2xl text-xs font-bold text-center shadow-xs">
                  {feedback}
                </div>
              )}

              <button
                type="submit"
                className={`w-full py-3 rounded-2xl font-bold text-sm shadow-xs transition-all ${
                  availabilityCheck.isAvailable
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border border-orange-400/30'
                }`}
              >
                {availabilityCheck.isAvailable ? 'Reserver bilen nå' : 'Reserver likevel (med konfliktvarsel)'}
              </button>
            </form>
          </div>
        </div>

        {/* Car Priority Rules (Right, 6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="backdrop-blur-md bg-white/60 rounded-3xl p-6 border border-white/60 shadow-sm">
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-200/50">
              <Shield className="w-5 h-5 text-slate-700" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Familiens bilregler & prioritering</h2>
                <p className="text-xs text-slate-500">Konfigurert for minst mulig diskusjon</p>
              </div>
            </div>

            <div className="mt-4 space-y-3.5">
              <div className="p-4 rounded-2xl bg-white/50 backdrop-blur-xs border border-white/60 shadow-2xs">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  1. Hovedregel: Jobb & Møter (Prioritet 1)
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Magnars jobbrelaterte kalenderhendelser reserverer bilen automatisk.
                  Systemet legger automatisk til <strong>{settings.defaultTravelBufferBefore} minutter før</strong> og{' '}
                  <strong>{settings.defaultTravelBufferAfter} minutter etter</strong> for kjøring og parkering.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/50 backdrop-blur-xs border border-white/60 shadow-2xs">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  2. Frihet for øvrige familiemedlemmer
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Alle familiemedlemmer kan fritt bruke bilen når den ikke er opptatt av prioriterte avtaler. Først til mølla-prinsippet gjelder for private ærend.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/50 backdrop-blur-xs border border-white/60 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    3. Integrert Google-kalender
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {settings.googleCalendarConfig?.calendarName || 'Magnar Totland (Primær)'}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {(settings.googleCalendarConfig?.autoReserveCar ?? true)
                    ? `Avtaler i aktive bilkalendere sperrer automatisk bilen med kalenderens reisetidsbuffer (f.eks. +40m før og etter), unntatt faste gjentagende aktiviteter som er satt til «Sperrer IKKE bil».`
                    : 'Automatisk bilsperre fra kalender er deaktivert i Admin-innstillinger.'}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Full Reservations List */}
      <div className="backdrop-blur-md bg-white/60 rounded-3xl p-6 border border-white/60 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Alle aktive bilreservasjoner</h2>
            <p className="text-xs text-slate-500">Planlagte turer og automatiske kalendersperrer</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-white/80 backdrop-blur-xs text-slate-700 rounded-xl border border-white/60 shadow-2xs">
            {sortedReservations.length} reservasjoner
          </span>
        </div>

        <div className="mt-4 divide-y divide-slate-200/40">
          {sortedReservations.length > 0 ? (
            sortedReservations.map((res) => (
              <div key={res.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-xs font-bold px-2.5 py-1 bg-white/80 border border-slate-200/60 text-slate-800 rounded-lg shadow-2xs">
                      {formatNorwegianDate(res.startTime)}
                    </span>
                    <span className="text-xs font-bold text-orange-900 bg-orange-50/80 px-2.5 py-1 rounded-lg border border-orange-200/60 shadow-2xs">
                      {formatTimeRange(res.startTime, res.endTime)}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                      <span>{res.memberName}</span>
                    </span>
                    {res.isConfidential && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-amber-700" />
                        Konfidensielt
                      </span>
                    )}
                    {res.isWorkRelated && !res.isConfidential && (
                      <span className="text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                        Jobb (Prio 1)
                      </span>
                    )}
                    {res.source === 'google_calendar' && !res.isConfidential && (
                      <span className="text-[10px] font-medium bg-sky-50 text-sky-800 border border-sky-200/60 px-2 py-0.5 rounded-md">
                        Auto fra kalender
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-medium text-slate-800">{res.purpose}</p>

                  {res.location && (
                    <div className="flex items-center text-xs text-slate-500 gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Destinasjon: {res.location}</span>
                    </div>
                  )}

                  {res.bufferBeforeMinutes && res.bufferAfterMinutes && (
                    <div className="text-[11px] text-slate-400">
                      Inkluderer {res.bufferBeforeMinutes}m reisebuffer før + {res.bufferAfterMinutes}m etter
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <button
                    onClick={() => cancelReservation(res.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Avbestill / Slett reservasjon"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">
              Ingen fremtidige reservasjoner registrert for bilen.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
