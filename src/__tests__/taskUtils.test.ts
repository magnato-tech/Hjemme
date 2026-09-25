import { describe, expect, it } from 'vitest';
import { TaskInstance, TaskTemplate } from '../types';
import {
  applyRestartTaskPool,
  calculateDueAt,
  claimTaskInstance,
  completeTaskInstance,
  getMemberClaimedPoints,
  getMemberCompletedPoints,
  getMemberPointsProgress,
  getSmartTaskSuggestions,
  spawnNextTaskInstance,
  unclaimTaskInstance,
} from '../utils/taskUtils';

const member = { id: 'member_marcus', name: 'Marcus' };

function makeTask(
  id: string,
  points: number,
  status: TaskInstance['status'] = 'available',
  weekNumber = 39,
  year = 2026
): TaskInstance {
  return {
    id,
    templateId: `tmpl_${id}`,
    title: `Oppgave ${id}`,
    description: '',
    area: '2. etasje',
    room: 'Gang',
    points,
    weekNumber,
    year,
    status,
    deadlineDate: '2026-09-27T21:59:59.999Z',
    iconName: 'brush',
    isMandatory: false,
    claimedByMemberId: status === 'claimed' ? member.id : undefined,
    claimedByName: status === 'claimed' ? member.name : undefined,
    claimedAt: status === 'claimed' ? '2026-09-25T12:00:00' : undefined,
    completedAt: status === 'completed' ? '2026-09-25T12:00:00' : undefined,
    completedByMemberId: status === 'completed' ? member.id : undefined,
  };
}

const pointsAsOf = new Date(2026, 8, 25, 14, 0, 0);

const weeklyTemplate: TaskTemplate = {
  id: 'tmpl_koste',
  title: 'Koste opp',
  description: 'Koste gulv',
  area: '2. etasje',
  room: 'Gang',
  points: 2,
  intervalDays: 7,
  fixedWeekday: 0,
  eligibleMemberIds: [],
  isActive: true,
  isMandatory: true,
  iconName: 'brush',
};

describe('taskUtils', () => {
  describe('calculateDueAt', () => {
    it('setter rullerende frist X dager etter fullført kl 23:59:59', () => {
      const due = calculateDueAt('2026-09-22T14:00:00', 2, null);
      expect(due.getFullYear()).toBe(2026);
      expect(due.getMonth()).toBe(8);
      expect(due.getDate()).toBe(24);
      expect(due.getHours()).toBe(23);
      expect(due.getMinutes()).toBe(59);
    });

    it('setter fast ukedag på eller etter minst X dager', () => {
      const due = calculateDueAt('2026-09-22T14:00:00', 7, 0);
      expect(due.getDay()).toBe(0);
      expect(due.getDate()).toBe(4);
      expect(due.getMonth()).toBe(9);
    });
  });

  describe('getSmartTaskSuggestions', () => {
    it('velger oppgaver som passer innen resterende poeng', () => {
      const tasks = [makeTask('a', 3), makeTask('b', 2), makeTask('c', 1)];
      const suggested = getSmartTaskSuggestions(tasks, 5);
      const total = suggested.reduce((s, t) => s + t.points, 0);
      expect(total).toBeLessThanOrEqual(5);
      expect(suggested.length).toBeGreaterThan(0);
    });

    it('foreslår minst én oppgave når ingen kombinasjon passer', () => {
      const tasks = [makeTask('a', 10)];
      expect(getSmartTaskSuggestions(tasks, 2)).toEqual([tasks[0]]);
    });

    it('returnerer tom liste uten poeng eller oppgaver', () => {
      expect(getSmartTaskSuggestions([makeTask('a', 2)], 0)).toEqual([]);
      expect(getSmartTaskSuggestions([], 5)).toEqual([]);
    });
  });

  describe('poengberegning', () => {
    const instances: TaskInstance[] = [
      { ...makeTask('done', 3, 'completed'), completedByMemberId: member.id },
      { ...makeTask('claim', 2, 'claimed'), claimedByMemberId: member.id },
      makeTask('avail', 1, 'available'),
    ];

    it('summerer fullførte poeng for medlem', () => {
      expect(getMemberCompletedPoints(instances, member.id, pointsAsOf)).toBe(3);
    });

    it('summerer reserverte poeng for medlem', () => {
      expect(getMemberClaimedPoints(instances, member.id, pointsAsOf)).toBe(2);
    });

    it('teller ikke poeng fullført før mandag 06:00', () => {
      const oldCompleted = {
        ...makeTask('old', 5, 'completed'),
        completedAt: '2026-09-20T12:00:00',
      };
      expect(getMemberCompletedPoints([oldCompleted], member.id, pointsAsOf)).toBe(0);
    });

    it('beregner fremdrift mot ukemål', () => {
      expect(getMemberPointsProgress(3, 5)).toEqual({
        remainingPoints: 2,
        progressPercent: 60,
      });
      expect(getMemberPointsProgress(6, 5).progressPercent).toBe(100);
    });
  });

  describe('oppgavestatus', () => {
    it('claimTaskInstance setter claimed-felter', () => {
      const claimed = claimTaskInstance(makeTask('t1', 2), member);
      expect(claimed.status).toBe('claimed');
      expect(claimed.claimedByMemberId).toBe(member.id);
    });

    it('unclaimTaskInstance tilbakestiller til available', () => {
      const unclaimed = unclaimTaskInstance(makeTask('t1', 2, 'claimed'));
      expect(unclaimed?.status).toBe('available');
      expect(unclaimed?.claimedByMemberId).toBeUndefined();
    });

    it('unclaimTaskInstance returnerer null for ikke-claimed', () => {
      expect(unclaimTaskInstance(makeTask('t1', 2, 'available'))).toBeNull();
    });

    it('completeTaskInstance markerer fullført', () => {
      const completed = completeTaskInstance(makeTask('t1', 2, 'claimed'), member);
      expect(completed.status).toBe('completed');
      expect(completed.completedByMemberId).toBe(member.id);
    });
  });

  describe('spawnNextTaskInstance', () => {
    it('lager ny instans umiddelbart etter fullføring', () => {
      const next = spawnNextTaskInstance(
        weeklyTemplate,
        '2026-09-22T14:00:00',
        [],
        () => 12345
      );
      expect(next).not.toBeNull();
      expect(next?.status).toBe('available');
      expect(next?.deadlineDate).toContain('2026');
    });

    it('hopper over når pending instans finnes', () => {
      const existing = [makeTask('open', 2, 'available')];
      existing[0].templateId = weeklyTemplate.id;
      expect(spawnNextTaskInstance(weeklyTemplate, '2026-09-22T14:00:00', existing)).toBeNull();
    });

    it('returnerer null for engangsoppgaver', () => {
      const onceTemplate = { ...weeklyTemplate, intervalDays: 0 };
      expect(spawnNextTaskInstance(onceTemplate, '2026-09-22T14:00:00', [])).toBeNull();
    });
  });

  describe('applyRestartTaskPool', () => {
    it('lager én ledig instans per aktiv mal med dager over 0', () => {
      const templates: TaskTemplate[] = [
        weeklyTemplate,
        { ...weeklyTemplate, id: 'tmpl_once', intervalDays: 0 },
        { ...weeklyTemplate, id: 'tmpl_inactive', isActive: false },
      ];
      const restarted = applyRestartTaskPool(templates, '2026-09-22T10:00:00', () => 1);
      expect(restarted).toHaveLength(1);
      expect(restarted[0].templateId).toBe(weeklyTemplate.id);
      expect(restarted[0].status).toBe('available');
    });
  });
});
