import { describe, it, expect } from 'vitest';
import { marcus } from './fixtures/taskFixtures';
import { MemberWeeklyPointsRecord } from '../types';
import {
  buildMemberWeekChart,
  buildWeeklyPointsRecord,
  CROWN_STREAK_WEEKS,
  getMemberGoalStreak,
  getWeeksToFinalize,
  memberHasCrown,
} from '../utils/pointsHistoryUtils';
import { formatLocalDateKey, getPointsWeekStartOffset } from '../utils/dateUtils';

const now = new Date('2026-09-25T14:00:00');

function makeRecord(
  weeksAgo: number,
  completedPoints: number,
  goal: number = 10
): MemberWeeklyPointsRecord {
  const weekStart = getPointsWeekStartOffset(weeksAgo, now);
  const weekKey = formatLocalDateKey(weekStart);
  return {
    id: `${marcus.id}_${weekKey}`,
    memberId: marcus.id,
    weekStart: weekStart.toISOString(),
    weekEnd: new Date(weekStart.getTime() + 7 * 86400000).toISOString(),
    weekNumber: 39,
    year: 2026,
    completedPoints,
    claimedPoints: 0,
    weeklyPointsGoal: goal,
    goalMet: completedPoints >= goal,
    finalizedAt: now.toISOString(),
  };
}

describe('pointsHistoryUtils', () => {
  it('getWeeksToFinalize backfills 8 weeks when no last key', () => {
    const weeks = getWeeksToFinalize(undefined, now);
    expect(weeks).toHaveLength(8);
  });

  it('buildMemberWeekChart returns 8 bars including current week', () => {
    const records = [makeRecord(1, 12), makeRecord(2, 8)];
    const bars = buildMemberWeekChart(records, marcus, 5, 8, now);
    expect(bars).toHaveLength(8);
    expect(bars[bars.length - 1].isCurrentWeek).toBe(true);
    expect(bars[bars.length - 1].completedPoints).toBe(5);
    expect(bars[bars.length - 2].completedPoints).toBe(12);
    expect(bars[bars.length - 2].goalMet).toBe(true);
  });

  it('getMemberGoalStreak counts consecutive goal weeks from current', () => {
    const records = [
      makeRecord(1, 10),
      makeRecord(2, 10),
      makeRecord(3, 10),
      makeRecord(4, 5),
    ];
    expect(getMemberGoalStreak(records, marcus.id, 10, 10, now)).toBe(4);
    expect(getMemberGoalStreak(records, marcus.id, 5, 10, now)).toBe(3);
    expect(getMemberGoalStreak(records, marcus.id, 0, 10, now)).toBe(3);
  });

  it('memberHasCrown when streak reaches threshold', () => {
    const records = [
      makeRecord(1, 10),
      makeRecord(2, 10),
      makeRecord(3, 10),
    ];
    expect(memberHasCrown(records, marcus.id, 10, 10, now)).toBe(true);
    expect(memberHasCrown(records, marcus.id, 5, 10, now)).toBe(false);
    expect(CROWN_STREAK_WEEKS).toBe(4);
  });

  it('buildWeeklyPointsRecord snapshots goal and points', () => {
    const record = buildWeeklyPointsRecord(marcus, [], getPointsWeekStartOffset(1, now));
    expect(record.memberId).toBe(marcus.id);
    expect(record.completedPoints).toBe(0);
    expect(record.goalMet).toBe(false);
    expect(record.weeklyPointsGoal).toBe(marcus.weeklyPointsGoal);
  });
});
