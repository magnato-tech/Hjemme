import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import {
  combineDatetimeLocal,
  formatNorwegianDateInput,
  formatNorwegianTimeInput,
  parseNorwegianDateInput,
  parseNorwegianTimeInput,
  splitDatetimeLocal,
  tryBuildDatetimeLocal,
} from '../utils/dateUtils';
import {
  clampPickerTime,
  isDatetimeLocalWithinRange,
  isPickerHourAllowed,
  isPickerMinuteSelected,
  isPickerTimeAllowed,
  pad2,
  PICKER_MINUTES,
  resolveTimePickerPlacement,
  snapMinuteToQuarter,
} from '../utils/norwegianTimePickerUtils';

interface NorwegianDateTimeInputProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

const DEFAULT_CLASS =
  'px-3 py-2.5 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-xs text-sm focus:outline-hidden focus:ring-2 shadow-2xs';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const POPUP_HEIGHT = 192;

function fieldClass(className: string): string {
  return className.replace(/\bw-full\b/g, '').trim() || DEFAULT_CLASS;
}

function parseTimeParts(time: string): { h: number; m: number } {
  const parsed = parseNorwegianTimeInput(time);
  if (!parsed) return { h: 0, m: 0 };
  const [h, m] = parsed.split(':').map(Number);
  return { h, m };
}

