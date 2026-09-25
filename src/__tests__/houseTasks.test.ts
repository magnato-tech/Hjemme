import { describe, expect, it } from 'vitest';
import {
  applyClaimSuggestedTasks,
  applyClaimTask,
  applyCompleteTask,
  applyRestartTaskPool,
  applyUnclaimTask,
  calculateDueAt,
  getAvailableTasksForMember,
  getMemberClaimedPoints,
  getMemberClaimedTaskInstances,
  getMemberCompletedPoints,
  getMemberCompletedTaskInstances,
  getMemberPointsProgress,
  getSmartTaskSuggestions,
  isMemberEligibleForTemplate,
  filterTasksByArea,
} from '../utils/taskUtils';
import {
  createHouseWeekInstances,
  createTemplateInstance,
  houseTaskTemplates,
  magnar,
  marcus,
  synelle,
} from './fixtures/taskFixtures';

const pointsAsOf = new Date(2026, 8, 25, 14, 0, 0);

describe('husoppgaver – brukerflyt', () => {
  const templates = houseTaskTemplates;

  describe('ta og frigjøre oppgaver', () => {
    it('Marcus tar ledig oppgave i 1. etasje', () => {
      const instances = createHouseWeekInstances();
      const afterClaim = applyClaimTask(instances, 'inst_koste_nede_avail', marcus, '2026-09-25T10:00:00Z');

      const claimed = afterClaim.find((t) => t.id === 'inst_koste_nede_avail');
      expect(claimed?.status).toBe('claimed');
      expect(claimed?.claimedByMemberId).toBe(marcus.id);
      expect(claimed?.area).toBe('1. etasje');
      expect(getMemberClaimedTaskInstances(afterClaim, marcus.id)).toHaveLength(1);
    });

    it('Marcus frigjør en reservert oppgave', () => {
      let instances = applyClaimTask(
        createHouseWeekInstances(),
        'inst_tomme_oppvask_avail',
        marcus,
        '2026-09-25T10:00:00Z'
      );
      instances = applyUnclaimTask(instances, 'inst_tomme_oppvask_avail');

      const task = instances.find((t) => t.id === 'inst_tomme_oppvask_avail');
      expect(task?.status).toBe('available');
      expect(getMemberClaimedTaskInstances(instances, marcus.id)).toHaveLength(0);
    });
  });

  describe('fullføre oppgaver og poeng', () => {
    it('Marcus fullfører oppgave og får poeng', () => {
      const instances = createHouseWeekInstances();
      const beforePoints = getMemberCompletedPoints(instances, marcus.id, pointsAsOf);
      expect(beforePoints).toBe(7);

      let updated = applyClaimTask(instances, 'inst_koste_nede_avail', marcus);
      updated = applyCompleteTask(updated, 'inst_koste_nede_avail', marcus, templates, '2026-09-25T12:00:00Z');

      const afterPoints = getMemberCompletedPoints(updated, marcus.id, pointsAsOf);
      expect(afterPoints).toBe(9);
    });

    it('Marcus når ukemål med siste oppgave', () => {
      let instances = createHouseWeekInstances();
      instances = applyCompleteTask(instances, 'inst_koste_nede_avail', marcus, templates);
      instances = applyCompleteTask(instances, 'inst_tomme_oppvask_avail', marcus, templates);

      const completed = getMemberCompletedPoints(instances, marcus.id, pointsAsOf);
      const { remainingPoints, progressPercent } = getMemberPointsProgress(completed, marcus.weeklyPointsGoal);

      expect(completed).toBe(10);
      expect(remainingPoints).toBe(0);
      expect(progressPercent).toBe(100);
    });
  });

  describe('smart forslag og bulk-ta oppgaver', () => {
    it('foreslår oppgaver som fyller Marcus sine manglende poeng', () => {
      const instances = createHouseWeekInstances();
      const completed = getMemberCompletedPoints(instances, marcus.id, pointsAsOf);
      const { remainingPoints } = getMemberPointsProgress(completed, marcus.weeklyPointsGoal);
      const available = instances.filter((t) => t.status === 'available');
      const suggested = getSmartTaskSuggestions(available, remainingPoints);

      expect(suggested.length).toBeGreaterThan(0);
      expect(suggested.reduce((s, t) => s + t.points, 0)).toBeLessThanOrEqual(remainingPoints);
    });

    it('Marcus tar alle foreslåtte oppgaver med ett klikk', () => {
      const instances = createHouseWeekInstances();
      const completed = getMemberCompletedPoints(instances, marcus.id, pointsAsOf);
      const { remainingPoints } = getMemberPointsProgress(completed, marcus.weeklyPointsGoal);
      const available = instances.filter((t) => t.status === 'available');
      const suggested = getSmartTaskSuggestions(available, remainingPoints);

      const after = applyClaimSuggestedTasks(
        instances,
        suggested.map((t) => t.id),
        marcus
      );

      expect(getMemberClaimedTaskInstances(after, marcus.id)).toHaveLength(suggested.length);
    });
  });

  describe('flere brukere i huset', () => {
    it('Synelle og Marcus kan ha egne reserverte oppgaver samtidig', () => {
      let instances = applyClaimTask(createHouseWeekInstances(), 'inst_koste_nede_avail', marcus);
      instances = applyClaimTask(instances, 'inst_vaske_bad_avail', synelle);

      expect(getMemberClaimedTaskInstances(instances, marcus.id)).toHaveLength(1);
      expect(getMemberClaimedTaskInstances(instances, synelle.id)).toHaveLength(1);
    });

    it('poeng telles separat per familiemedlem', () => {
      let instances = createHouseWeekInstances();
      instances = applyCompleteTask(instances, 'inst_koste_nede_avail', synelle, templates);
      instances = applyCompleteTask(instances, 'inst_tomme_oppvask_avail', magnar, templates);

      expect(getMemberCompletedPoints(instances, marcus.id, pointsAsOf)).toBe(7);
      expect(getMemberCompletedPoints(instances, synelle.id, pointsAsOf)).toBe(2);
      expect(getMemberCompletedPoints(instances, magnar.id, pointsAsOf)).toBe(1);
    });
  });

  describe('oppgaver per område i huset', () => {
    it('filtrerer ledige oppgaver i 1. etasje', () => {
      const available = createHouseWeekInstances().filter((t) => t.status === 'available');
      const firstFloor = filterTasksByArea(available, '1. etasje');
      expect(firstFloor.map((t) => t.title)).toEqual(['Koste nede', 'Tømme oppvaskmaskin']);
    });

    it('Marcus ser ikke handleoppgaven, men Synelle gjør', () => {
      const instances = createHouseWeekInstances();
      const marcusAvailable = getAvailableTasksForMember(instances, templates, marcus.id);
      const synelleAvailable = getAvailableTasksForMember(instances, templates, synelle.id);

      expect(marcusAvailable.some((t) => t.title === 'Handle matvarer')).toBe(false);
      expect(synelleAvailable.some((t) => t.title === 'Handle matvarer')).toBe(true);
    });
  });

  describe('frist etter antall dager', () => {
    it('fullføring lager barn umiddelbart med ny frist', () => {
      const instances = createHouseWeekInstances();
      const after = applyCompleteTask(
        instances,
        'inst_koste_nede_avail',
        marcus,
        templates,
        '2026-09-22T14:00:00'
      );

      const spawned = after.find(
        (t) => t.templateId === 'tmpl_koste_nede' && t.status === 'available' && t.id !== 'inst_koste_nede_avail'
      );
      expect(spawned).toBeDefined();
      const due = new Date(spawned!.deadlineDate);
      expect(due.getDay()).toBe(0);
    });

    it('engangsoppgave genererer ikke ny instans', () => {
      const onceTemplate = templates.find((t) => t.id === 'tmpl_engangs')!;
      const onceInstance = createTemplateInstance(onceTemplate);
      const after = applyCompleteTask([onceInstance], onceInstance.id, marcus, templates);
      expect(after).toHaveLength(1);
      expect(after[0].status).toBe('completed');
    });

    it('restart lager én instans per aktiv mal', () => {
      const restarted = applyRestartTaskPool(templates, '2026-09-22T10:00:00', () => 99);
      expect(restarted.length).toBe(4);
      expect(restarted.every((t) => t.status === 'available')).toBe(true);
    });
  });

  describe('fullført historikk', () => {
    it('viser Marcus sine fullførte oppgaver denne uken', () => {
      const history = getMemberCompletedTaskInstances(createHouseWeekInstances(), marcus.id, pointsAsOf);
      expect(history).toHaveLength(3);
    });
  });
});
