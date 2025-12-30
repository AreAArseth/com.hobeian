'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  clampNumber,
  clampPercent,
  rawTemperatureToCelsius,
  applyTemperatureCalibrationC,
  shouldAcceptUpdate,
  computeWaterAlarmFromSoilMoisture,
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

test('rawTemperatureToCelsius interprets celsius correctly (x10)', () => {
  assert.equal(rawTemperatureToCelsius(234, 'celsius'), 23.4);
});

test('rawTemperatureToCelsius converts fahrenheit correctly (x10)', () => {
  // 75.2°F ~= 24°C
  const c = rawTemperatureToCelsius(752, 'fahrenheit');
  assert.ok(Math.abs(c - 24) < 0.2);
});

test('applyTemperatureCalibrationC applies offset in °C', () => {
  assert.equal(applyTemperatureCalibrationC(20, 2), 22);
});

test('shouldAcceptUpdate rate-limits by interval', () => {
  const now = 1_000_000;
  assert.equal(shouldAcceptUpdate({ lastAcceptedAtMs: undefined, intervalSeconds: 10, nowMs: now }), true);
  assert.equal(shouldAcceptUpdate({ lastAcceptedAtMs: now - 9_000, intervalSeconds: 10, nowMs: now }), false);
  assert.equal(shouldAcceptUpdate({ lastAcceptedAtMs: now - 10_000, intervalSeconds: 10, nowMs: now }), true);
});

test('computeWaterAlarmFromSoilMoisture triggers below threshold', () => {
  assert.equal(computeWaterAlarmFromSoilMoisture({ soilMoisturePercent: 69, thresholdPercent: 70 }), true);
  assert.equal(computeWaterAlarmFromSoilMoisture({ soilMoisturePercent: 70, thresholdPercent: 70 }), false);
  assert.equal(computeWaterAlarmFromSoilMoisture({ soilMoisturePercent: 80, thresholdPercent: 70 }), false);
});

