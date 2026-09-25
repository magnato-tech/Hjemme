import { TaskInstance, TaskTemplate } from '../types';

export type TaskMember = { id: string; name: string };

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
  weekNumber: number,
  year: number
): number {
  return instances
    .filter(
      (t) =>
        t.weekNumber === weekNumber &&
        t.year === year &&
        t.status === 'completed' &&
        (t.completedByMemberId === memberId ||
          (!t.completedByMemberId && t.claimedByMemberId === memberId))
    )
    .reduce((sum, t) => sum + t.points, 0);
}

export function getMemberClaimedPoints(
  instances: TaskInstance[],
  memberId: string,
  weekNumber: number,
  year: number
): number {
  return instances
    .filter(
      (t) =>
        t.weekNumber === weekNumber &&
        t.year === year &&
        t.status === 'claimed' &&
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
  member: { id: string; name: string }
): TaskInstance {
  return {
    ...instance,
    status: 'completed',
    completedByMemberId: member.id,
    completedByName: member.name,
    completedAt: instance.completedAt ?? new Date(0).toISOString(),
    claimedByMemberId: instance.claimedByMemberId || member.id,
    claimedByName: instance.claimedByName || member.name,
  };
}

/** Lager neste ukentlige instans etter fullføring, eller null hvis ikke aktuelt. */
export function buildNextRecurringInstance(
  template: TaskTemplate,
  completedInstance: TaskInstance,
  existingInstances: TaskInstance[],
  now: () => number = Date.now
): TaskInstance | null {
  if (!template.isActive || template.recurrence === 'once') return null;

  const nextWeek = (completedInstance.weekNumber % 52) + 1;
  const nextYear = nextWeek === 1 ? completedInstance.year + 1 : completedInstance.year;

  const alreadyExists = existingInstances.some(
    (inst) =>
      inst.templateId === template.id &&
      inst.weekNumber === nextWeek &&
      inst.year === nextYear
  );

  if (alreadyExists) return null;

  return {
    id: `inst_${template.id}_w${nextWeek}_${now().toString(36)}`,
    templateId: template.id,
    title: template.title,
    description: template.description,
    area: template.area,
    room: template.room,
    points: template.points,
    weekNumber: nextWeek,
    year: nextYear,
    status: 'available',
    deadlineDate: template.deadlineDay || 'Søndag 20:00',
    iconName: template.iconName,
    isMandatory: template.isMandatory,
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
  memberId: string
): TaskInstance[] {
  return instances.filter(
    (t) =>
      t.status === 'completed' &&
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

/** Speiler completeTask i FamilyContext, inkl. neste ukentlige instans. */
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
    completedInstance = {
      ...completeTaskInstance(t, member),
      completedAt,
    };
    return completedInstance;
  });

  if (!completedInstance) return instances;

  const template = templates.find((tmpl) => tmpl.id === completedInstance.templateId);
  const next = template
    ? buildNextRecurringInstance(template, completedInstance, instances, now)
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
