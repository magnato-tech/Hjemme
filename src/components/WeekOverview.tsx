import React from 'react';
import { useFamily } from '../context/FamilyContext';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Sparkles,
  TaskIcon,
  Check,
  Zap,
} from './Icons';

export const WeekOverview: React.FC = () => {
  const {
    members,
    taskInstances,
    currentWeek,
    getMemberCompletedPoints,
    getMemberClaimedPoints,
    completeTask,
    claimTask,
  } = useFamily();

  const weekTasks = taskInstances.filter((t) => t.weekNumber === currentWeek);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex items-center space-x-4 backdrop-blur-md bg-white/60 p-6 sm:p-7 rounded-3xl border border-white/60 shadow-sm">
        <div className="w-13 h-13 bg-amber-100/80 text-amber-800 rounded-2xl flex items-center justify-center border border-amber-200/60 shadow-2xs">
          <TrendingUp className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Ukeoversikt • Uke {currentWeek}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Felles poengstatus og fremdrift for hele familien
          </p>
        </div>
      </div>

      {/* Family Member Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {members.map((member) => {
          const completed = getMemberCompletedPoints(member.id);
          const claimed = getMemberClaimedPoints(member.id);
          const goal = member.weeklyPointsGoal || 1;
          const remaining = Math.max(0, goal - completed);
          const percent = Math.min(100, Math.round((completed / goal) * 100));

          return (
            <div
              key={member.id}
              className="backdrop-blur-md bg-white/60 rounded-3xl p-5 sm:p-6 border border-white/60 shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-white/80 border border-white/80 shadow-2xs flex items-center justify-center text-2xl">
                      {member.avatarEmoji}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{member.name}</h3>
                      <span className="text-xs text-slate-500 font-medium capitalize">
                        {member.role === 'admin'
                          ? 'Administrator'
                          : member.role === 'adult'
                          ? 'Voksen'
                          : 'Barn/Ungdom'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-xl shadow-2xs ${
                      remaining === 0
                        ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-200/80'
                        : 'bg-indigo-50/90 text-indigo-900 border border-indigo-200/80'
                    }`}
                  >
                    {percent}%
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{completed} poeng utført</span>
                    <span>Mål: {goal}p</span>
                  </div>
                  <div className="w-full bg-white/80 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60 shadow-2xs">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percent >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-orange-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3.5 mt-3.5 border-t border-slate-200/50 flex items-center justify-between text-xs">
                <span className="text-slate-500">Gjenstår:</span>
                <span
                  className={`font-bold ${
                    remaining === 0 ? 'text-emerald-700 font-semibold' : 'text-orange-700'
                  }`}
                >
                  {remaining > 0 ? `${remaining} poeng` : 'Mål nådd! 🎉'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Master Task List for This Week */}
      <div className="backdrop-blur-md bg-white/60 rounded-3xl p-6 border border-white/60 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Alle oppgaver denne uken</h2>
            <p className="text-xs text-slate-500">
              Oversikt over fullførte, reserverte og ledige husoppgaver
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-white/80 backdrop-blur-xs text-slate-700 rounded-xl border border-white/60 shadow-2xs">
            {weekTasks.length} oppgaver
          </span>
        </div>

        <div className="mt-4 divide-y divide-slate-200/40">
          {weekTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isClaimed = task.status === 'claimed';
            const isAvailable = task.status === 'available';

            return (
              <div
                key={task.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-2.5 rounded-2xl mt-0.5 border shadow-2xs ${
                      isCompleted
                        ? 'bg-emerald-100/80 text-emerald-800 border-emerald-200/80'
                        : isClaimed
                        ? 'bg-indigo-100/80 text-indigo-800 border-indigo-200/80'
                        : 'bg-white/80 text-slate-600 border-slate-200/80'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <TaskIcon name={task.iconName} className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <h4
                        className={`text-sm font-bold ${
                          isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </h4>
                      <span className="text-xs px-2.5 py-0.5 rounded-lg bg-white/80 border border-slate-200/60 text-slate-600 font-medium shadow-2xs">
                        {task.area}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50/80 border border-indigo-200/60 text-indigo-900 shadow-2xs">
                        {task.points}p
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      {isCompleted ? (
                        <span className="text-emerald-800 font-medium">
                          ✅ Fullført av {task.completedByName || task.claimedByName}
                        </span>
                      ) : isClaimed ? (
                        <span className="text-indigo-800 font-medium">
                          ⏳ Tatt av {task.claimedByName} (Pågår)
                        </span>
                      ) : (
                        <span className="text-slate-500">⬜ Ledig for alle</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  {isClaimed && (
                    <button
                      onClick={() => completeTask(task.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Sett ferdig</span>
                    </button>
                  )}
                  {isAvailable && (
                    <button
                      onClick={() => claimTask(task.id)}
                      className="px-4 py-2 bg-white/80 hover:bg-white text-slate-800 border border-slate-200/80 rounded-2xl text-xs font-bold shadow-2xs transition-all"
                    >
                      Ta oppgave
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
