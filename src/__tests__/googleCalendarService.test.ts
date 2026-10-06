import { describe, expect, it } from 'vitest';
import {
  evaluateCalendarEventCarReservation,
  isLikelyWorkTrip,
} from '../utils/googleCalendarService';

describe('googleCalendarService', () => {
  it('isLikelyWorkTrip gjenkjenner jobbrelaterte stikkord', () => {
    expect(isLikelyWorkTrip('Møte med klient', 'Kristiansand')).toBe(true);
    expect(isLikelyWorkTrip('Fotballtrening', 'Hjemme')).toBe(false);
  });

  it('carMode all sperrer alltid bilen', () => {
    const result = evaluateCalendarEventCarReservation({
      title: 'Hva som helst',
      calendarConfig: { calendarId: 'c1', privacyMode: 'full', carMode: 'all' },
    });
    expect(result.shouldCreateCar).toBe(true);
  });

  it('carMode none sperrer ikke bilen', () => {
    const result = evaluateCalendarEventCarReservation({
      title: 'Jobbmøte Lillesand',
      calendarConfig: { calendarId: 'c1', privacyMode: 'full', carMode: 'none' },
    });
    expect(result.shouldCreateCar).toBe(false);
  });

  it('ingen bilsperre kan likevel sperre en gjentakende aktivitet eller én hendelse', () => {
    const calendarConfig = {
      calendarId: 'c1',
      privacyMode: 'full' as const,
      carMode: 'none' as const,
      activityOverrides: {
        hockey: { activityTitle: 'Idda hockey', blocksCar: true },
        'event:ev-7': { activityTitle: 'Tannlege', blocksCar: true, eventId: 'ev-7' },
      },
    };

    expect(
      evaluateCalendarEventCarReservation({ title: 'Idda hockey', calendarConfig }).shouldCreateCar
    ).toBe(true);
    expect(
      evaluateCalendarEventCarReservation({ title: 'Tannlege', eventId: 'ev-7', calendarConfig }).shouldCreateCar
    ).toBe(true);
    expect(
      evaluateCalendarEventCarReservation({ title: 'Tannlege', eventId: 'ev-8', calendarConfig }).shouldCreateCar
    ).toBe(false);
    expect(
      evaluateCalendarEventCarReservation({ title: 'Fotballtrening', calendarConfig }).shouldCreateCar
    ).toBe(false);
  });

  it('aktivitetsoverstyring har høyest prioritet', () => {
    const result = evaluateCalendarEventCarReservation({
      title: 'Idda Hockey',
      calendarConfig: {
        calendarId: 'c1',
        privacyMode: 'full',
        carMode: 'all',
        activityOverrides: {
          hockey: {
            activityTitle: 'Idda Hockey',
            blocksCar: false,
          },
        },
      },
    });
    expect(result.shouldCreateCar).toBe(false);
    expect(result.matchedRule).toContain('Idda Hockey');
  });

  it('exclude_keywords blokkerer matchende titler', () => {
    const result = evaluateCalendarEventCarReservation({
      title: 'Bønnemøte',
      calendarConfig: {
        calendarId: 'c1',
        privacyMode: 'full',
        carMode: 'exclude_keywords',
        excludedKeywords: ['bønn'],
      },
    });
    expect(result.shouldCreateCar).toBe(false);
  });

  it('work_only bruker stikkord når carMode ikke er satt eksplisitt', () => {
    const result = evaluateCalendarEventCarReservation({
      title: 'Samtale i Lillesand',
      defaultCarMode: 'work_only',
      isCarCalendarFallback: true,
    });
    expect(result.shouldCreateCar).toBe(true);
  });
});
