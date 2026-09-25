import { FamilyMember, TaskInstance, TaskTemplate } from '../../types';
import { calculateDueAt, createTaskInstanceFromTemplate } from '../../utils/taskUtils';

export const TEST_WEEK = 39;
export const TEST_YEAR = 2026;

export const marcus: FamilyMember = {
  id: 'member_marcus',
  name: 'Marcus',
  role: 'child',
  avatarColor: 'bg-indigo-600',
  avatarEmoji: '👦',
  weeklyPointsGoal: 10,
  isActive: true,
  canReserveCar: true,
  canManageTasks: false,
  canManageFamily: false,
};

export const synelle: FamilyMember = {
  id: 'member_synelle',
  name: 'Synelle',
  role: 'adult',
  avatarColor: 'bg-rose-600',
  avatarEmoji: '👩‍🦰',
  weeklyPointsGoal: 10,
  isActive: true,
  canReserveCar: true,
  canManageTasks: true,
  canManageFamily: true,
};

export const magnar: FamilyMember = {
  id: 'member_magnar',
  name: 'Magnar',
  role: 'admin',
  avatarColor: 'bg-emerald-600',
  avatarEmoji: '👨‍💼',
  weeklyPointsGoal: 6,
  isActive: true,
  canReserveCar: true,
  canManageTasks: true,
  canManageFamily: true,
};

export const houseTaskTemplates: TaskTemplate[] = [
  {
    id: 'tmpl_koste_nede',
    title: 'Koste nede',
    description: 'Koste stue, kjøkken og gang i 1. etasje.',
    area: '1. etasje',
    room: 'Stue & Gang',
    points: 2,
    intervalDays: 7,
    fixedWeekday: 0,
    eligibleMemberIds: ['member_marcus', 'member_synelle', 'member_magnar'],
    isActive: true,
    isMandatory: true,
    iconName: 'brush',
  },
  {
    id: 'tmpl_tomme_oppvask',
    title: 'Tømme oppvaskmaskin',
    description: 'Tømme ren oppvask og sette inn skitten oppvask.',
    area: '1. etasje',
    room: 'Kjøkken',
    points: 1,
    intervalDays: 2,
    fixedWeekday: null,
    eligibleMemberIds: ['member_marcus', 'member_synelle', 'member_magnar'],
    isActive: true,
    isMandatory: false,
    iconName: 'utensils',
  },
  {
    id: 'tmpl_vaske_bad',
    title: 'Vaske bad',
    description: 'Vaske vask, toalett, speil og gulv på badet.',
    area: '1. & 2. etasje',
    room: 'Bad',
    points: 4,
    intervalDays: 7,
    fixedWeekday: 0,
    eligibleMemberIds: ['member_marcus', 'member_synelle', 'member_magnar'],
    isActive: true,
    isMandatory: true,
    iconName: 'bath',
  },
  {
    id: 'tmpl_handle',
    title: 'Handle matvarer',
    description: 'Ukens storhandel etter felles handleliste.',
    area: 'Ute',
    room: 'Butikk',
    points: 3,
    intervalDays: 7,
    fixedWeekday: 5,
    eligibleMemberIds: ['member_synelle', 'member_magnar'],
    isActive: true,
    isMandatory: false,
    iconName: 'shopping-cart',
  },
  {
    id: 'tmpl_engangs',
    title: 'Rydde garasje',
    description: 'Engangsoppgave i garasjen.',
    area: 'Ute & Hage',
    room: 'Garasje',
    points: 5,
    intervalDays: 0,
    fixedWeekday: null,
    eligibleMemberIds: [],
    isActive: true,
    isMandatory: false,
    iconName: 'home',
  },
];

function makeAvailableInstance(
  id: string,
  template: TaskTemplate,
  anchor: string,
  overrides: Partial<TaskInstance> = {}
): TaskInstance {
  const dueAt = calculateDueAt(anchor, template.intervalDays, template.fixedWeekday);
  return {
    id,
    templateId: template.id,
    title: template.title,
    description: template.description,
    area: template.area,
    room: template.room,
    points: template.points,
    weekNumber: TEST_WEEK,
    year: TEST_YEAR,
    status: 'available',
    deadlineDate: dueAt.toISOString(),
    iconName: template.iconName,
    isMandatory: template.isMandatory,
    ...overrides,
  };
}

/** Marcus har 7 poeng fullført; ledige oppgaver i poolen. */
export function createHouseWeekInstances(): TaskInstance[] {
  const anchor = '2026-09-22T10:00:00';
  const koste = houseTaskTemplates[0];
  const oppvask = houseTaskTemplates[1];
  const bad = houseTaskTemplates[2];
  const handle = houseTaskTemplates[3];

  return [
    {
      ...makeAvailableInstance('inst_soppel_done', oppvask, anchor),
      title: 'Søppel',
      area: 'Ute / Kjøkken',
      room: 'Søppelkasser',
      points: 1,
      status: 'completed',
      claimedByMemberId: marcus.id,
      claimedByName: marcus.name,
      completedByMemberId: marcus.id,
      completedByName: marcus.name,
      completedAt: '2026-09-23T12:00:00',
    },
    {
      ...makeAvailableInstance('inst_koste_opp_done', koste, anchor),
      title: 'Koste opp',
      area: '2. etasje',
      room: 'Gang & Rom',
      points: 2,
      status: 'completed',
      claimedByMemberId: marcus.id,
      claimedByName: marcus.name,
      completedByMemberId: marcus.id,
      completedByName: marcus.name,
      completedAt: '2026-09-24T12:00:00',
    },
    {
      ...makeAvailableInstance('inst_vaske_gulv_done', bad, anchor),
      title: 'Vaske gulv oppe',
      area: '2. etasje',
      room: 'Alle rom oppe',
      points: 4,
      status: 'completed',
      claimedByMemberId: marcus.id,
      claimedByName: marcus.name,
      completedByMemberId: marcus.id,
      completedByName: marcus.name,
      completedAt: '2026-09-25T12:00:00',
    },
    makeAvailableInstance('inst_koste_nede_avail', koste, anchor),
    makeAvailableInstance('inst_tomme_oppvask_avail', oppvask, anchor),
    makeAvailableInstance('inst_vaske_bad_avail', bad, anchor),
    makeAvailableInstance('inst_handle_avail', handle, anchor),
  ];
}

export function createTemplateInstance(
  template: TaskTemplate,
  anchor = '2026-09-22T10:00:00'
): TaskInstance {
  return createTaskInstanceFromTemplate(template, anchor, () => 12345);
}
