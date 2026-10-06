import { describe, expect, it } from 'vitest';
import { isAllowedIcalUrl, isIcalAddress, normalizeIcalUrl, parseIcalEvents } from '../utils/icalFeed';

const window = {
  from: new Date(2026, 9, 1),
  to: new Date(2026, 10, 30, 23, 59, 59),
};

describe('icalFeed', () => {
  it('gjenkjenner iCal-adresser, også webcal', () => {
    expect(isIcalAddress('https://calendar.google.com/calendar/ical/familie%40gmail.com/private-abc/basic.ics')).toBe(true);
    expect(normalizeIcalUrl('webcal://calendar.google.com/calendar/ical/a/public/basic.ics')).toBe(
      'https://calendar.google.com/calendar/ical/a/public/basic.ics'
    );
    expect(isAllowedIcalUrl('https://calendar.google.com/calendar/ical/a/private-x/basic.ics')).toBe(true);
    expect(isAllowedIcalUrl('http://calendar.google.com/basic.ics')).toBe(false);
    expect(isAllowedIcalUrl('https://127.0.0.1/secret.ics')).toBe(false);
    expect(isIcalAddress('familie@gmail.com')).toBe(false);
  });

  it('leser enkelthendelser, heldag og linjebrudd', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:fotball@test',
      'SUMMARY:Fotball som',
      '  fortsetter',
      'DTSTART:20261007T180000',
      'DTEND:20261007T190000',
      'LOCATION:Lillesand',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:bursdag@test',
      'SUMMARY:Bursdag',
      'DTSTART;VALUE=DATE:20261010',
      'DTEND;VALUE=DATE:20261011',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const events = parseIcalEvents(ics, window);
    const fotball = events.find((event) => event.summary === 'Fotball som fortsetter');
    expect(fotball?.location).toBe('Lillesand');
    expect(fotball?.start?.dateTime).toBe('2026-10-07T18:00:00');
    expect(fotball?.end?.dateTime).toBe('2026-10-07T19:00:00');

    const birthday = events.find((event) => event.summary === 'Bursdag');
    expect(birthday?.start?.date).toBe('2026-10-10');
    expect(birthday?.end?.date).toBe('2026-10-11');
  });

  it('folder ukentlige hendelser innenfor perioden', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:hockey@test',
      'SUMMARY:Hockey',
      'DTSTART:20261006T160000',
      'DTEND:20261006T170000',
      'RRULE:FREQ=WEEKLY;COUNT=3',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const events = parseIcalEvents(ics, window).filter((event) => event.summary === 'Hockey');
    expect(events.map((event) => event.start?.dateTime)).toEqual([
      '2026-10-06T16:00:00',
      '2026-10-13T16:00:00',
      '2026-10-20T16:00:00',
    ]);
  });

  it('hopper over avlyste hendelser', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:avlyst@test',
      'SUMMARY:Avlyst',
      'STATUS:CANCELLED',
      'DTSTART:20261008T100000',
      'DTEND:20261008T110000',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    expect(parseIcalEvents(ics, window)).toHaveLength(0);
  });
});
