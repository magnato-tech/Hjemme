import { describe, expect, it } from 'vitest';
import {
  getDisplayEventDescription,
  getDisplayEventLocation,
  getDisplayEventTitle,
  isBusyOnlyEvent,
} from '../utils/calendarEventDisplay';
import { makeTimedEvent } from './fixtures/calendarFixtures';

describe('calendarEventDisplay', () => {
  const busyEvent = {
    ...makeTimedEvent('e1', 'cal_job', '2026-09-25T10:00:00', '2026-09-25T11:00:00', 'Samtale'),
    isConfidential: true,
    location: 'Lillesand',
    description: 'Hemmelig notat',
  };

  it('viser Opptatt og skjuler sted og beskrivelse for kun-opptatt', () => {
    expect(isBusyOnlyEvent(busyEvent)).toBe(true);
    expect(getDisplayEventTitle(busyEvent)).toBe('Opptatt');
    expect(getDisplayEventLocation(busyEvent)).toBeUndefined();
    expect(getDisplayEventDescription(busyEvent)).toBeUndefined();
  });

  it('viser fulle detaljer for vanlige hendelser', () => {
    const event = makeTimedEvent('e2', 'cal_job', '2026-09-25T12:00:00', '2026-09-25T13:00:00', 'Møte');
    event.location = 'Kontor';
    event.description = 'Agenda';

    expect(getDisplayEventTitle(event)).toBe('Møte');
    expect(getDisplayEventLocation(event)).toBe('Kontor');
    expect(getDisplayEventDescription(event)).toBe('Agenda');
  });

  it('støtter busy_only via kalenderconfig', () => {
    const event = makeTimedEvent('e3', 'cal_job', '2026-09-25T14:00:00', '2026-09-25T15:00:00', 'Tittel');
    expect(
      isBusyOnlyEvent(event, {
        calendarId: 'cal_job',
        privacyMode: 'busy_only',
        carMode: 'all',
      })
    ).toBe(true);
  });
});
