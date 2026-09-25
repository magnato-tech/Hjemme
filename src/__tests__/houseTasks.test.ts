import { describe, expect, it } from 'vitest';
import {
  applyClaimSuggestedTasks,
  applyClaimTask,
  applyCompleteTask,
  applyUnclaimTask,
  filterInstancesForWeek,
  filterTasksByArea,
  getAvailableTasksForMember,
  getMemberClaimedPoints,
  getMemberClaimedTaskInstances,
  getMemberCompletedPoints,
  getMemberCompletedTaskInstances,
  getMemberPointsProgress,
  getSmartTaskSuggestions,
  isMemberEligibleForTemplate,
} from '../utils/taskUtils';
import {
  createHouseWeekInstances,
  houseTaskTemplates,
  magnar,
  marcus,
  synelle,
  TEST_WEEK,
  TEST_YEAR,
} from './fixtures/taskFixtures';

describe('husoppgaver – brukerflyt', () => {
  const templates = houseTaskTemplates;

  describe('ta og frigjøre oppgaver', () => {
    it('Marcus tar ledig oppgave i 1. etasje', () => {
      const instances = createHouseWeekInstances();
      const afterClaim = applyClaimTask(instances, 'inst_koste_nede_avail', marcus, '2026-09-25T10:00:00Z');

      const claimed = afterClaim.find((t) => t.id === 'inst_koste_nede_avail');
      expect(claimed?.status).toBe('claimed');
      expect(claimed?.claimedByMemberId).toBe(marcus.id);
      expect(claimed?.claimedByName).toBe('Marcus');
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
      expect(task?.claimedByMemberId).toBeUndefined();
      expect(getMemberClaimedTaskInstances(instances, marcus.id)).toHaveLength(0);
    });

    it('unclaim endrer ikke oppgaver som ikke er claimed', () => {
      const instances = createHouseWeekInstances();
      const after = applyUnclaimTask(instances, 'inst_koste_nede_avail');
      expect(after.find((t) => t.id === 'inst_koste_nede_avail')?.status).toBe('available');
    });
  });

  describe('fullføre oppgaver og poeng', () => {
    it('Marcus fullfører oppgave og får poeng', () => {
      const weekInstances = filterInstancesForWeek(createHouseWeekInstances(), TEST_WEEK, TEST_YEAR);
      const beforePoints = getMemberCompletedPoints(weekInstances, marcus.id, TEST_WEEK, TEST_YEAR);
      expect(beforePoints).toBe(7);

      let instances = applyClaimTask(weekInstances, 'inst_koste_nede_avail', marcus);
      instances = applyCompleteTask(instances, 'inst_koste_nede_avail', marcus, templates, '2026-09-25T12:00:00Z');

      const afterPoints = getMemberCompletedPoints(instances, marcus.id, TEST_WEEK, TEST_YEAR);
      expect(afterPoints).toBe(9);

      const completed = instances.find((t) => t.id === 'inst_koste_nede_avail');
      expect(completed?.status).toBe('completed');
      expect(completed?.completedByMemberId).toBe(marcus.id);
    });

    it('Marcus kan fullføre direkte uten å ha tatt oppgaven først', () => {
      const instances = applyCompleteTask(
        createHouseWeekInstances(),
        'inst_tomme_oppvask_avail',
        marcus,
        templates,
        '2026-09-25T12:00:00Z'
      );

      const task = instances.find((t) => t.id === 'inst_tomme_oppvask_avail');
      expect(task?.status).toBe('completed');
      expect(task?.completedByMemberId).toBe(marcus.id);
      expect(task?.claimedByMemberId).toBe(marcus.id);
    });

    it('Marcus når ukemål med siste oppgave', () => {
      let instances = createHouseWeekInstances();
      instances = applyCompleteTask(instances, 'inst_koste_nede_avail', marcus, templates);
      instances = applyCompleteTask(instances, 'inst_tomme_oppvask_avail', marcus, templates);

      const completed = getMemberCompletedPoints(instances, marcus.id, TEST_WEEK, TEST_YEAR);
      const { remainingPoints, progressPercent } = getMemberPointsProgress(completed, marcus.weeklyPointsGoal);

      expect(completed).toBe(10);
      expect(remainingPoints).toBe(0);
      expect(progressPercent).toBe(100);
    });
  });

  describe('smart forslag og bulk-ta oppgaver', () => {
    it('foreslår oppgaver som fyller Marcus sine manglende poeng', () => {
      const weekInstances = filterInstancesForWeek(createHouseWeekInstances(), TEST_WEEK, TEST_YEAR);
      const completed = getMemberCompletedPoints(weekInstances, marcus.id, TEST_WEEK, TEST_YEAR);
      const { remainingPoints } = getMemberPointsProgress(completed, marcus.weeklyPointsGoal);
      expect(remainingPoints).toBe(3);

      const available = weekInstances.filter((t) => t.status === 'available');
      const suggested = getSmartTaskSuggestions(available, remainingPoints);
      const total = suggested.reduce((sum, t) => sum + t.points, 0);

      expect(suggested.length).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(remainingPoints);
    });

    it('Marcus tar alle foreslåtte oppgaver med ett klikk', () => {
      const weekInstances = filterInstancesForWeek(createHouseWeekInstances(), TEST_WEEK, TEST_YEAR);
      const completed = getMemberCompletedPoints(weekInstances, marcus.id, TEST_WEEK, TEST_YEAR);
      const { remainingPoints } = getMemberPointsProgress(completed, marcus.weeklyPointsGoal);
      const available = weekInstances.filter((t) => t.status === 'available');
      const suggested = getSmartTaskSuggestions(available, remainingPoints);

      const after = applyClaimSuggestedTasks(
        weekInstances,
        suggested.map((t) => t.id),
        marcus,
        '2026-09-25T11:00:00Z'
      );

      const claimed = getMemberClaimedTaskInstances(after, marcus.id);
      expect(claimed).toHaveLength(suggested.length);
      expect(claimed.every((t) => t.claimedByMemberId === marcus.id)).toBe(true);
      expect(getMemberClaimedPoints(after, marcus.id, TEST_WEEK, TEST_YEAR)).toBeGreaterThan(0);
    });

    it('claimSuggestedTasks hopper over allerede tatt eller fullført', () => {
      let instances = applyClaimTask(createHouseWeekInstances(), 'inst_vaske_bad_avail', synelle);
      const after = applyClaimSuggestedTasks(
        instances,
        ['inst_vaske_bad_avail', 'inst_koste_nede_avail', 'inst_soppel_done'],
        marcus
      );

      expect(after.find((t) => t.id === 'inst_vaske_bad_avail')?.claimedByMemberId).toBe(synelle.id);
      expect(after.find((t) => t.id === 'inst_koste_nede_avail')?.claimedByMemberId).toBe(marcus.id);
      expect(after.find((t) => t.id === 'inst_soppel_done')?.status).toBe('completed');
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

      expect(getMemberCompletedPoints(instances, marcus.id, TEST_WEEK, TEST_YEAR)).toBe(7);
      expect(getMemberCompletedPoints(instances, synelle.id, TEST_WEEK, TEST_YEAR)).toBe(2);
      expect(getMemberCompletedPoints(instances, magnar.id, TEST_WEEK, TEST_YEAR)).toBe(1);
    });

    it('fullførte oppgaver vises i medlemmets historikk denne uken', () => {
      const instances = createHouseWeekInstances();
      const marcusHistory = getMemberCompletedTaskInstances(instances, marcus.id);
      expect(marcusHistory).toHaveLength(3);
      expect(marcusHistory.every((t) => t.status === 'completed')).toBe(true);
    });
  });

  describe('oppgaver per område i huset', () => {
    it('filtrerer ledige oppgaver i 1. etasje', () => {
      const weekInstances = filterInstancesForWeek(createHouseWeekInstances(), TEST_WEEK, TEST_YEAR);
      const available = weekInstances.filter((t) => t.status === 'available');
      const firstFloor = filterTasksByArea(available, '1. etasje');

      expect(firstFloor.map((t) => t.title)).toEqual(['Koste nede', 'Tømme oppvaskmaskin']);
    });

    it('Marcus ser ikke handleoppgaven, men Synelle gjør', () => {
      const weekInstances = filterInstancesForWeek(createHouseWeekInstances(), TEST_WEEK, TEST_YEAR);
      const marcusAvailable = getAvailableTasksForMember(weekInstances, templates, marcus.id);
      const synelleAvailable = getAvailableTasksForMember(weekInstances, templates, synelle.id);

      expect(marcusAvailable.some((t) => t.title === 'Handle matvarer')).toBe(false);
      expect(synelleAvailable.some((t) => t.title === 'Handle matvarer')).toBe(true);
    });

    it('tom eligibleMemberIds betyr alle kan ta oppgaven', () => {
      const onceTemplate = templates.find((t) => t.id === 'tmpl_engangs');
      expect(isMemberEligibleForTemplate(onceTemplate, marcus.id)).toBe(true);
      expect(isMemberEligibleForTemplate(onceTemplate, synelle.id)).toBe(true);
    });
  });

  describe('gjentakende husoppgaver', () => {
    it('ukentlig oppgave genererer neste ukes instans ved fullføring', () => {
      const instances = applyCompleteTask(
        createHouseWeekInstances(),
        'inst_koste_nede_avail',
        marcus,
        templates,
        '2026-09-25T12:00:00Z',
        () => 99999
      );

      const nextWeek = instances.find(
        (t) => t.templateId === 'tmpl_koste_nede' && t.weekNumber === TEST_WEEK + 1
      );
      expect(nextWeek).toBeDefined();
      expect(nextWeek?.status).toBe('available');
      expect(nextWeek?.year).toBe(TEST_YEAR);
    });

    it('engangsoppgave genererer ikke ny instans', () => {
      const onceTemplate = templates.find((t) => t.id === 'tmpl_engangs')!;
      const onceInstance = {
        id: 'inst_garasje_once',
        templateId: onceTemplate.id,
        title: onceTemplate.title,
        description: onceTemplate.description,
        area: onceTemplate.area,
        room: onceTemplate.room,
        points: onceTemplate.points,
        weekNumber: TEST_WEEK,
        year: TEST_YEAR,
        status: 'available' as const,
        deadlineDate: onceTemplate.deadlineDay,
        iconName: onceTemplate.iconName,
        isMandatory: onceTemplate.isMandatory,
      };

      const after = applyCompleteTask([onceInstance], 'inst_garasje_once', marcus, templates);
      expect(after).toHaveLength(1);
      expect(after[0].status).toBe('completed');
    });
  });
});
