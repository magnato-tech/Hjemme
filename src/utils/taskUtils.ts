import { TaskInstance, TaskTemplate } from '../types';
import { getWeekNumber, isInCurrentPointsWeek, isInPointsWeek } from './dateUtils';

export type TaskMember = { id: string; name: string };

export const TASK_WEEKDAY_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Ingen spesiell ukedag' },
  { value: 1, label: 'Mandag' },
  { value: 2, label: 'Tirsdag' },
  { value: 3, label: 'Onsdag' },
  { value: 4, label: 'Torsdag' },
  { value: 5, label: 'Fredag' },
  { value: 6, label: 'Lørdag' },
  { value: 0, label: 'Søndag' },
];

const WEEKDAY_LABELS = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];

function startOfCalendarDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfCalendarDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addCalendarDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Beregner frist kl. 23:59:59 ut fra fullføringstidspunkt og mal-innstillinger. */
export function calculateDueAt(
  anchor: Date | string,
  intervalDays: number,
  fixedWeekday: number | null
): Date {
  const anchorDate = typeof anchor === 'string' ? new Date(anchor) : new Date(anchor);
  const earliest = startOfCalendarDay(addCalendarDays(anchorDate, intervalDays));

  if (fixedWeekday === null) {
    return endOfCalendarDay(earliest);
  }

  let candidate = startOfCalendarDay(earliest);
  while (candidate.getDay() !== fixedWeekday) {
    candidate = addCalendarDays(candidate, 1);
  }
  return endOfCalendarDay(candidate);
}

export function formatTaskDeadline(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;

  const day = date.getDate();
  const month = date.toLocaleDateString('nb-NO', { month: 'short' });
  const weekday = WEEKDAY_LABELS[date.getDay()];
  return `${weekday} ${day}. ${month} kl. 23:59`;
}

export function formatTemplateSchedule(template: TaskTemplate): string {
  if (template.intervalDays === 0) return 'Engangsoppgave';
  if (template.intervalDays === 1) return 'Hver dag';
  return `Hver ${template.intervalDays}. dag`;
}

export function formatTemplateDeadlineRule(template: TaskTemplate): string {
  if (template.fixedWeekday === null) {
    return `${template.intervalDays} dager etter fullført`;
  }
  const day = TASK_WEEKDAY_OPTIONS.find((o) => o.value === template.fixedWeekday)?.label;
  return day ?? 'Fast ukedag';
}

export function hasPendingInstanceForTemplate(
  instances: TaskInstance[],
  templateId: string
): boolean {
  return instances.some(
    (inst) =>
      inst.templateId === templateId &&
      (inst.status === 'available' || inst.status === 'claimed')
  );
}

export function createTaskInstanceFromTemplate(
  template: TaskTemplate,
  anchor: Date | string,
  now: () => number = Date.now
): TaskInstance {
  const anchorDate = typeof anchor === 'string' ? new Date(anchor) : anchor;
  const dueAt = calculateDueAt(anchorDate, template.intervalDays, template.fixedWeekday);
  const weekNumber = getWeekNumber(anchorDate);
  const year = anchorDate.getFullYear();

  return {
    id: `inst_${template.id}_${now().toString(36)}`,
    templateId: template.id,
    title: template.title,
    description: template.description,
    area: template.area,
    room: template.room,
    points: template.points,
    weekNumber,
    year,
    status: 'available',
    deadlineDate: dueAt.toISOString(),
    iconName: template.iconName,
    isMandatory: template.isMandatory,
  };
}

/** Lager neste instans etter fullføring, eller null hvis ikke aktuelt. */
export function spawnNextTaskInstance(
  template: TaskTemplate,
  completedAt: string,
  existingInstances: TaskInstance[],
  now: () => number = Date.now
): TaskInstance | null {
  if (!template.isActive || template.intervalDays <= 0) return null;
  if (hasPendingInstanceForTemplate(existingInstances, template.id)) return null;

  return createTaskInstanceFromTemplate(template, completedAt, now);
}

/** Starter oppgavepoolen på nytt for alle aktive maler med intervalDays > 0. */
export function buildRestartedTaskInstances(
  templates: TaskTemplate[],
  anchor: Date | string = new Date(),
  now: () => number = Date.now
): TaskInstance[] {
  const anchorDate = typeof anchor === 'string' ? new Date(anchor) : anchor;
  return templates
    .filter((t) => t.isActive && t.intervalDays > 0)
    .map((template) => createTaskInstanceFromTemplate(template, anchorDate, now));
}

