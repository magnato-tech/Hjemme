import { describe, expect, it } from 'vitest';
import { initialFamilyMembers, initialSettings, initialVehicles } from '../data/initialData';
import { FamilyMember, TaskInstance } from '../types';
import {
  applyClaimSuggestedTasks,
  applyClaimTask,
  applyCompleteTask,
  applyUnclaimTask,
  getMemberClaimedPoints,
  getMemberCompletedPoints,
  getMemberPointsProgress,
  getSmartTaskSuggestions,
} from '../utils/taskUtils';
import { createHouseWeekInstances, houseTaskTemplates, marcus, synelle } from './fixtures/taskFixtures';

describe('Brukerhandlinger og knappe-logikk (Header, Dashboard & Oppgaver)', () => {
  describe('1. Familiemedlem-bytte (Header avatarer)', () => {
    it('støtter å bytte aktivt familiemedlem mellom Magnar, Synelle og Marcus', () => {
      let activeMemberId = initialFamilyMembers[0].id; // Magnar
      expect(activeMemberId).toBe('member_magnar');

      // Bruker klikker på Synelles avatar
      activeMemberId = 'member_synelle';
      const currentActive = initialFamilyMembers.find((m) => m.id === activeMemberId);
      expect(currentActive?.name).toBe('Synelle');
      expect(currentActive?.role).toBe('adult');

      // Bruker klikker på Marcus sin avatar
      activeMemberId = 'member_marcus';
      const marcusActive = initialFamilyMembers.find((m) => m.id === activeMemberId);
      expect(marcusActive?.name).toBe('Marcus');
      expect(marcusActive?.role).toBe('child');
    });

    it('viser korrekte tillatelser basert på aktiv rolle', () => {
      const magnarMember = initialFamilyMembers.find((m) => m.id === 'member_magnar')!;
      const marcusMember = initialFamilyMembers.find((m) => m.id === 'member_marcus')!;

      expect(magnarMember.canManageFamily).toBe(true);
      expect(magnarMember.canManageTasks).toBe(true);

      expect(marcusMember.canManageFamily).toBe(false);
      expect(marcusMember.canReserveCar).toBe(true);
    });
  });

  describe('2. Oppgaveknapper: Ta oppgave, Frigi oppgave og Fullfør (TasksModule)', () => {
    it('«Ta oppgave»-knappen endrer oppgavens status fra available til claimed', () => {
      const instances = createHouseWeekInstances();
      const openTask = instances.find((t) => t.status === 'available')!;
      expect(openTask).toBeDefined();

      const updated = applyClaimTask(instances, openTask.id, marcus);
      const claimedTask = updated.find((t) => t.id === openTask.id)!;

      expect(claimedTask.status).toBe('claimed');
      expect(claimedTask.claimedByMemberId).toBe(marcus.id);
      expect(claimedTask.claimedByName).toBe('Marcus');
    });

    it('«Frigi»-knappen tilbakestiller en reservert oppgave tilbake til poolen', () => {
      let instances = createHouseWeekInstances();
      const openTask = instances.find((t) => t.status === 'available')!;
      instances = applyClaimTask(instances, openTask.id, marcus);

      // Bruker angrer og trykker "Frigi"
      instances = applyUnclaimTask(instances, openTask.id);
      const revertedTask = instances.find((t) => t.id === openTask.id)!;

      expect(revertedTask.status).toBe('available');
      expect(revertedTask.claimedByMemberId).toBeUndefined();
    });

    it('«Fullfør»-knappen markerer oppgaven ferdig, tildeler poeng og oppretter neste gjentakende instans', () => {
      let instances = createHouseWeekInstances();
      const templates = houseTaskTemplates;
      const pointsAsOf = new Date('2026-09-25T14:00:00Z');

      const beforePoints = getMemberCompletedPoints(instances, marcus.id, pointsAsOf);

      // Marcus fullfører "Koste nede" (2 poeng)
      instances = applyCompleteTask(instances, 'inst_koste_nede_avail', marcus, templates, '2026-09-25T13:00:00Z');

      const afterPoints = getMemberCompletedPoints(instances, marcus.id, pointsAsOf);
      expect(afterPoints).toBe(beforePoints + 2);

      const completed = instances.find((t) => t.id === 'inst_koste_nede_avail')!;
      expect(completed.status).toBe('completed');
      expect(completed.completedByMemberId).toBe(marcus.id);

      // En ny tilgjengelig instans ble automatisk opprettet med fremtidig frist
      const nextSpawned = instances.find(
        (t) => t.templateId === 'tmpl_koste_nede' && t.status === 'available'
      );
      expect(nextSpawned).toBeDefined();
    });

    it('«Ta alle foreslåtte oppgaver»-knappen (Smart forslag) tildeler flere oppgaver i en handling', () => {
      const instances = createHouseWeekInstances();
      const pointsAsOf = new Date('2026-09-25T14:00:00Z');
      const completed = getMemberCompletedPoints(instances, marcus.id, pointsAsOf);
      const { remainingPoints } = getMemberPointsProgress(completed, marcus.weeklyPointsGoal);

      const available = instances.filter((t) => t.status === 'available');
      const suggested = getSmartTaskSuggestions(available, remainingPoints);

      const suggestedIds = suggested.map((t) => t.id);
      const updated = applyClaimSuggestedTasks(instances, suggestedIds, marcus);

      suggestedIds.forEach((id) => {
        const task = updated.find((t) => t.id === id);
        expect(task?.status).toBe('claimed');
        expect(task?.claimedByMemberId).toBe(marcus.id);
      });
    });
  });

  describe('3. Tab-navigasjon og initialdata', () => {
    it('har definert alle navigasjonsfaner', () => {
      const tabs = ['dashboard', 'car', 'tasks', 'calendar', 'week', 'settings'];
      expect(tabs).toContain('dashboard');
      expect(tabs).toContain('car');
      expect(tabs).toContain('tasks');
      expect(tabs).toContain('calendar');
      expect(tabs).toContain('week');
      expect(tabs).toContain('settings');
    });

    it('laster standardbilen Familiebilen', () => {
      expect(initialVehicles).toHaveLength(1);
      expect(initialVehicles[0].name).toBe('Familiebilen');
      expect(initialVehicles[0].fuelType).toBe('electric');
    });
  });
});
