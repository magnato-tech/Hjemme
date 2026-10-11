import { describe, expect, it } from 'vitest';
import { mergeCalendarsList, FAKE_SAMPLE_CALENDAR_IDS } from '../context/FamilyContext';
import { GoogleCalendarItem } from '../types';

describe('Kalenderlagring og isolasjon av mock-data', () => {
  it('brukerens egne tilpassede kalendere filtreres ALDRI bort, selv med disableMockData: true', () => {
    const customUserCalendar: GoogleCalendarItem = {
      id: 'c_min_egne_jobbkalender@group.calendar.google.com',
      summary: 'Magnars Ekte Jobb',
      customName: 'Magnars Ekte Jobb',
      isCustom: true,
      enabledForDisplay: true,
      backgroundColor: '#0284c7',
    };

    const result = mergeCalendarsList(
      [],
      [customUserCalendar],
      undefined,
      true // disableMockData = true
    );

    expect(result.some((c) => c.id === customUserCalendar.id)).toBe(true);
    expect(result.find((c) => c.id === customUserCalendar.id)?.summary).toBe('Magnars Ekte Jobb');
  });

  it('brukerens primærkalender med id "primary" bevares når den er konfigurert eller lagret', () => {
    const primaryCal: GoogleCalendarItem = {
      id: 'primary',
      summary: 'Magnar Totland (Primær)',
      customName: 'Magnar Totland (Primær)',
      primary: true,
      enabledForDisplay: true,
    };

    const result = mergeCalendarsList(
      [],
      [primaryCal],
      {
        calendarId: 'primary',
        calendarName: 'Magnar Totland (Primær)',
        autoReserveCar: true,
        filterMode: 'all',
      },
      true // disableMockData = true
    );

    expect(result.some((c) => c.id === 'primary')).toBe(true);
  });

  it('kun hardkodede demokalendere filtreres ut når disableMockData er true', () => {
    const demoCal: GoogleCalendarItem = {
      id: 'c_jobb_totland@group.calendar.google.com',
      summary: 'Jobb, Møter & Oppdrag (Magnar)',
      isCustom: false,
      isMock: true,
    };

    const result = mergeCalendarsList(
      [demoCal],
      [],
      undefined,
      true // disableMockData = true
    );

    expect(result.some((c) => c.id === demoCal.id)).toBe(false);
  });

  it('FAKE_SAMPLE_CALENDAR_IDS inneholder IKKE "primary" slik at ekte Google-kontoer ikke ødelegges', () => {
    expect(FAKE_SAMPLE_CALENDAR_IDS.has('primary')).toBe(false);
  });
});