/** Foreslår oppgaver som fyller ukemålet mest effektivt (greedy poeng). */
export function getSmartTaskSuggestions(
  availableTasks: TaskInstance[],
  remainingPoints: number
): TaskInstance[] {
  if (remainingPoints <= 0 || availableTasks.length === 0) return [];

  const sorted = [...availableTasks].sort((a, b) => b.points - a.points);
  let accum = 0;
  const chosen: TaskInstance[] = [];

  for (const task of sorted) {
    if (accum + task.points <= remainingPoints) {
      chosen.push(task);
      accum += task.points;
    }
  }

  if (chosen.length === 0 && availableTasks.length > 0) {
    return [availableTasks[0]];
  }

  return chosen;
}

export function getMemberCompletedPoints(
  instances: TaskInstance[],
  memberId: string,
  asOf: Date = new Date()
): number {
  return instances
    .filter(
      (t) =>
        t.status === 'completed' &&
        isInCurrentPointsWeek(t.completedAt, asOf) &&
        (t.completedByMemberId === memberId ||
          (!t.completedByMemberId && t.claimedByMemberId === memberId))
    )
    .reduce((sum, t) => sum + t.points, 0);
}

export function getMemberClaimedPoints(
  instances: TaskInstance[],
  memberId: string,
  asOf: Date = new Date()
): number {
  return instances
    .filter(
      (t) =>
        t.status === 'claimed' &&
        isInCurrentPointsWeek(t.claimedAt, asOf) &&
        t.claimedByMemberId === memberId
    )
    .reduce((sum, t) => sum + t.points, 0);
}

export function getMemberCompletedPointsInWeek(
  instances: TaskInstance[],
  memberId: string,
  weekStart: Date
): number {
  return instances
    .filter(
      (t) =>
        t.status === 'completed' &&
        isInPointsWeek(t.completedAt, weekStart) &&
        (t.completedByMemberId === memberId ||
          (!t.completedByMemberId && t.claimedByMemberId === memberId))
    )
    .reduce((sum, t) => sum + t.points, 0);
}

export function getMemberClaimedPointsInWeek(
  instances: TaskInstance[],
  memberId: string,
  weekStart: Date
): number {
  return instances
    .filter(
      (t) =>
        t.status === 'claimed' &&
        isInPointsWeek(t.claimedAt, weekStart) &&
        t.claimedByMemberId === memberId
    )
    .reduce((sum, t) => sum + t.points, 0);
}

export function getMemberPointsProgress(
  completedPoints: number,
  weeklyGoal: number
): { remainingPoints: number; progressPercent: number } {
  const goal = weeklyGoal || 1;
  const remainingPoints = Math.max(0, weeklyGoal - completedPoints);
  const progressPercent = Math.min(100, Math.round((completedPoints / goal) * 100));
  return { remainingPoints, progressPercent };
}

export function claimTaskInstance(
  instance: TaskInstance,
  member: { id: string; name: string }
): TaskInstance {
  return {
    ...instance,
    status: 'claimed',
    claimedByMemberId: member.id,
    claimedByName: member.name,
    claimedAt: instance.claimedAt ?? new Date(0).toISOString(),
  };
}

export function unclaimTaskInstance(instance: TaskInstance): TaskInstance | null {
  if (instance.status !== 'claimed') return null;
  return {
    ...instance,
    status: 'available',
    claimedByMemberId: undefined,
    claimedByName: undefined,
    claimedAt: undefined,
  };
}

export function completeTaskInstance(
  instance: TaskInstance,
  member: { id: string; name: string },
  completedAt: string = new Date().toISOString()
): TaskInstance {
  const completedDate = new Date(completedAt);
  return {
    ...instance,
    status: 'completed',
    completedByMemberId: member.id,
    completedByName: member.name,
    completedAt,
    weekNumber: getWeekNumber(completedDate),
    year: completedDate.getFullYear(),
    claimedByMemberId: instance.claimedByMemberId || member.id,
    claimedByName: instance.claimedByName || member.name,
  };
}

