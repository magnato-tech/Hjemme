import { FamilyMember, MemberWeeklyPointsRecord, TaskInstance } from '../types';
import {
  formatLocalDateKey,
  getPointsWeekKey,
  getPointsWeekStartOffset,
  getWeekNumber,
  parseLocalDate,
} from './dateUtils';
import {
  getMemberClaimedPointsInWeek,
  getMemberCompletedPointsInWeek,
} from './taskUtils';

export const POINTS_HISTORY_WEEKS = 8;
export const CROWN_STREAK_WEEKS = 4;

export interface WeekChartBar {
  weekKey: string;
  weekNumber: number;
  label: string;
  completedPoints: number;
  weeklyPointsGoal: number;
  goalMet: boolean;
  isCurrentWeek: boolean;
}

export function buildWeeklyPointsRecord(
  member: FamilyMember,
  instances: TaskInstance[],
  weekStart: Date
): MemberWeeklyPointsRecord {
  const weekKey = formatLocalDateKey(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const completedPoints = getMemberCompletedPointsInWeek(instances, member.id, weekStart);
  const claimedPoints = getMemberClaimedPointsInWeek(instances, member.id, weekStart);
  const weeklyPointsGoal = member.weeklyPointsGoal || 1;

  return {
    id: `${member.id}_${weekKey}`,
    memberId: member.id,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    weekNumber: getWeekNumber(weekStart),
    year: weekStart.getFullYear(),
    completedPoints,
    claimedPoints,
    weeklyPointsGoal,
    goalMet: completedPoints >= weeklyPointsGoal,
    finalizedAt: new Date().toISOString(),
  };
}

export function getWeeksToFinalize(
  lastFinalizedWeekKey: string | undefined,
  now: Date = new Date()
): Date[] {
  const currentKey = getPointsWeekKey(now);
  const weeks: Date[] = [];

  if (!lastFinalizedWeekKey) {
    for (let i = POINTS_HISTORY_WEEKS; i >= 1; i--) {
      weeks.push(getPointsWeekStartOffset(i, now));
    }
    return weeks;
  }

  const cursor = parseLocalDate(lastFinalizedWeekKey);
  cursor.setDate(cursor.getDate() + 7);

  while (formatLocalDateKey(cursor) < currentKey) {
    weeks.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
}

export function buildMemberWeekChart(
  records: MemberWeeklyPointsRecord[],
  member: FamilyMember,
  liveCompletedPoints: number,
  weeksCount = POINTS_HISTORY_WEEKS,
  now: Date = new Date()
): WeekChartBar[] {
  const bars: WeekChartBar[] = [];

  for (let weeksAgo = weeksCount - 1; weeksAgo >= 0; weeksAgo--) {
    const weekStart = getPointsWeekStartOffset(weeksAgo, now);
    const weekKey = formatLocalDateKey(weekStart);
    const isCurrentWeek = weeksAgo === 0;

    if (isCurrentWeek) {
      const goal = member.weeklyPointsGoal || 1;
      bars.push({
        weekKey,
        weekNumber: getWeekNumber(weekStart),
        label: 'Nå',
        completedPoints: liveCompletedPoints,
        weeklyPointsGoal: goal,
        goalMet: liveCompletedPoints >= goal,
        isCurrentWeek: true,
      });
      continue;
    }

    const record = records.find(
      (r) => r.memberId === member.id && formatLocalDateKey(r.weekStart) === weekKey
    );

    if (record) {
      bars.push({
        weekKey,
        weekNumber: record.weekNumber,
        label: `U${record.weekNumber}`,
        completedPoints: record.completedPoints,
        weeklyPointsGoal: record.weeklyPointsGoal,
        goalMet: record.goalMet,
        isCurrentWeek: false,
      });
    } else {
      const goal = member.weeklyPointsGoal || 1;
      bars.push({
        weekKey,
        weekNumber: getWeekNumber(weekStart),
        label: `U${getWeekNumber(weekStart)}`,
        completedPoints: 0,
        weeklyPointsGoal: goal,
        goalMet: false,
        isCurrentWeek: false,
      });
    }
  }

  return bars;
}

export function getMemberGoalStreak(
  records: MemberWeeklyPointsRecord[],
  memberId: string,
  liveCompletedPoints: number,
  weeklyGoal: number,
  now: Date = new Date()
): number {
  const goal = weeklyGoal || 1;
  let streak = 0;

  if (liveCompletedPoints >= goal) {
    streak = 1;
  }

  for (let weeksAgo = 1; weeksAgo < 52; weeksAgo++) {
    const weekStart = getPointsWeekStartOffset(weeksAgo, now);
    const weekKey = formatLocalDateKey(weekStart);
    const record = records.find(
      (r) => r.memberId === memberId && formatLocalDateKey(r.weekStart) === weekKey
    );

    if (record?.goalMet) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export function memberHasCrown(
  records: MemberWeeklyPointsRecord[],
  memberId: string,
  liveCompletedPoints: number,
  weeklyGoal: number,
  now: Date = new Date()
): boolean {
  return (
    getMemberGoalStreak(records, memberId, liveCompletedPoints, weeklyGoal, now) >=
    CROWN_STREAK_WEEKS
  );
}
