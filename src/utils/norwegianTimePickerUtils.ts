/** 24-hour time picker helpers used by NorwegianDateTimeInput. */

export const PICKER_MINUTES = [0, 15, 30, 45] as const;

export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export function isDatetimeLocalWithinRange(
  built: string,
  min?: string,
  max?: string
): boolean {
  if (min && built < min) return false;
  if (max && built > max) return false;
  return true;
}

export function isPickerTimeAllowed(
  h: number,
  m: number,
  minTime?: string,
  maxTime?: string
): boolean {
  const t = `${pad2(h)}:${pad2(m)}`;
  if (minTime && t < minTime) return false;
  if (maxTime && t > maxTime) return false;
  return true;
}

export function snapMinuteToQuarter(m: number): number {
  return PICKER_MINUTES.reduce((best, quarter) =>
    Math.abs(quarter - m) < Math.abs(best - m) ? quarter : best
  );
}

export function isPickerMinuteSelected(currentMinute: number, quarter: number): boolean {
  if (currentMinute === quarter) return true;
  return (
    !PICKER_MINUTES.includes(currentMinute as (typeof PICKER_MINUTES)[number]) &&
    quarter === snapMinuteToQuarter(currentMinute)
  );
}

export function isPickerHourAllowed(
  h: number,
  minTime?: string,
  maxTime?: string
): boolean {
  return PICKER_MINUTES.some((m) => isPickerTimeAllowed(h, m, minTime, maxTime));
}

export function clampPickerTime(
  h: number,
  m: number,
  minTime?: string,
  maxTime?: string
): { h: number; m: number } {
  const t = `${pad2(h)}:${pad2(m)}`;
  if (minTime && t < minTime) {
    const [mh, mm] = minTime.split(':').map(Number);
    return { h: mh, m: mm };
  }
  if (maxTime && t > maxTime) {
    const [xh, xm] = maxTime.split(':').map(Number);
    return { h: xh, m: xm };
  }
  return { h, m };
}

export function resolveTimePickerPlacement(
  spaceBelow: number,
  popupHeight = 192,
  margin = 12
): 'below' | 'above' {
  return spaceBelow < popupHeight + margin ? 'above' : 'below';
}
