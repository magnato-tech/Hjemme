import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock } from './Icons';
import { CalendarEvent } from '../types';
import { formatTime, getWeekNumber, isEventOnDate, isSameDay, isToday } from '../utils/dateUtils';
import {
  getNowLineFraction,
  getWeekDates,
  getWeekStart,
  isAllDayEvent,
  layoutTimedEvents,
  timeRangeToGridStyle,
  computeWeekGridHourHeightPx,
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

/** Shared column template: mandag–søndag på én rad også på smal mobil. */
const WEEK_GRID_COLS =
  'grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))] sm:grid-cols-[3rem_repeat(7,minmax(0,1fr))] w-full min-w-0';

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
  const [hourRowPx, setHourRowPx] = useState(WEEK_GRID_MIN_HOUR_PX);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const updateHourRowHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      setHourRowPx(computeWeekGridHourHeightPx(height, window.innerWidth));
    };
    updateHourRowHeight();
    window.addEventListener('resize', updateHourRowHeight);
    window.visualViewport?.addEventListener('resize', updateHourRowHeight);
    return () => {
      window.removeEventListener('resize', updateHourRowHeight);
      window.visualViewport?.removeEventListener('resize', updateHourRowHeight);
    };
  }, []);

  const fitsViewport = hourRowPx < WEEK_GRID_MIN_HOUR_PX;
  const topOffsetPx = hourRowPx / 2;
  const gridHeightPx = WEEK_GRID_HOUR_COUNT * hourRowPx;

  const weekStart = useMemo(() => getWeekStart(weekAnchor), [weekAnchor]);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const weekEnd = weekDates[6];

  const eventsByDay = useMemo(
    () =>
      weekDates.map((date) => {
        const dayEvents = events.filter((e) => isEventOnDate(e, date));
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
      <div className="shrink-0 flex items-center justify-between gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5 border-b border-slate-200/60">
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
          <div className="flex items-baseline gap-1.5 min-w-0 flex-nowrap">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 shrink-0">
              Uke {getWeekNumber(weekStart)}
            </h2>
            <span className="text-[10px] sm:text-[11px] text-slate-500 truncate">{weekLabel}</span>
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

      <div
        className={`flex-1 min-h-0 overflow-x-hidden ${
          fitsViewport ? 'overflow-y-hidden' : 'overflow-y-auto'
        }`}
      >
        <div className="w-full min-w-0">
          <div className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/95 backdrop-blur-sm">
            <div className={`${WEEK_GRID_COLS} border-b border-slate-200/60`}>
              <div className="border-r border-slate-200/50" />
              {weekDates.map((date, idx) => {
                const today = isToday(date);
                return (
                  <div
                    key={idx}
                    className={`py-1 sm:py-2 text-center border-r border-slate-200/50 last:border-r-0 ${
                      today ? 'bg-sky-50/80' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1 leading-none whitespace-nowrap">
                      <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        {dayNamesShort[idx]}
                      </span>
                      <span
                        className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 sm:min-w-[1.5rem] sm:h-6 px-0.5 text-[11px] sm:text-sm font-bold rounded-full ${
                          today ? 'bg-sky-600 text-white' : 'text-slate-800'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasAllDayEvents && (
              <div className={`${WEEK_GRID_COLS} bg-slate-50/90 border-b border-slate-200/60`}>
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
          </div>

          <div
            className={`relative ${WEEK_GRID_COLS}`}
            style={{
              paddingTop: topOffsetPx,
              height: gridHeightPx + topOffsetPx,
              minHeight: gridHeightPx + topOffsetPx,
              gridTemplateRows: `repeat(${WEEK_GRID_HOUR_COUNT}, ${hourRowPx}px)`,
            }}
          >
          {HOURS.map((hour, rowIdx) => (
            <div
              key={`time-${hour}`}
              className="relative border-r border-slate-200/50 text-[9px] sm:text-[10px] text-slate-400 font-medium text-right pr-0.5 sm:pr-1.5 whitespace-nowrap tabular-nums leading-none"
              style={{ gridColumn: 1, gridRow: rowIdx + 1 }}
            >
              <span className="absolute right-0.5 sm:right-1.5 top-0 -translate-y-1/2">
                {hour.toString().padStart(2, '0')}:00
              </span>
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
                        minHeight: fitsViewport ? '14px' : '22px',
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
                        <div className="flex items-center gap-0.5 min-w-0 whitespace-nowrap overflow-hidden leading-tight">
                          {event.isConfidential && (
                            <Lock className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                          )}
                          <span className="text-[9px] sm:text-[10px] text-slate-600 shrink-0 tabular-nums">
                            {formatTime(event.startTime)}
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-900 truncate min-w-0">
                            {title}
                          </span>
                        </div>
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
    </div>
  );
};
