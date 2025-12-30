'use strict';

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
 */
export function rawTemperatureTimes10ToCelsius(rawTimes10: number): number {
  return rawTimes10 / 10;
}

export function applyTemperatureCalibrationC(tempC: number, calibrationC: number): number {
  return tempC + calibrationC;
}

/**
 * Exponential moving average with a time-based smoothing factor.
 *
 * tauSeconds:
 * - 0 => no smoothing (output = next)
 * - higher => smoother / slower response
 */
export function emaUpdate(params: {
  previous?: number;
  next: number;
  dtSeconds?: number;
  tauSeconds?: number;
}): number {
  const { previous, next } = params;
  if (typeof previous !== 'number' || Number.isNaN(previous)) return next;

  const tau = Math.max(0, params.tauSeconds ?? 0);
  const dt = Math.max(0, params.dtSeconds ?? 0);
  if (tau === 0 || dt === 0) return next;

  // alpha = 1 - exp(-dt/tau)
  const alpha = 1 - Math.exp(-dt / tau);
  return previous + alpha * (next - previous);
}

export function computeWaterAlarmFromSoilMoisture(params: {
  soilMoisturePercent: number;
  thresholdPercent: number;
}): boolean {
  const { soilMoisturePercent, thresholdPercent } = params;
  return soilMoisturePercent < clampPercent(thresholdPercent);
}
