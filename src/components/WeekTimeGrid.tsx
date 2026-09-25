import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock } from './Icons';
import { CalendarEvent } from '../types';
import { formatTime, getWeekNumber, isSameDay, isToday } from '../utils/dateUtils';
import {
  getNowLineFraction,
  getWeekDates,
  getWeekStart,
  isAllDayEvent,
  layoutTimedEvents,
  timeRangeToGridStyle,
  WEEK_GRID_END_HOUR,
  WEEK_GRID_HOUR_COUNT,
  WEEK_GRID_MIN_HOUR_PX,
  WEEK_GRID_START_HOUR,
} from '../utils/weekCalendarGrid';
import {
  CarReservationSpan,
  FAMILY_CAR_LINE_COLOR,
} from '../utils/carReservationSpans';
import { getDisplayEventTitle } from '../utils/calendarEventDisplay';

const CAR_LINE_WIDTH_PX = 5;
const CAR_LINE_EVENT_INSET_PX = 6;

interface WeekTimeGridProps {
  events: CalendarEvent[];
  weekAnchor: Date;
  onWeekChange: (date: Date) => void;
  onGoToToday: () => void;
  getEventColor: (event: CalendarEvent) => string;
  dayNamesShort: string[];
  monthNames: string[];
  carSpansByDay?: CarReservationSpan[][];
  showFamilyCarLine?: boolean;
}

const HOURS = Array.from(
  { length: WEEK_GRID_HOUR_COUNT },
  (_, i) => WEEK_GRID_START_HOUR + i
);

const MIN_GRID_HEIGHT = WEEK_GRID_HOUR_COUNT * WEEK_GRID_MIN_HOUR_PX;

