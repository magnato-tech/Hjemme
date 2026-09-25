import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { RecurrenceType } from '../../types';
import { X, Sparkles, TaskIcon } from '../Icons';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_ICONS = [
  'brush',
  'sparkles',
  'bath',
  'utensils',
  'trash-2',
  'coffee',
  'shopping-cart',
  'shirt',
  'home',
];

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose }) => {
  const { createTaskTemplate, members, areas } = useFamily();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState(() => areas[0]?.name || '1. etasje');
  const [room, setRoom] = useState(() => areas[0]?.rooms[0] || 'Kjøkken');
  const [points, setPoints] = useState(2);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('weekly');
  const [deadlineDay, setDeadlineDay] = useState('Søndag 20:00');
  const [isMandatory, setIsMandatory] = useState(false);
  const [iconName, setIconName] = useState('brush');
  const [eligibleMembers, setEligibleMembers] = useState<string[]>(members.map((m) => m.id));

  if (!isOpen) return null;

  const currentAreaRooms = areas.find((a) => a.name === area)?.rooms || ['Hovedrom'];

  const toggleMemberEligibility = (mId: string) => {
    if (eligibleMembers.includes(mId)) {
      setEligibleMembers(eligibleMembers.filter((id) => id !== mId));
    } else {
      setEligibleMembers([...eligibleMembers, mId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createTaskTemplate({
      title: title.trim(),
      description: description.trim(),
      area,
      room,
      points: Number(points) || 1,
      recurrence,
      deadlineDay,
      eligibleMemberIds: eligibleMembers,
      isActive: true,
      isMandatory,
      iconName,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="backdrop-blur-xl bg-white/85 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-white/80">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50 bg-white/40 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-100/80 text-indigo-800 rounded-2xl border border-indigo-200/60 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Opprett ny husoppgave</h3>
              <p className="text-xs text-slate-500">Legges til i oppgavebiblioteket og opprettes automatisk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-2xl hover:bg-white/80 transition-all border border-transparent hover:border-white/80"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Oppgavens navn *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="F.eks. Koste opp, Vaske bad, Tømme søppel"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white/70 backdrop-blur-xs shadow-2xs"
            />
          </div>

          {/* Points & Recurrence */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Poengverdi
              </label>
              <div className="flex items-center space-x-1.5">
                {[1, 2, 3, 4, 5].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPoints(p)}
                    className={`flex-1 py-2 text-sm font-bold rounded-xl border transition-all shadow-2xs ${
                      points === p
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white/70 text-slate-700 border-white/80 hover:bg-white'
                    }`}
                  >
                    {p}p
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Gjentakelse
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white/70 backdrop-blur-xs shadow-2xs"
              >
                <option value="weekly">Hver uke (Automatisk)</option>
                <option value="biweekly">Hver 2. uke</option>
                <option value="monthly">Månedlig</option>
                <option value="daily">Daglig / Løpende</option>
                <option value="once">Engangsoppgave</option>
              </select>
            </div>
          </div>

          {/* Area & Room */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Område / Etasje
              </label>
              <select
                value={area}
                onChange={(e) => {
                  const selArea = e.target.value;
                  setArea(selArea);
                  const matched = areas.find((a) => a.name === selArea);
                  if (matched && matched.rooms.length > 0) {
                    setRoom(matched.rooms[0]);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white/70 backdrop-blur-xs shadow-2xs"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Rom
              </label>
              <select
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white/70 backdrop-blur-xs shadow-2xs"
              >
                {currentAreaRooms.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deadline & Icon */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Frist
              </label>
              <input
                type="text"
                value={deadlineDay}
                onChange={(e) => setDeadlineDay(e.target.value)}
                placeholder="F.eks. Søndag 20:00"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white/70 backdrop-blur-xs shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Ikon
              </label>
              <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
                {AVAILABLE_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIconName(ic)}
                    className={`p-2 rounded-xl border transition-all shadow-2xs ${
                      iconName === ic
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-800 ring-2 ring-indigo-500/20'
                        : 'bg-white/70 border-white/80 text-slate-500 hover:bg-white'
                    }`}
                  >
                    <TaskIcon name={ic} className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Beskrivelse / Hva skal gjøres?
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="F.eks. Bruk moppen i gangen og husk hjørnene under bordet."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-white/80 text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white/70 backdrop-blur-xs shadow-2xs resize-none"
            />
          </div>

          {/* Who can take task */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Hvem kan utføre denne oppgaven?
            </label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const isSelected = eligibleMembers.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMemberEligibility(m.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-2xs ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-300 text-indigo-900 ring-1 ring-indigo-300'
                        : 'bg-white/60 border-white/80 text-slate-400'
                    }`}
                  >
                    <span>{m.avatarEmoji}</span>
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mandatory switch */}
          <label className="flex items-center space-x-3 p-3.5 rounded-2xl border border-white/80 bg-white/50 backdrop-blur-xs cursor-pointer shadow-2xs">
            <input
              type="checkbox"
              checked={isMandatory}
              onChange={(e) => setIsMandatory(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-900">Obligatorisk fellesoppgave</span>
              <p className="text-slate-500">Må fullføres før ukeslutt</p>
            </div>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200/50">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-white/80 transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
            >
              Lagre og opprett oppgave
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
