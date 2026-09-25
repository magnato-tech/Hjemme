import React, { useState, useEffect } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { formatNorwegianDate, toDatetimeLocal } from '../../utils/dateUtils';
import { Car, AlertTriangle, CheckCircle2, X } from '../Icons';

interface ReserveCarModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStartTime?: string;
  initialEndTime?: string;
}

export const ReserveCarModal: React.FC<ReserveCarModalProps> = ({
  isOpen,
  onClose,
  initialStartTime,
  initialEndTime,
}) => {
  const { activeMember, activeVehicle, createCarReservation, checkCarAvailability, members } = useFamily();

  const now = new Date();
  const defaultStart = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const defaultEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now

  const [memberId, setMemberId] = useState(activeMember.id);
  const [startTime, setStartTime] = useState(
    initialStartTime || toDatetimeLocal(defaultStart)
  );
  const [endTime, setEndTime] = useState(
    initialEndTime || toDatetimeLocal(defaultEnd)
  );
  const [purpose, setPurpose] = useState('');
  const [isWorkRelated, setIsWorkRelated] = useState(false);
  const [location, setLocation] = useState('');
  const [availability, setAvailability] = useState<{ isAvailable: boolean; conflicts: any[] }>({
    isAvailable: true,
    conflicts: [],
  });
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  useEffect(() => {
    setMemberId(activeMember.id);
  }, [activeMember.id]);

  useEffect(() => {
    if (startTime && endTime) {
      const res = checkCarAvailability(new Date(startTime).toISOString(), new Date(endTime).toISOString());
      setAvailability(res);
    }
  }, [startTime, endTime, checkCarAvailability]);

  if (!isOpen) return null;

  const handleQuickPreset = (hours: number) => {
    const s = new Date(startTime || new Date());
    const e = new Date(s.getTime() + hours * 60 * 60 * 1000);
    setEndTime(toDatetimeLocal(e));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) return;

    const startIso = new Date(startTime).toISOString();
    const endIso = new Date(endTime).toISOString();
    const chosenMember = members.find((m) => m.id === memberId) || activeMember;

    const result = createCarReservation({
      vehicleId: activeVehicle.id,
      memberId: chosenMember.id,
      memberName: chosenMember.name,
      startTime: startIso,
      endTime: endIso,
      purpose: purpose.trim() || (isWorkRelated ? 'Jobb / Møte' : 'Privat tur'),
      isWorkRelated,
      source: 'manual',
      status: availability.isAvailable ? 'confirmed' : 'pending_conflict',
      location: location.trim() || undefined,
    });

    if (result.success) {
      setSubmittedMessage('✅ Bilreservasjon bekreftet!');
      setTimeout(() => {
        setSubmittedMessage(null);
        onClose();
      }, 900);
    } else {
      setSubmittedMessage('⚠️ Reservasjon lagt inn med konfliktvarsel.');
      setTimeout(() => {
        setSubmittedMessage(null);
        onClose();
      }, 1400);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="backdrop-blur-xl bg-white/85 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/80">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50 bg-white/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100/80 text-emerald-800 rounded-2xl border border-emerald-200/60 shadow-2xs">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Reserver {activeVehicle.name}</h3>
              <p className="text-xs text-slate-500">{activeVehicle.licensePlate || 'Felles familiebil'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-2xl hover:bg-white/80 transition-all border border-transparent hover:border-white/80"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Member select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Hvem reserverer?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMemberId(m.id)}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl border text-sm font-semibold transition-all shadow-2xs ${
                    memberId === m.id
                      ? 'border-emerald-500/80 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/20'
                      : 'border-white/80 bg-white/70 text-slate-700 hover:bg-white'
                  }`}
                >
                  <span className="text-lg">{m.avatarEmoji}</span>
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Fra tidspunkt
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white/70 backdrop-blur-xs shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Til tidspunkt
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white/70 backdrop-blur-xs shadow-2xs"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">Varighet:</span>
            {[1, 2, 3, 5].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => handleQuickPreset(h)}
                className="px-3 py-1 text-xs font-bold rounded-xl bg-white/80 border border-white/80 hover:bg-white text-slate-700 shadow-2xs transition-all"
              >
                +{h}t
              </button>
            ))}
          </div>

          {/* Purpose & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Formål / Hva skal du?
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="F.eks. Trening, butikk, venner"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white/70 backdrop-blur-xs shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Sted / Destinasjon
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="F.eks. Lillesand, Sørlandssenteret"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white/70 backdrop-blur-xs shadow-2xs"
              />
            </div>
          </div>

          {/* Work trip toggle */}
          <label className="flex items-center space-x-3 p-3.5 rounded-2xl border border-white/80 bg-white/50 backdrop-blur-xs cursor-pointer shadow-2xs">
            <input
              type="checkbox"
              checked={isWorkRelated}
              onChange={(e) => setIsWorkRelated(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-900">Jobbrelatert ærend (Prio 1)</span>
              <p className="text-slate-500">Gir prioritet i henhold til familiens felles regler</p>
            </div>
          </label>

          {/* Live Availability Status Box */}
          <div
            className={`p-4 rounded-2xl border backdrop-blur-xs flex items-start space-x-3 text-sm shadow-2xs ${
              availability.isAvailable
                ? 'bg-emerald-50/90 border-emerald-200/80 text-emerald-950'
                : 'bg-amber-50/90 border-amber-200/80 text-amber-950'
            }`}
          >
            {availability.isAvailable ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Bilen er tilgjengelig!</p>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Ingen kollisjoner i det valgte tidsrommet.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Kollisjon med eksisterende reservasjon:</p>
                  {availability.conflicts.map((c, i) => (
                    <p key={i} className="text-xs text-amber-900 font-semibold mt-1">
                      ⚠️ Reservert av {c.memberName} ({new Date(c.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(c.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}): {c.purpose}
                    </p>
                  ))}
                  <p className="text-xs text-amber-800 mt-1">
                    Du kan likevel sende inn forespørsel, eller velge et annet tidspunkt.
                  </p>
                </div>
              </>
            )}
          </div>

          {submittedMessage && (
            <div className="p-3 bg-emerald-600 text-white rounded-2xl text-center font-bold text-sm shadow-xs">
              {submittedMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-white/80 transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 rounded-2xl text-sm font-bold text-white shadow-xs transition-all ${
                availability.isAvailable
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {availability.isAvailable ? 'Bekreft reservasjon' : 'Send reservasjon med varsel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