export const NorwegianDateTimeInput: React.FC<NorwegianDateTimeInputProps> = ({
  value,
  onChange,
  min,
  max,
  required,
  className = DEFAULT_CLASS,
  id,
}) => {
  const hiddenDateRef = useRef<HTMLInputElement>(null);
  const timeContainerRef = useRef<HTMLDivElement>(null);
  const hourOptionRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const minuteOptionRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const { date: isoDate, time: isoTime } = splitDatetimeLocal(value);
  const minParts = min ? splitDatetimeLocal(min) : { date: '', time: '' };
  const maxParts = max ? splitDatetimeLocal(max) : { date: '', time: '' };

  const [dateDraft, setDateDraft] = useState(() => formatNorwegianDateInput(value));
  const [timeDraft, setTimeDraft] = useState(() => formatNorwegianTimeInput(value));
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timePickerPlacement, setTimePickerPlacement] = useState<'below' | 'above'>('below');

  const effectiveDate = parseNorwegianDateInput(dateDraft) || isoDate;
  const minTime = effectiveDate && effectiveDate === minParts.date ? minParts.time : undefined;
  const maxTime = effectiveDate && effectiveDate === maxParts.date ? maxParts.time : undefined;

  const currentTime = parseNorwegianTimeInput(timeDraft) || isoTime || '00:00';
  const { h: selectedHour, m: selectedMinute } = parseTimeParts(currentTime);
  const pickerMinute = snapMinuteToQuarter(selectedMinute);

  useEffect(() => {
    setDateDraft(formatNorwegianDateInput(value));
    setTimeDraft(formatNorwegianTimeInput(value));
  }, [value]);

  useEffect(() => {
    if (!timePickerOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (timeContainerRef.current?.contains(event.target as Node)) return;
      setTimePickerOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTimePickerOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [timePickerOpen]);

  useLayoutEffect(() => {
    if (!timePickerOpen) return;

    const rect = timeContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      setTimePickerPlacement(resolveTimePickerPlacement(spaceBelow, POPUP_HEIGHT));
    }

    hourOptionRefs.current[selectedHour]?.scrollIntoView({ block: 'center' });
    minuteOptionRefs.current[pickerMinute]?.scrollIntoView({ block: 'center' });
  }, [timePickerOpen, selectedHour, pickerMinute]);

  const tryEmit = (dateText: string, timeText: string) => {
    const built = tryBuildDatetimeLocal(dateText, timeText);
    if (!built || !isDatetimeLocalWithinRange(built, min, max)) return;
    onChange(built);
  };

  const applyTime = (h: number, m: number) => {
    const dateIso = parseNorwegianDateInput(dateDraft) || isoDate;
    if (!dateIso) return;

    const clamped = clampPickerTime(h, m, minTime, maxTime);
    const time = `${pad2(clamped.h)}:${pad2(clamped.m)}`;
    const built = combineDatetimeLocal(dateIso, time);
    if (!isDatetimeLocalWithinRange(built, min, max)) return;
    onChange(built);
  };

  const openDatePicker = () => {
    const el = hiddenDateRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      el.showPicker();
    } else {
      el.focus();
      el.click();
    }
  };

  const openTimePicker = () => {
    setTimePickerOpen((open) => !open);
  };

  const handlePickerChange = (nextDate: string) => {
    if (!nextDate) return;
    const time = parseNorwegianTimeInput(timeDraft) || isoTime || '00:00';
    const built = combineDatetimeLocal(nextDate, time);
    if (!isDatetimeLocalWithinRange(built, min, max)) return;
    onChange(built);
  };

  const resetDateDraft = () => setDateDraft(formatNorwegianDateInput(value));
  const resetTimeDraft = () => setTimeDraft(formatNorwegianTimeInput(value));

  const inputClass = fieldClass(className);

  return (
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_5.75rem] gap-2">
      <div className="relative min-w-0">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/åååå"
          value={dateDraft}
          required={required}
          onChange={(e) => {
            const next = e.target.value;
            setDateDraft(next);
            tryEmit(next, timeDraft);
          }}
          onBlur={() => {
            if (tryBuildDatetimeLocal(dateDraft, timeDraft)) return;
            resetDateDraft();
          }}
          className={`${inputClass} w-full tabular-nums pr-9`}
        />
        <button
          type="button"
          onClick={openDatePicker}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-white/60 hover:text-slate-700"
          aria-label="Åpne kalender"
          tabIndex={-1}
        >
          <Calendar className="h-4 w-4" aria-hidden />
        </button>
        <input
          ref={hiddenDateRef}
          type="date"
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          value={isoDate}
          min={minParts.date || undefined}
          max={maxParts.date || undefined}
          onChange={(e) => handlePickerChange(e.target.value)}
        />
      </div>

      <div ref={timeContainerRef} className="relative min-w-0">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="tt:mm"
          value={timeDraft}
          required={required}
          onChange={(e) => {
            const next = e.target.value;
            setTimeDraft(next);
            tryEmit(dateDraft, next);
          }}
          onBlur={() => {
            if (tryBuildDatetimeLocal(dateDraft, timeDraft)) return;
            resetTimeDraft();
          }}
          className={`${inputClass} w-full tabular-nums pl-1.5 pr-8 text-center`}
        />
        <button
          type="button"
          onClick={openTimePicker}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-white/60 hover:text-slate-700"
          aria-label="Åpne tidsvelger"
          aria-expanded={timePickerOpen}
          tabIndex={-1}
        >
          <Clock className="h-4 w-4" aria-hidden />
        </button>

        {timePickerOpen && (
          <div
            role="dialog"
            aria-label="Velg klokkeslett"
            className={`absolute z-50 left-0 w-[7.5rem] rounded-2xl border border-slate-200/90 bg-white shadow-lg overflow-hidden ${
              timePickerPlacement === 'below' ? 'top-full mt-1' : 'bottom-full mb-1'
            }`}
          >
            <div className="flex divide-x divide-slate-100">
              <div className="h-48 w-1/2 overflow-y-auto overscroll-contain py-1">
                {HOURS.map((hour) => {
                  const allowed = isPickerHourAllowed(hour, minTime, maxTime);
                  const selected = hour === selectedHour;
                  return (
                    <button
                      key={hour}
                      ref={(el) => {
                        hourOptionRefs.current[hour] = el;
                      }}
                      type="button"
                      disabled={!allowed}
                      onClick={() => applyTime(hour, pickerMinute)}
                      className={`block w-full px-2 py-1.5 text-sm tabular-nums transition-colors ${
                        selected
                          ? 'bg-orange-500 text-white font-semibold'
                          : allowed
                            ? 'text-slate-700 hover:bg-orange-50'
                            : 'text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      {pad2(hour)}
                    </button>
                  );
                })}
              </div>
              <div className="h-48 w-1/2 overflow-y-auto overscroll-contain py-1">
                {PICKER_MINUTES.map((minute) => {
                  const allowed = isPickerTimeAllowed(selectedHour, minute, minTime, maxTime);
                  const selected = isPickerMinuteSelected(selectedMinute, minute);
                  return (
                    <button
                      key={minute}
                      ref={(el) => {
                        minuteOptionRefs.current[minute] = el;
                      }}
                      type="button"
                      disabled={!allowed}
                      onClick={() => applyTime(selectedHour, minute)}
                      className={`block w-full px-2 py-1.5 text-sm tabular-nums transition-colors ${
                        selected
                          ? 'bg-orange-500 text-white font-semibold'
                          : allowed
                            ? 'text-slate-700 hover:bg-orange-50'
                            : 'text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      {pad2(minute)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
