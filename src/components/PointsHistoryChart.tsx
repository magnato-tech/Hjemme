import React from 'react';
import { FamilyMember, MemberWeeklyPointsRecord } from '../types';
import {
  buildMemberWeekChart,
  CROWN_STREAK_WEEKS,
  getMemberGoalStreak,
  memberHasCrown,
  POINTS_HISTORY_WEEKS,
} from '../utils/pointsHistoryUtils';

interface PointsHistoryChartProps {
  member: FamilyMember;
  records: MemberWeeklyPointsRecord[];
  liveCompletedPoints: number;
  compact?: boolean;
}

export const PointsHistoryChart: React.FC<PointsHistoryChartProps> = ({
  member,
  records,
  liveCompletedPoints,
  compact = false,
}) => {
  const bars = buildMemberWeekChart(records, member, liveCompletedPoints);
  const maxValue = Math.max(
    member.weeklyPointsGoal,
    ...bars.map((b) => b.completedPoints),
    1
  );
  const streak = getMemberGoalStreak(
    records,
    member.id,
    liveCompletedPoints,
    member.weeklyPointsGoal
  );
  const hasCrown = memberHasCrown(
    records,
    member.id,
    liveCompletedPoints,
    member.weeklyPointsGoal
  );

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600">
          Siste {POINTS_HISTORY_WEEKS} uker
        </span>
        {streak > 0 && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
              hasCrown
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {hasCrown ? '👑 ' : ''}
            {streak} uke{streak !== 1 ? 'r' : ''} på rad
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-1.5 h-24">
        {bars.map((bar) => {
          const heightPct = Math.max(4, Math.round((bar.completedPoints / maxValue) * 100));
          const goalPct = Math.min(100, Math.round((bar.weeklyPointsGoal / maxValue) * 100));

          return (
            <div
              key={bar.weekKey}
              className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
            >
              <span className="text-[10px] font-bold text-slate-500 mb-0.5 tabular-nums">
                {bar.completedPoints > 0 ? bar.completedPoints : ''}
              </span>
              <div className="relative w-full flex-1 flex items-end">
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-slate-300/80"
                  style={{ bottom: `${goalPct}%` }}
                  title={`Mål: ${bar.weeklyPointsGoal}p`}
                />
                <div
                  className={`w-full rounded-t-md transition-all ${
                    bar.goalMet
                      ? 'bg-emerald-500'
                      : bar.isCurrentWeek
                      ? 'bg-gradient-to-t from-indigo-500 to-orange-400'
                      : 'bg-slate-300'
                  } ${bar.isCurrentWeek ? 'ring-2 ring-indigo-300/60' : ''}`}
                  style={{ height: `${heightPct}%` }}
                  title={`${bar.label}: ${bar.completedPoints}/${bar.weeklyPointsGoal}p`}
                />
              </div>
              <span
                className={`text-[9px] font-medium mt-1 truncate w-full text-center ${
                  bar.isCurrentWeek ? 'text-indigo-700 font-bold' : 'text-slate-400'
                }`}
              >
                {bar.label}
              </span>
            </div>
          );
        })}
      </div>

      {hasCrown && !compact && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 font-medium">
          👑 Krone! {member.name} har nådd poengmålet {CROWN_STREAK_WEEKS} uker på rad!
        </p>
      )}
    </div>
  );
};
