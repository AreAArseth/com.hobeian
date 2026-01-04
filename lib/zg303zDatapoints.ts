'use strict';

/**
 * Handler types for DP processing
 */
export type DpHandler = 'temperature' | 'soilMoisture' | 'battery' | 'humidity' | 'waterWarning' | 'setting';

/**
 * DP to handler mapping - handles all known variants in one place
 * This table supports both legacy (3, 5, 15) and Z2M (101, 107, 108) schemes
 */
export const DP_HANDLERS: Record<number, { handler: DpHandler; divideBy?: number }> = {
  // Temperature: legacy (5) and Z2M (101), both divide by 10
  5:   { handler: 'temperature', divideBy: 10 },
  101: { handler: 'temperature', divideBy: 10 },
  
  // Soil Moisture: legacy (3) and Z2M (107)
  3:   { handler: 'soilMoisture' },
  107: { handler: 'soilMoisture' },
  
  // Battery: legacy (15) and Z2M (108)
  15:  { handler: 'battery' },
  108: { handler: 'battery' },
  
  // Air Humidity: always 109
  109: { handler: 'humidity' },
  
  // Water Warning: DP 1 (Z2M) and DP 14 (legacy)
  1:   { handler: 'waterWarning' },
  14:  { handler: 'waterWarning' },
  
  // Settings (echoed back by device)
  102: { handler: 'setting' },  // soil calibration
  104: { handler: 'setting' },  // temp calibration
  105: { handler: 'setting' },  // humidity calibration
  106: { handler: 'setting' },  // temp unit
  110: { handler: 'setting' },  // soil warning threshold
  111: { handler: 'setting' },  // temp sampling interval
  112: { handler: 'setting' },  // soil sampling interval
};

/**
 * Settings DPs for writing to device
 */
export const DP_WRITE = {
  SOIL_CALIBRATION: 102,
  TEMP_CALIBRATION: 104,
  HUMIDITY_CALIBRATION: 105,
  TEMP_UNIT: 106,
  SOIL_WARNING_THRESHOLD: 110,
  TEMP_SAMPLING_INTERVAL: 111,
  SOIL_SAMPLING_INTERVAL: 112,
} as const;

/**
 * Default setting values
 */
export const DEFAULTS = {
  SOIL_WARNING_PERCENT: 30,
  CALIBRATION: 0,
  SAMPLING_SECONDS: 1800,
} as const;
