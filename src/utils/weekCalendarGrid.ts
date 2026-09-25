import { CalendarEvent } from '../types';

export const WEEK_GRID_START_HOUR = 6;
export const WEEK_GRID_END_HOUR = 22;
export const WEEK_GRID_MIN_HOUR_PX = 52;
export const WEEK_GRID_HOUR_COUNT = WEEK_GRID_END_HOUR - WEEK_GRID_START_HOUR + 1;

export interface GridStyle {
  top: string;
  height: string;
}

function clampMinutes(
  startIso: string,
  endIso: string,
  gridStartHour: number,
  gridEndHour: number
): { start: number; end: number } {
  const startDate = new Date(startIso);
  const endDate = new Date(endIso);
  const gridStart = gridStartHour * 60;
  const gridEnd = gridEndHour * 60;

  const rawStart = startDate.getHours() * 60 + startDate.getMinutes();
  const rawEnd = endDate.getHours() * 60 + endDate.getMinutes();

  return {
    start: Math.max(gridStart, rawStart),
    end: Math.min(gridEnd, Math.max(rawStart + 15, rawEnd)),
  };
}

/** Plasserer et tidsrom i uke-timegridet (prosent innenfor 06:00–22:00). */
export function timeRangeToGridStyle(
  startIso: string,
  endIso: string,
  gridStartHour = WEEK_GRID_START_HOUR,
  gridEndHour = WEEK_GRID_END_HOUR
): GridStyle {
  const { start, end } = clampMinutes(startIso, endIso, gridStartHour, gridEndHour);
  const gridStartMinutes = gridStartHour * 60;
  const gridTotalMinutes = (gridEndHour - gridStartHour) * 60;

  const topPercent = ((start - gridStartMinutes) / gridTotalMinutes) * 100;
  const heightPercent = Math.max(1.5, ((end - start) / gridTotalMinutes) * 100);

  return { top: `${topPercent}%`, height: `${heightPercent}%` };
}

export function isAllDayEvent(ev: CalendarEvent): boolean {
  const start = new Date(ev.startTime);
  const end = new Date(ev.endTime);
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return start.getHours() === 0 && start.getMinutes() === 0 && durationHours >= 20;
}

export interface PositionedTimedEvent {
  event: CalendarEvent;
  column: number;
  totalColumns: number;
}

/** Side-om-side layout for overlappende hendelser. */
export function layoutTimedEvents(events: CalendarEvent[]): PositionedTimedEvent[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const positioned: PositionedTimedEvent[] = [];

  sorted.forEach((event) => {
    const start = new Date(event.startTime).getTime();
    const end = new Date(event.endTime).getTime();

    const overlapping = positioned.filter((p) => {
      const pStart = new Date(p.event.startTime).getTime();
      const pEnd = new Date(p.event.endTime).getTime();
      return start < pEnd && end > pStart;
    });

    const occupiedColumns = new Set(overlapping.map((p) => p.column));
    let column = 0;
    while (occupiedColumns.has(column)) column++;

    positioned.push({ event, column, totalColumns: column + 1 });
  });

  positioned.forEach((item) => {
    const start = new Date(item.event.startTime).getTime();
    const end = new Date(item.event.endTime).getTime();

    const overlappingGroup = positioned.filter((p) => {
      const pStart = new Date(p.event.startTime).getTime();
      const pEnd = new Date(p.event.endTime).getTime();
      return start < pEnd && end > pStart;
    });

    item.totalColumns = Math.max(...overlappingGroup.map((p) => p.column)) + 1;
  });

  return positioned;
}

/** Mandag 00:00 for uken som inneholder `date`. */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

export interface MonthCalendarCell {
  date: Date;
  isCurrentMonth: boolean;
}

/** Mandag-basert 6-ukers rutenett for månedsvisning. */
export function buildMonthCalendarCells(year: number, month: number): MonthCalendarCell[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const cells: MonthCalendarCell[] = [];

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false,
    });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  const remainingCells = 42 - cells.length;
  for (let i = 1; i <= (remainingCells >= 7 ? remainingCells - 7 : remainingCells); i++) {
    cells.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  return cells;
}

/** Brøkdel av grid-høyde (0–1) for «nå»-linje; null utenfor 06:00–22:00. */
export function getNowLineFraction(
  now = new Date(),
  gridStartHour = WEEK_GRID_START_HOUR,
  gridEndHour = WEEK_GRID_END_HOUR
): number | null {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = gridStartHour * 60;
  const end = gridEndHour * 60;
  if (minutes < start || minutes > end) return null;
  return (minutes - start) / (end - start);
}
