'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  clampNumber,
  clampPercent,
  clampInt,
  rawTemperatureTimes10ToCelsius,
  applyTemperatureCalibrationC,
  emaUpdate,
  computeWaterAlarmFromSoilMoisture,
  toTuyaTemperatureCalibrationTenths,
  toTuyaPercentCalibration,
  toTuyaSamplingSeconds,
  toTuyaSoilWarningThresholdPercent,
} = require('../.homeybuild/lib/zg303z');

test('clampNumber clamps to range', () => {
  assert.equal(clampNumber(5, 0, 10), 5);
  assert.equal(clampNumber(-1, 0, 10), 0);
  assert.equal(clampNumber(11, 0, 10), 10);
});

test('clampPercent clamps to 0..100', () => {
  assert.equal(clampPercent(-5), 0);
  assert.equal(clampPercent(0), 0);
  assert.equal(clampPercent(50), 50);
  assert.equal(clampPercent(200), 100);
});

test('clampInt clamps and rounds', () => {
  assert.equal(clampInt(1.2, 0, 10), 1);
  assert.equal(clampInt(1.6, 0, 10), 2);
  assert.equal(clampInt(-5, 0, 10), 0);
  assert.equal(clampInt(50, 0, 10), 10);
});

test('rawTemperatureTimes10ToCelsius converts correctly (x10)', () => {
  assert.equal(rawTemperatureTimes10ToCelsius(234), 23.4);
});

test('applyTemperatureCalibrationC applies offset in °C', () => {
  assert.equal(applyTemperatureCalibrationC(20, 2), 22);
});

test('emaUpdate: tau=0 means no smoothing', () => {
  assert.equal(emaUpdate({
    previous: 10,
    next: 20,
    dtSeconds: 5,
    tauSeconds: 0,
  }), 20);
});

test('emaUpdate: dt=0 means no smoothing', () => {
  assert.equal(emaUpdate({
    previous: 10,
    next: 20,
    dtSeconds: 0,
    tauSeconds: 60,
  }), 20);
});

test('emaUpdate: with tau>0, output moves toward next', () => {
  const v = emaUpdate({
    previous: 0,
    next: 100,
    dtSeconds: 10,
    tauSeconds: 100,
  });
  assert.ok(v > 0 && v < 100);
});

test('computeWaterAlarmFromSoilMoisture triggers below threshold', () => {
  assert.equal(computeWaterAlarmFromSoilMoisture({ soilMoisturePercent: 69, thresholdPercent: 70 }), true);
  assert.equal(computeWaterAlarmFromSoilMoisture({ soilMoisturePercent: 70, thresholdPercent: 70 }), false);
  assert.equal(computeWaterAlarmFromSoilMoisture({ soilMoisturePercent: 80, thresholdPercent: 70 }), false);
});

test('toTuyaTemperatureCalibrationTenths maps °C to tenths with clamp', () => {
  assert.equal(toTuyaTemperatureCalibrationTenths(0), 0);
  assert.equal(toTuyaTemperatureCalibrationTenths(1.0), 10);
  assert.equal(toTuyaTemperatureCalibrationTenths(-0.5), -5);
  assert.equal(toTuyaTemperatureCalibrationTenths(99), 20);
  assert.equal(toTuyaTemperatureCalibrationTenths(-99), -20);
});

test('toTuyaPercentCalibration clamps to -30..30', () => {
  assert.equal(toTuyaPercentCalibration(0), 0);
  assert.equal(toTuyaPercentCalibration(30), 30);
  assert.equal(toTuyaPercentCalibration(-30), -30);
  assert.equal(toTuyaPercentCalibration(999), 30);
  assert.equal(toTuyaPercentCalibration(-999), -30);
});

test('toTuyaSamplingSeconds clamps to 5..3600', () => {
  assert.equal(toTuyaSamplingSeconds(5), 5);
  assert.equal(toTuyaSamplingSeconds(3600), 3600);
  assert.equal(toTuyaSamplingSeconds(1), 5);
  assert.equal(toTuyaSamplingSeconds(999999), 3600);
});

test('toTuyaSoilWarningThresholdPercent clamps to 0..100', () => {
  assert.equal(toTuyaSoilWarningThresholdPercent(0), 0);
  assert.equal(toTuyaSoilWarningThresholdPercent(100), 100);
  assert.equal(toTuyaSoilWarningThresholdPercent(-1), 0);
  assert.equal(toTuyaSoilWarningThresholdPercent(999), 100);
});
