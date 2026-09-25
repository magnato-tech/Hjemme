import { describe, expect, it } from 'vitest';
import { TaskInstance, TaskTemplate } from '../types';
import {
  buildNextRecurringInstance,
  claimTaskInstance,
  completeTaskInstance,
  getMemberClaimedPoints,
  getMemberCompletedPoints,
  getMemberPointsProgress,
  getSmartTaskSuggestions,
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
    deadlineDate: 'Søndag 20:00',
    iconName: 'brush',
    isMandatory: false,
    claimedByMemberId: status === 'claimed' ? member.id : undefined,
    claimedByName: status === 'claimed' ? member.name : undefined,
  };
}

const weeklyTemplate: TaskTemplate = {
  id: 'tmpl_koste',
  title: 'Koste opp',
  description: 'Koste gulv',
  area: '2. etasje',
  room: 'Gang',
  points: 2,
  recurrence: 'weekly',
  deadlineDay: 'Søndag 20:00',
  eligibleMemberIds: [],
  isActive: true,
  isMandatory: true,
  iconName: 'brush',
};

describe('taskUtils', () => {
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
      expect(getMemberCompletedPoints(instances, member.id, 39, 2026)).toBe(3);
    });

    it('summerer reserverte poeng for medlem', () => {
      expect(getMemberClaimedPoints(instances, member.id, 39, 2026)).toBe(2);
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

  describe('buildNextRecurringInstance', () => {
    it('lager neste ukes instans for ukentlig mal', () => {
      const completed = {
        ...makeTask('done', 2, 'completed', 39, 2026),
        templateId: weeklyTemplate.id,
      };

      const next = buildNextRecurringInstance(weeklyTemplate, completed, [], () => 12345);
      expect(next).not.toBeNull();
      expect(next?.weekNumber).toBe(40);
      expect(next?.year).toBe(2026);
      expect(next?.status).toBe('available');
    });

    it('hopper over når neste uke allerede finnes', () => {
      const completed = {
        ...makeTask('done', 2, 'completed', 39, 2026),
        templateId: weeklyTemplate.id,
      };
      const existing = [
        makeTask('next', 2, 'available', 40, 2026),
      ];
      existing[0].templateId = weeklyTemplate.id;

      expect(buildNextRecurringInstance(weeklyTemplate, completed, existing)).toBeNull();
    });

    it('returnerer null for engangsoppgaver', () => {
      const onceTemplate = { ...weeklyTemplate, recurrence: 'once' as const };
      const completed = {
        ...makeTask('done', 2, 'completed'),
        templateId: onceTemplate.id,
      };
      expect(buildNextRecurringInstance(onceTemplate, completed, [])).toBeNull();
    });
  });
});
