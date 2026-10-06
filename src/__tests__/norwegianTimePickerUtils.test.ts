import { describe, expect, it } from 'vitest';
import {
  clampPickerTime,
  isDatetimeLocalWithinRange,
  isPickerHourAllowed,
  isPickerMinuteSelected,
  isPickerTimeAllowed,
  PICKER_MINUTES,
  resolveTimePickerPlacement,
  snapMinuteToQuarter,
} from '../utils/norwegianTimePickerUtils';

describe('norwegianTimePickerUtils', () => {
  it('PICKER_MINUTES er 00, 15, 30 og 45', () => {
    expect(PICKER_MINUTES).toEqual([0, 15, 30, 45]);
  });

  it('snapMinuteToQuarter runder til nærmeste kvarter', () => {
    expect(snapMinuteToQuarter(0)).toBe(0);
    expect(snapMinuteToQuarter(7)).toBe(0);
    expect(snapMinuteToQuarter(8)).toBe(15);
    expect(snapMinuteToQuarter(55)).toBe(45);
    expect(snapMinuteToQuarter(52)).toBe(45);
  });

  it('isPickerMinuteSelected markerer eksakt og snappet minutt', () => {
    expect(isPickerMinuteSelected(30, 30)).toBe(true);
    expect(isPickerMinuteSelected(55, 45)).toBe(true);
    expect(isPickerMinuteSelected(55, 30)).toBe(false);
  });

  it('isPickerTimeAllowed respekterer min og max på samme dag', () => {
    expect(isPickerTimeAllowed(20, 55, '20:55', undefined)).toBe(true);
    expect(isPickerTimeAllowed(20, 30, '20:55', undefined)).toBe(false);
    expect(isPickerTimeAllowed(23, 45, undefined, '22:00')).toBe(false);
  });

  it('isPickerHourAllowed sjekker om minst ett kvarter er lov', () => {
    expect(isPickerHourAllowed(20, '20:15', undefined)).toBe(true);
    expect(isPickerHourAllowed(20, '20:55', undefined)).toBe(false);
    expect(isPickerHourAllowed(19, '20:15', undefined)).toBe(false);
  });

  it('clampPickerTime justerer til min eller max', () => {
    expect(clampPickerTime(20, 30, '20:55', undefined)).toEqual({ h: 20, m: 55 });
    expect(clampPickerTime(23, 45, undefined, '22:00')).toEqual({ h: 22, m: 0 });
  });

  it('isDatetimeLocalWithinRange sammenligner datetime-local strenger', () => {
    expect(
      isDatetimeLocalWithinRange('2026-10-06T21:00', '2026-10-06T20:55', undefined)
    ).toBe(true);
    expect(
      isDatetimeLocalWithinRange('2026-10-06T20:00', '2026-10-06T20:55', undefined)
    ).toBe(false);
  });

  it('resolveTimePickerPlacement velger over eller under', () => {
    expect(resolveTimePickerPlacement(300)).toBe('below');
    expect(resolveTimePickerPlacement(100)).toBe('above');
  });
});