export const WeekTimeGrid: React.FC<WeekTimeGridProps> = ({
  events,
  weekAnchor,
  onWeekChange,
  onGoToToday,
  getEventColor,
  dayNamesShort,
  monthNames,
  carSpansByDay,
  showFamilyCarLine = false,
}) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const weekStart = useMemo(() => getWeekStart(weekAnchor), [weekAnchor]);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const weekEnd = weekDates[6];

  const eventsByDay = useMemo(
    () =>
      weekDates.map((date) => {
        const dayEvents = events.filter((e) => isSameDay(e.startTime, date));
        return {
          date,
          allDay: dayEvents.filter(isAllDayEvent),
          timed: dayEvents.filter((e) => !isAllDayEvent(e)),
        };
      }),
    [events, weekDates]
  );

  const hasAllDayEvents = eventsByDay.some((d) => d.allDay.length > 0);
  const nowLineFraction = getNowLineFraction(now);
  const weekLabel = `${weekStart.getDate()}. ${monthNames[weekStart.getMonth()].slice(0, 3)} – ${weekEnd.getDate()}. ${monthNames[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getFullYear()}`;

  const shiftWeek = (delta: number) => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + delta * 7);
    onWeekChange(next);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col backdrop-blur-md bg-white/70 rounded-3xl border border-white/80 shadow-sm overflow-hidden">
      <div className="shrink-0 flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
            aria-label="Forrige uke"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
            aria-label="Neste uke"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Uke {getWeekNumber(weekStart)}
            </h2>
            <p className="text-[11px] text-slate-500">{weekLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onGoToToday}
          className="px-3 py-1 text-xs font-bold bg-white text-slate-700 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 cursor-pointer"
        >
          I dag
        </button>
      </div>

      <div className="shrink-0 grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b border-slate-200/60 bg-white/90 min-w-[640px]">
        <div className="border-r border-slate-200/50" />
        {weekDates.map((date, idx) => {
          const today = isToday(date);
          return (
            <div
              key={idx}
              className={`py-2 text-center border-r border-slate-200/50 last:border-r-0 ${
                today ? 'bg-sky-50/80' : ''
              }`}
            >
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                {dayNamesShort[idx]}
              </div>
              <div
                className={`mt-0.5 inline-flex items-center justify-center w-7 h-7 text-sm font-bold rounded-full ${
                  today ? 'bg-sky-600 text-white' : 'text-slate-800'
                }`}
              >
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {hasAllDayEvents && (
        <div className="shrink-0 grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b border-slate-200/60 bg-slate-50/50 min-w-[640px]">
          <div className="flex items-center justify-center text-[9px] font-bold text-slate-400 uppercase border-r border-slate-200/50 px-1">
            Hele dagen
          </div>
          {eventsByDay.map(({ date, allDay }, dayIdx) => (
            <div
              key={dayIdx}
              className={`p-1 min-h-[1.75rem] border-r border-slate-200/50 last:border-r-0 space-y-0.5 ${
                isToday(date) ? 'bg-sky-50/40' : ''
              }`}
            >
              {allDay.map((ev) => {
                const color = getEventColor(ev);
                return (
                  <div
                    key={ev.id}
                    className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium text-slate-800"
                    style={{
                      backgroundColor: `${color}22`,
                      borderLeft: `3px solid ${color}`,
                    }}
                    title={getDisplayEventTitle(ev)}
                  >
                    {getDisplayEventTitle(ev)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        <div
          className="relative grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] min-w-[640px]"
          style={{
            minHeight: '100%',
            height: `max(100%, ${MIN_GRID_HEIGHT}px)`,
            gridTemplateRows: `repeat(${WEEK_GRID_HOUR_COUNT}, minmax(${WEEK_GRID_MIN_HOUR_PX}px, 1fr))`,
          }}
        >
          {HOURS.map((hour, rowIdx) => (
            <div
              key={`time-${hour}`}
              className="relative border-r border-slate-200/50 border-t border-slate-200/40 text-[10px] text-slate-400 font-medium text-right pr-1.5 -mt-2.5"
              style={{ gridColumn: 1, gridRow: rowIdx + 1 }}
            >
              {hour.toString().padStart(2, '0')}:00
            </div>
          ))}

          {eventsByDay.map(({ date, timed }, dayIdx) => {
            const positioned = layoutTimedEvents(timed);
            const today = isToday(date);
            const carSpans = showFamilyCarLine ? carSpansByDay?.[dayIdx] ?? [] : [];

            return (
              <div
                key={dayIdx}
                className={`relative border-r border-slate-200/50 last:border-r-0 ${
                  today ? 'bg-sky-50/30' : 'bg-white/40'
                }`}
                style={{
                  gridColumn: dayIdx + 2,
                  gridRow: `1 / ${WEEK_GRID_HOUR_COUNT + 1}`,
                }}
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-slate-200/35 pointer-events-none"
                    style={{
                      top: `${((hour - WEEK_GRID_START_HOUR) / WEEK_GRID_HOUR_COUNT) * 100}%`,
                    }}
                  />
                ))}

                {today && nowLineFraction !== null && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${nowLineFraction * 100}%` }}
                  >
                    <div className="relative h-0.5 bg-red-500">
                      <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
                    </div>
                  </div>
                )}

                {carSpans.map((span, spanIdx) => {
                  const style = timeRangeToGridStyle(span.startTime, span.endTime);

                  return (
                    <div
                      key={`car-span-${dayIdx}-${spanIdx}`}
                      className="absolute left-0 z-[5] pointer-events-none rounded-sm"
                      style={{
                        top: style.top,
                        height: style.height,
                        width: `${CAR_LINE_WIDTH_PX}px`,
                        backgroundColor: FAMILY_CAR_LINE_COLOR,
                      }}
                      title="Familiebilen opptatt (inkl. reisetid)"
                    />
                  );
                })}

                {positioned.map(({ event, column, totalColumns }) => {
                  const color = getEventColor(event);
                  const style = timeRangeToGridStyle(event.startTime, event.endTime);
                  const widthPercent = 100 / totalColumns;
                  const leftPercent = (column * 100) / totalColumns;
                  const title = getDisplayEventTitle(event);

                  const eventInset = showFamilyCarLine ? CAR_LINE_EVENT_INSET_PX : 0;

                  return (
                    <div
                      key={event.id}
                      className="absolute z-10 px-px"
                      style={{
                        top: style.top,
                        height: style.height,
                        left: `calc(${leftPercent}% + ${eventInset}px)`,
                        width: `calc(${widthPercent}% - ${eventInset}px)`,
                        minHeight: '22px',
                      }}
                    >
                      <div
                        className="h-full rounded-[4px] overflow-hidden px-1.5 py-0.5 text-left shadow-sm"
                        style={{
                          backgroundColor: `${color}28`,
                          borderLeft: `3px solid ${color}`,
                        }}
                        title={`${title} (${formatTime(event.startTime)} – ${formatTime(event.endTime)})`}
                      >
                        <div className="flex items-start gap-0.5 min-w-0">
                          {event.isConfidential && (
                            <Lock className="w-2.5 h-2.5 text-amber-700 shrink-0 mt-0.5" />
                          )}
                          <span className="text-[11px] font-semibold text-slate-900 leading-tight truncate block">
                            {title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-600 leading-none block truncate">
                          {formatTime(event.startTime)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
