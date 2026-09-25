import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { toDatetimeLocal } from '../../utils/dateUtils';
import { X, CalendarClock, Car, MapPin } from '../Icons';

interface AddCalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddCalendarEventModal: React.FC<AddCalendarEventModalProps> = ({ isOpen, onClose }) => {
  const { members, activeMember, addCalendarEvent, settings } = useFamily();

  const now = new Date();
  // Next whole hour
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 2, 0);
  const defaultEnd = new Date(defaultStart.getTime() + 90 * 60 * 1000); // 1.5 hour event

  const [memberId, setMemberId] = useState(activeMember.id);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(toDatetimeLocal(defaultStart));
  const [endTime, setEndTime] = useState(toDatetimeLocal(defaultEnd));
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isWorkRelated, setIsWorkRelated] = useState(true);
  const [createsCarReservation, setCreatesCarReservation] = useState(true);
  const [syncToGoogle, setSyncToGoogle] = useState(true);
  const [bufferBefore, setBufferBefore] = useState(settings.defaultTravelBufferBefore);
  const [bufferAfter, setBufferAfter] = useState(settings.defaultTravelBufferAfter);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) return;

    const chosenMember = members.find((m) => m.id === memberId) || activeMember;

    await addCalendarEvent({
      memberId: chosenMember.id,
      memberName: chosenMember.name,
      calendarId: 'cal_local',
      title: title.trim(),
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      isWorkRelated,
      createsCarReservation,
      isSyncedWithGoogle: syncToGoogle,
      bufferBeforeMinutes: createsCarReservation ? bufferBefore : undefined,
      bufferAfterMinutes: createsCarReservation ? bufferAfter : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="backdrop-blur-xl bg-white/85 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/80">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50 bg-white/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-100/80 text-sky-800 rounded-2xl border border-sky-200/60 shadow-2xs">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Legg til kalenderhendelse</h3>
              <p className="text-xs text-slate-500">Kan automatisk reservere familiebilen med reisetid</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5">
          {/* Member select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Hvem gjelder dette?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMemberId(m.id)}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-2xl border text-sm font-semibold transition-all shadow-2xs ${
                    memberId === m.id
                      ? 'border-sky-400/80 bg-sky-50/90 text-sky-950 ring-2 ring-sky-500/20'
                      : 'border-white/80 bg-white/70 text-slate-700 hover:bg-white'
                  }`}
                >
                  <span className="text-lg">{m.avatarEmoji}</span>
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Hva / Tittel *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="F.eks. Samtale, Jobbmøte, Tannlege, Trening"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 bg-white/70 backdrop-blur-xs shadow-2xs"
            />
          </div>

          {/* Location & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Sted (Valgfritt)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="F.eks. Lillesand, Grimstad, Kristiansand"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-white/80 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 bg-white/70 backdrop-blur-xs shadow-2xs"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Beskrivelse / Notat
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="F.eks. Samtale med kunde, hente varer..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 bg-white/70 backdrop-blur-xs shadow-2xs"
              />
            </div>
          </div>

          {/* Work Related & Google Sync */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center space-x-2.5 p-3 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-xs cursor-pointer shadow-2xs">
              <input
                type="checkbox"
                checked={isWorkRelated}
                onChange={(e) => setIsWorkRelated(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-800">Jobbrelatert (Prio 1)</span>
            </label>

            <label className="flex items-center space-x-2.5 p-3 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-xs cursor-pointer shadow-2xs">
              <input
                type="checkbox"
                checked={syncToGoogle}
                onChange={(e) => setSyncToGoogle(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span>2-veis Google Sync</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-md font-bold">G</span>
              </span>
            </label>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Starttidspunkt
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 bg-white/70 backdrop-blur-xs shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Sluttidspunkt
              </label>
              <input
                type="datetime-local"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 bg-white/70 backdrop-blur-xs shadow-2xs"
              />
            </div>
          </div>

          {/* Auto car reservation toggle */}
          <div className="p-4.5 rounded-2xl border border-white/80 bg-white/50 backdrop-blur-xs space-y-3 shadow-2xs">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={createsCarReservation}
                onChange={(e) => setCreatesCarReservation(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
              />
              <div>
                <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-sky-700" />
                  Opprett automatisk bilreservasjon
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reserverer familiebilen med reisetid før og etter arrangementet.
                </p>
              </div>
            </label>

            {createsCarReservation && (
              <div className="pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Reisetid før hendelse:
                  </label>
                  <select
                    value={bufferBefore}
                    onChange={(e) => setBufferBefore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200/80 bg-white/90 font-bold text-slate-800 shadow-2xs"
                  >
                    <option value={15}>15 min</option>
                    <option value={20}>20 min</option>
                    <option value={30}>30 min</option>
                    <option value={40}>40 min (Standard)</option>
                    <option value={60}>60 min</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Reisetid etter hendelse:
                  </label>
                  <select
                    value={bufferAfter}
                    onChange={(e) => setBufferAfter(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200/80 bg-white/90 font-bold text-slate-800 shadow-2xs"
                  >
                    <option value={15}>15 min</option>
                    <option value={20}>20 min</option>
                    <option value={30}>30 min</option>
                    <option value={40}>40 min (Standard)</option>
                    <option value={60}>60 min</option>
                  </select>
                </div>
              </div>
            )}
          </div>

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
              className="px-6 py-2.5 rounded-2xl text-sm font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors"
            >
              Lagre hendelse
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
