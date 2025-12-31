'use strict';

export function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clampPercent(value: number): number {
  return clampNumber(value, 0, 100);
}

export function clampInt(value: number, min: number, max: number): number {
  return Math.round(clampNumber(value, min, max));
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

// Tuya ZG-303Z writable datapoints expect integer formats:
// - Temperature calibration (DP 104): tenths of °C, range -20..20 (== -2.0..+2.0°C)
// - Humidity/soil calibration (DP 105/102): integer %, range -30..30
// - Sampling intervals (DP 111/112): seconds, range 5..3600
// - Soil warning threshold (DP 110): integer %, range 0..100
export function toTuyaTemperatureCalibrationTenths(offsetC: number): number {
  return clampInt(offsetC * 10, -20, 20);
}

export function toTuyaPercentCalibration(offsetPercent: number): number {
  return clampInt(offsetPercent, -30, 30);
}

export function toTuyaSamplingSeconds(seconds: number): number {
  return clampInt(seconds, 5, 3600);
}

export function toTuyaSoilWarningThresholdPercent(percent: number): number {
  return clampInt(percent, 0, 100);
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