export function isMemberEligibleForTemplate(
  template: TaskTemplate | undefined,
  memberId: string
): boolean {
  if (!template || !template.isActive) return false;
  if (template.eligibleMemberIds.length === 0) return true;
  return template.eligibleMemberIds.includes(memberId);
}

export function filterInstancesForWeek(
  instances: TaskInstance[],
  weekNumber: number,
  year?: number
): TaskInstance[] {
  return instances.filter(
    (t) => t.weekNumber === weekNumber && (year === undefined || t.year === year)
  );
}

export function getAvailableTaskInstances(instances: TaskInstance[]): TaskInstance[] {
  return instances.filter((t) => t.status === 'available');
}

export function getOpenTaskInstances(instances: TaskInstance[]): TaskInstance[] {
  return instances.filter((t) => t.status === 'available' || t.status === 'claimed');
}

export function getMemberClaimedTaskInstances(
  instances: TaskInstance[],
  memberId: string
): TaskInstance[] {
  return instances.filter(
    (t) => t.status === 'claimed' && t.claimedByMemberId === memberId
  );
}

export function getMemberCompletedTaskInstances(
  instances: TaskInstance[],
  memberId: string,
  asOf: Date = new Date()
): TaskInstance[] {
  return instances.filter(
    (t) =>
      t.status === 'completed' &&
      isInCurrentPointsWeek(t.completedAt, asOf) &&
      (t.completedByMemberId === memberId || t.claimedByMemberId === memberId)
  );
}

export function getAvailableTasksForMember(
  instances: TaskInstance[],
  templates: TaskTemplate[],
  memberId: string
): TaskInstance[] {
  const templateById = new Map(templates.map((t) => [t.id, t]));
  return getAvailableTaskInstances(instances).filter((inst) =>
    isMemberEligibleForTemplate(templateById.get(inst.templateId), memberId)
  );
}

export function filterTasksByArea(instances: TaskInstance[], area: string): TaskInstance[] {
  return instances.filter((t) => t.area === area);
}

/** Speiler claimTask i FamilyContext. */
export function applyClaimTask(
  instances: TaskInstance[],
  instanceId: string,
  member: TaskMember,
  claimedAt: string = new Date().toISOString()
): TaskInstance[] {
  return instances.map((t) => {
    if (t.id !== instanceId) return t;
    return {
      ...claimTaskInstance(t, member),
      claimedAt,
    };
  });
}

/** Speiler unclaimTask i FamilyContext. */
export function applyUnclaimTask(
  instances: TaskInstance[],
  instanceId: string
): TaskInstance[] {
  return instances.map((t) => {
    if (t.id !== instanceId) return t;
    const unclaimed = unclaimTaskInstance(t);
    return unclaimed ?? t;
  });
}

/** Speiler completeTask i FamilyContext, inkl. neste instans ved fullføring. */
export function applyCompleteTask(
  instances: TaskInstance[],
  instanceId: string,
  member: TaskMember,
  templates: TaskTemplate[],
  completedAt: string = new Date().toISOString(),
  now: () => number = Date.now
): TaskInstance[] {
  let completedInstance: TaskInstance | undefined;

  const updated = instances.map((t) => {
    if (t.id !== instanceId) return t;
    completedInstance = completeTaskInstance(t, member, completedAt);
    return completedInstance;
  });

  if (!completedInstance) return instances;

  const template = templates.find((tmpl) => tmpl.id === completedInstance!.templateId);
  const next = template
    ? spawnNextTaskInstance(template, completedAt, updated, now)
    : null;

  return next ? [...updated, next] : updated;
}

/** Speiler claimSuggestedTasks i FamilyContext. */
export function applyClaimSuggestedTasks(
  instances: TaskInstance[],
  instanceIds: string[],
  member: TaskMember,
  claimedAt: string = new Date().toISOString()
): TaskInstance[] {
  return instances.map((t) => {
    if (!instanceIds.includes(t.id) || t.status !== 'available') return t;
    return {
      ...claimTaskInstance(t, member),
      claimedAt,
    };
  });
}

/** Speiler restartTaskPool i FamilyContext. */
export function applyRestartTaskPool(
  templates: TaskTemplate[],
  anchor: Date | string = new Date(),
  now: () => number = Date.now
): TaskInstance[] {
  return buildRestartedTaskInstances(templates, anchor, now);
}
