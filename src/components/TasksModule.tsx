import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Plus,
  Zap,
  Check,
  RotateCw,
  ListTodo,
  Edit2,
  Trash2,
  Info,
  TaskIcon,
  Shield,
  ArrowRight,
} from './Icons';
import { TaskInstance, TaskTemplate } from '../types';
import { getMemberPointsProgress, getSmartTaskSuggestions } from '../utils/taskUtils';

interface TasksModuleProps {
  onOpenCreateTask: () => void;
}

export const TasksModule: React.FC<TasksModuleProps> = ({ onOpenCreateTask }) => {
  const {
    activeMember,
    members,
    taskTemplates,
    taskInstances,
    claimTask,
    unclaimTask,
    completeTask,
    claimSuggestedTasks,
    deleteTaskTemplate,
    updateTaskTemplate,
    getMemberCompletedPoints,
    getMemberClaimedPoints,
    currentWeek,
  } = useFamily();

  const [activeTab, setActiveTab] = useState<'my_tasks' | 'available' | 'library' | 'history'>('available');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editPoints, setEditPoints] = useState<number>(2);

  const completedPoints = getMemberCompletedPoints(activeMember.id);
  const claimedPoints = getMemberClaimedPoints(activeMember.id);
  const { remainingPoints, progressPercent } = getMemberPointsProgress(
    completedPoints,
    activeMember.weeklyPointsGoal
  );

  // Filter tasks for current week
  const currentWeekInstances = taskInstances.filter((t) => t.weekNumber === currentWeek);

  const myClaimedTasks = currentWeekInstances.filter(
    (t) => t.status === 'claimed' && t.claimedByMemberId === activeMember.id
  );

  const myCompletedTasks = currentWeekInstances.filter(
    (t) => t.status === 'completed' && (t.completedByMemberId === activeMember.id || t.claimedByMemberId === activeMember.id)
  );

  const availableTasks = currentWeekInstances.filter((t) => t.status === 'available');

  const suggested = getSmartTaskSuggestions(availableTasks, remainingPoints);
  const suggestedTotal = suggested.reduce((s, t) => s + t.points, 0);

  const handleStartEditTemplate = (tmpl: TaskTemplate) => {
    setEditingTemplateId(tmpl.id);
    setEditPoints(tmpl.points);
  };

  const handleSaveEditTemplate = (templateId: string) => {
    updateTaskTemplate(templateId, { points: editPoints });
    setEditingTemplateId(null);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md bg-white/60 p-6 sm:p-7 rounded-3xl border border-white/60 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-13 h-13 bg-indigo-100/80 text-indigo-800 rounded-2xl flex items-center justify-center border border-indigo-200/60 shadow-2xs">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Husoppgaver & Poeng
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Automatisk fordeling, gjentakende oppgaver og full valgfrihet
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCreateTask}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow-sm transition-all border border-indigo-400/30"
        >
          <Plus className="w-4 h-4" />
          <span>Ny oppgavemal</span>
        </button>
      </div>

      {/* Point Goal Card for active member */}
      <div className="backdrop-blur-xl bg-slate-900/90 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/4 -bottom-10 w-60 h-60 bg-orange-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-orange-300 text-xs font-semibold uppercase tracking-wider">
              <span>{activeMember.name}s ukemål</span>
              <span>•</span>
              <span>Uke {currentWeek}</span>
            </div>
            <div className="text-3xl font-extrabold tracking-tight">
              {completedPoints} / {activeMember.weeklyPointsGoal} poeng
            </div>
            <p className="text-xs text-indigo-200">
              {remainingPoints > 0
                ? `Du mangler ${remainingPoints} poeng for å nå ukens mål.`
                : 'Gratulerer! Ukens poengmål er nådd! 🎉'}
            </p>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-700/60">
            <span className="text-xs text-slate-300 font-medium">Status</span>
            <span
              className={`text-lg font-bold ${
                remainingPoints === 0 ? 'text-emerald-400' : 'text-orange-400'
              }`}
            >
              {remainingPoints > 0 ? `${remainingPoints}p gjenstår` : '✅ Fullført'}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800/90 rounded-full h-3.5 mt-4 overflow-hidden p-0.5 border border-slate-700/80">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPercent >= 100 ? 'bg-emerald-400' : 'bg-gradient-to-r from-indigo-400 to-orange-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* SMART SUGGESTER BANNER */}
      {remainingPoints > 0 && suggested.length > 0 && (
        <div className="p-5 rounded-3xl bg-orange-50/80 backdrop-blur-md border border-orange-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-orange-950 font-bold text-sm">
              <Zap className="w-4 h-4 text-orange-600" />
              <span>Smart forslag for å nå målet ({suggestedTotal} poeng)</span>
            </div>
            <p className="text-xs text-orange-800">
              Du mangler {remainingPoints} poeng denne uken. Her er en rask kombinasjon:
            </p>
            <div className="flex flex-wrap gap-2 pt-1.5">
              {suggested.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-xs rounded-xl border border-orange-200 text-xs font-semibold text-orange-950 shadow-2xs"
                >
                  <TaskIcon name={t.iconName} className="w-3.5 h-3.5 text-orange-700" />
                  <span>{t.title}</span>
                  <span className="text-orange-600 font-bold">({t.points}p)</span>
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => claimSuggestedTasks(suggested.map((t) => t.id))}
            className="px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-2xl shadow-xs transition-all shrink-0 border border-orange-400/30"
          >
            Ta foreslåtte oppgaver ({suggestedTotal}p)
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex p-1.5 bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 space-x-1 overflow-x-auto shadow-2xs">
        <button
          onClick={() => setActiveTab('available')}
          className={`py-2.5 px-4 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'available'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <span>Ledige oppgaver</span>
          <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
            activeTab === 'available' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {availableTasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('my_tasks')}
          className={`py-2.5 px-4 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'my_tasks'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <span>Mine oppgaver</span>
          <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
            activeTab === 'my_tasks' ? 'bg-slate-700 text-white' : 'bg-indigo-100 text-indigo-900'
          }`}>
            {myClaimedTasks.length + myCompletedTasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`py-2.5 px-4 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'library'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <span>Oppgavemaler & Poeng</span>
          <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
            activeTab === 'library' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {taskTemplates.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT: AVAILABLE TASKS */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Velg fritt blant tilgjengelige oppgaver i huset for å samle poeng.
            </p>
            <span className="text-xs font-semibold text-slate-600">
              Sortert etter poeng
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTasks.length > 0 ? (
              availableTasks.map((task) => (
                <div
                  key={task.id}
                  className="backdrop-blur-md bg-white/60 rounded-3xl p-5 sm:p-6 border border-white/60 shadow-sm hover:border-indigo-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-indigo-100/80 text-indigo-800 rounded-2xl border border-indigo-200/60 shadow-2xs">
                          <TaskIcon name={task.iconName} className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{task.title}</h3>
                          <p className="text-xs text-slate-500">
                            {task.area} • {task.room}
                          </p>
                        </div>
                      </div>

                      <span className="px-3.5 py-1 bg-white/80 border border-white/80 text-indigo-950 font-extrabold text-sm rounded-2xl shadow-2xs">
                        {task.points} poeng
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Frist: {task.deadlineDate}</span>
                      {task.isMandatory && (
                        <span className="text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                          Obligatorisk
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-200/50 flex items-center justify-between">
                    <span className="text-xs text-emerald-700 font-medium">
                      Status: Tilgjengelig
                    </span>
                    <button
                      onClick={() => claimTask(task.id)}
                      className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-xs transition-colors"
                    >
                      Ta oppgave (+{task.points}p)
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-12 text-center backdrop-blur-md bg-white/40 rounded-3xl border border-dashed border-slate-300/80">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">
                  Alle ukens oppgaver er tatt eller fullført!
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Systemet vil automatisk generere neste ukes oppgaver ved ukeskifte.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: MY TASKS */}
      {activeTab === 'my_tasks' && (
        <div className="space-y-6">
          {/* Claimed / In Progress */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">
              Pågående oppgaver ({myClaimedTasks.length})
            </h2>

            {myClaimedTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myClaimedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="backdrop-blur-md bg-white/70 rounded-3xl p-5 sm:p-6 border-2 border-indigo-200/80 shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-3 bg-indigo-100 text-indigo-800 rounded-2xl border border-indigo-200/60 shadow-2xs">
                            <TaskIcon name={task.iconName} className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">{task.title}</h3>
                            <p className="text-xs text-slate-500">{task.area}</p>
                          </div>
                        </div>
                        <span className="px-3.5 py-1 bg-indigo-600 text-white font-extrabold text-sm rounded-2xl shadow-2xs">
                          {task.points} poeng
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-600 leading-relaxed">{task.description}</p>
                      )}
                    </div>

                    <div className="pt-4 mt-3 border-t border-slate-200/50 flex items-center justify-between">
                      <button
                        onClick={() => unclaimTask(task.id)}
                        className="text-xs text-slate-400 hover:text-slate-700 font-medium"
                      >
                        Frigjør oppgave
                      </button>
                      <button
                        onClick={() => completeTask(task.id)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>Marker som ferdig</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 backdrop-blur-md bg-white/40 rounded-3xl text-center border border-slate-200/80 text-xs text-slate-500">
                Du har ingen reserverte oppgaver akkurat nå.{' '}
                <button
                  onClick={() => setActiveTab('available')}
                  className="text-indigo-600 font-bold underline"
                >
                  Velg fra ledige oppgaver
                </button>
              </div>
            )}
          </div>

          {/* Completed History This Week */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">
              Fullførte oppgaver denne uken ({myCompletedTasks.length})
            </h2>

            <div className="space-y-2">
              {myCompletedTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 backdrop-blur-xs bg-white/50 rounded-2xl border border-white/60 flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 line-through text-slate-500">
                        {task.title}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {task.area} • Fullført av {task.completedByName || activeMember.name}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl shadow-2xs">
                    +{task.points} poeng
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: OPPGAVEMALER & BIBLIOTEK */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Oppgavemaler & Administrasjon</h2>
              <p className="text-xs text-slate-500">
                Endre poengverdi, rom eller gjentakelse. Historiske utførte oppgaver beholder tidligere poeng.
              </p>
            </div>
            <button
              onClick={onOpenCreateTask}
              className="px-3.5 py-2 bg-white/80 hover:bg-white text-indigo-900 font-bold text-xs rounded-2xl border border-indigo-200 flex items-center gap-1 shadow-2xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ny mal</span>
            </button>
          </div>

          <div className="divide-y divide-slate-200/40 backdrop-blur-md bg-white/60 rounded-3xl border border-white/60 overflow-hidden shadow-sm">
            {taskTemplates.map((tmpl) => {
              const isEditing = editingTemplateId === tmpl.id;
              return (
                <div key={tmpl.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 bg-white/80 border border-slate-200/60 text-slate-700 rounded-2xl mt-0.5 shadow-2xs">
                      <TaskIcon name={tmpl.iconName} className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base">{tmpl.title}</h4>
                        <span className="text-xs bg-white/80 px-2 py-0.5 rounded-lg font-medium text-slate-600 border border-slate-200/50 shadow-2xs">
                          {tmpl.area}
                        </span>
                        <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-medium border border-indigo-100">
                          {tmpl.recurrence === 'weekly' ? 'Hver uke' : tmpl.recurrence}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{tmpl.description}</p>
                      <p className="text-[11px] text-slate-400 mt-1">Frist: {tmpl.deadlineDay}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-center">
                    {isEditing ? (
                      <div className="flex items-center space-x-2 bg-white/80 p-1.5 rounded-2xl border border-slate-300 shadow-2xs">
                        <span className="text-xs font-semibold text-slate-600">Poeng:</span>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={editPoints}
                          onChange={(e) => setEditPoints(Number(e.target.value))}
                          className="w-14 px-2 py-1 rounded-xl border border-slate-300 text-xs font-bold text-center bg-white"
                        />
                        <button
                          onClick={() => handleSaveEditTemplate(tmpl.id)}
                          className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
                        >
                          Lagre
                        </button>
                        <button
                          onClick={() => setEditingTemplateId(null)}
                          className="px-2 py-1 text-slate-500 text-xs hover:text-slate-800"
                        >
                          Avbryt
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-extrabold text-indigo-900 px-3.5 py-1 bg-white/80 rounded-2xl border border-white/80 shadow-2xs">
                          {tmpl.points} poeng
                        </span>
                        <button
                          onClick={() => handleStartEditTemplate(tmpl)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white/80 rounded-xl transition-colors"
                          title="Endre poengverdi"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTaskTemplate(tmpl.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Slett mal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
