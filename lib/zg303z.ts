'use strict';

export type TemperatureUnit = 'celsius' | 'fahrenheit';

export function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clampPercent(value: number): number {
  return clampNumber(value, 0, 100);
}

/**
 * Convert a raw reported temperature to °C.
 *
 * Assumptions:
 * - The sensor reports temperature scaled by 10 (i.e. 234 => 23.4).
 * - When the device is configured to Fahrenheit, it reports °F (still scaled by 10).
 */
export function rawTemperatureToCelsius(rawTimes10: number, unit: TemperatureUnit): number {
  const raw = rawTimes10 / 10;
  if (unit === 'fahrenheit') return (raw - 32) * 5 / 9;
  return raw;
}

export function applyTemperatureCalibrationC(tempC: number, calibrationC: number): number {
  return tempC + calibrationC;
}

export function shouldAcceptUpdate(params: {
  lastAcceptedAtMs?: number;
  intervalSeconds?: number;
  nowMs: number;
}): boolean {
  const { lastAcceptedAtMs, intervalSeconds, nowMs } = params;
  const intervalMs = Math.max(0, Math.floor((intervalSeconds ?? 0) * 1000));
  if (!lastAcceptedAtMs) return true;
  return nowMs - lastAcceptedAtMs >= intervalMs;
}

export function computeWaterAlarmFromSoilMoisture(params: {
  soilMoisturePercent: number;
  thresholdPercent: number;
}): boolean {
  const { soilMoisturePercent, thresholdPercent } = params;
  return soilMoisturePercent < clampPercent(thresholdPercent);
}

