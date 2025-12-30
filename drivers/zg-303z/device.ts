'use strict';

import { ZigBeeDevice } from 'homey-zigbeedriver';
import { CLUSTER } from 'zigbee-clusters';

// Import and register Tuya cluster
import { TuyaDataTypes, TUYA_CLUSTER_ID } from '../../lib/TuyaCluster';
import {
  applyTemperatureCalibrationC,
  clampPercent,
  computeWaterAlarmFromSoilMoisture,
  emaUpdate,
  rawTemperatureTimes10ToCelsius,
} from '../../lib/zg303z';

module.exports = class ZG303ZDevice extends ZigBeeDevice {

  private tuyaCluster: any = null;
  private lastSoilMoisturePercent?: number;

  private lastSoilUpdateAtMs?: number;
  private lastTempUpdateAtMs?: number;
  private lastHumidityUpdateAtMs?: number;

  private soilMoistureEma?: number;
  private temperatureEmaC?: number;
  private humidityEma?: number;

  async onNodeInit({ zclNode }: { zclNode: any }) {
    this.log('ZG-303Z device initialized');

    // Note: device-side sampling interval is not reliably configurable for this Tuya sensor.
    // The sampling settings are used as smoothing time constants instead.

    // Log available endpoints and clusters for debugging
    this.log('Available endpoints:', Object.keys(zclNode.endpoints));

    for (const [endpointId, endpoint] of Object.entries(zclNode.endpoints)) {
      this.log(`Endpoint ${endpointId} clusters:`, Object.keys((endpoint as any).clusters));
    }

    // Get endpoint 1
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) {
      this.error('Endpoint 1 not found');
      return;
    }

    // Try to get the Tuya cluster
    this.tuyaCluster = endpoint.clusters['tuya'] || endpoint.clusters[TUYA_CLUSTER_ID];

    if (this.tuyaCluster) {
      this.log('Tuya cluster found!');
      this.setupTuyaListeners();
    } else {
      this.log('Tuya cluster not found in named clusters, trying to bind...');

      // Try to bind the cluster manually
      try {
        await endpoint.bind('tuya');
        this.tuyaCluster = endpoint.clusters['tuya'];
        if (this.tuyaCluster) {
          this.log('Tuya cluster bound successfully');
          this.setupTuyaListeners();
        }
      } catch (err) {
        this.log('Could not bind Tuya cluster:', err);
      }
    }

    // Register for raw cluster commands on the Tuya cluster
    this.registerRawReportHandler(zclNode);

    // Try to read battery (may fail if device is sleeping)
    this.readBattery(endpoint).catch(this.error);
  }

  /**
   * Set up listeners for Tuya cluster events
   */
  private setupTuyaListeners() {
    if (!this.tuyaCluster) return;

    // Listen for datapoint reports
    this.tuyaCluster.on('reporting', (args: any) => {
      this.log('Tuya reporting event:', args);
      this.processTuyaReport(args);
    });

    this.tuyaCluster.on('response', (args: any) => {
      this.log('Tuya response event:', args);
      this.processTuyaReport(args);
    });

    this.tuyaCluster.on('datapoint', (args: any) => {
      this.log('Tuya datapoint event:', args);
      this.processTuyaReport(args);
    });
  }

  /**
   * Register handler for raw Zigbee frames
   */
  private registerRawReportHandler(zclNode: any) {
    // Use zclNode's handleFrame capability to intercept raw frames
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) return;

    // Intercept handleFrame for the Tuya cluster
    const originalHandleFrame = endpoint.handleFrame?.bind(endpoint);
    if (originalHandleFrame) {
      endpoint.handleFrame = (clusterId: number, frame: Buffer, meta: any) => {
        if (clusterId === TUYA_CLUSTER_ID) {
          this.log('Raw Tuya frame received, cluster:', clusterId);
          this.log('Frame data:', frame.toString('hex'));
          this.parseRawTuyaFrame(frame);
        }
        return originalHandleFrame(clusterId, frame, meta);
      };
      this.log('Registered raw frame handler for Tuya cluster');
    }

    // Also try to use the cluster report handler
    if (endpoint.clusters) {
      for (const [name, cluster] of Object.entries(endpoint.clusters)) {
        const cl = cluster as any;
        if (typeof cl.onReport === 'function') {
          const originalOnReport = cl.onReport.bind(cl);
          cl.onReport = (args: any) => {
            this.log(`Cluster ${name} report:`, args);
            return originalOnReport(args);
          };
        }
      }
    }
  }

  /**
   * Parse a raw Tuya frame
   */
  private parseRawTuyaFrame(frame: Buffer) {
    try {
      this.log('Parsing raw Tuya frame:', frame.toString('hex'));

      if (frame.length < 10) {
        this.log('Frame too short:', frame.length);
        return;
      }

      let offset = 0;

      // Skip ZCL header if present (frame control + seq + command = 3 bytes)
      // Frame control byte is typically 0x09 (cluster specific, server to client) or 0x01
      if ((frame[0] & 0x03) !== 0x00) { // Check if cluster specific
        offset = 3; // Skip ZCL header
        this.log('Skipped ZCL header, offset now:', offset);
      }

      // Parse Tuya payload: [status:1][transid:1][dp:1][datatype:1][length:2][data:length]
      while (offset + 6 <= frame.length) {
        const status = frame.readUInt8(offset);
        const transid = frame.readUInt8(offset + 1);
        const dp = frame.readUInt8(offset + 2);
        const datatype = frame.readUInt8(offset + 3);
        const len = frame.readUInt16BE(offset + 4);

        this.log(`Tuya DP: status=${status}, transid=${transid}, dp=${dp}, type=${datatype}, len=${len}`);

        if (len > 0 && offset + 6 + len <= frame.length) {
          const data = frame.slice(offset + 6, offset + 6 + len);
          this.log(`Extracted DP ${dp}: Type=${datatype}, Data=${data.toString('hex')}`);
          this.processDataPoint(dp, datatype, data);
          offset += 6 + len;
        } else if (len === 0) {
          // Zero length datapoint, skip
          offset += 6;
        } else {
          this.log('Incomplete datapoint, remaining bytes:', frame.length - offset);
          break;
        }
      }
    } catch (error) {
      this.error('Error parsing raw Tuya frame:', error);
    }
  }

  /**
   * Process a Tuya report
   */
  private processTuyaReport(args: any) {
    if (!args) return;

    this.log('Processing Tuya report:', JSON.stringify(args));

    const { dp, datatype, data } = args;

    if (typeof dp === 'number' && data) {
      this.processDataPoint(dp, datatype || 0, Buffer.isBuffer(data) ? data : Buffer.from([data]));
    }
  }

  /**
   * Process a Tuya datapoint value
   */
  private processDataPoint(dp: number, datatype: number, data: Buffer) {
    let value: number | boolean;

    // Parse value based on datatype
    switch (datatype) {
      case TuyaDataTypes.BOOL:
        value = data.readUInt8(0) !== 0;
        break;
      case TuyaDataTypes.VALUE:
        if (data.length >= 4) {
          value = data.readInt32BE(0);
        } else if (data.length >= 2) {
          value = data.readInt16BE(0);
        } else {
          value = data.readUInt8(0);
        }
        break;
      case TuyaDataTypes.ENUM:
        value = data.readUInt8(0);
        break;
      default:
        if (data.length >= 4) {
          value = data.readInt32BE(0);
        } else if (data.length >= 2) {
          value = data.readUInt16BE(0);
        } else if (data.length >= 1) {
          value = data.readUInt8(0);
        } else {
          this.log(`Unknown datatype ${datatype} or invalid data length`);
          return;
        }
    }

    this.log(`Processing DP ${dp} = ${value} (type: ${datatype})`);

    // Map datapoints to capabilities
    // Verified mappings from actual device traffic:
    // DP 3 = Soil Moisture (0-100%)
    // DP 5 = Temperature (value / 10 = °C)
    // DP 109 = Air Humidity (0-100%)
    // DP 15 = possibly battery or other setting
    switch (dp) {
      case 3: // Soil Moisture
        if (typeof value === 'number') {
          const calibration = this.getSetting('soil_calibration') || 0;
          const rawPercent = clampPercent(value + calibration);

          const nowMs = Date.now();
          const dtSeconds = this.lastSoilUpdateAtMs ? (nowMs - this.lastSoilUpdateAtMs) / 1000 : undefined;
          this.lastSoilUpdateAtMs = nowMs;

          const tauSeconds = this.getSetting('soil_sampling') || 0;
          const smoothed = clampPercent(emaUpdate({
            previous: this.soilMoistureEma,
            next: rawPercent,
            dtSeconds,
            tauSeconds,
          }));
          this.soilMoistureEma = smoothed;
          this.lastSoilMoisturePercent = smoothed;

          this.log(`Setting soil moisture to ${smoothed}% (raw=${rawPercent}%, tau=${tauSeconds}s)`);
          if (this.hasCapability('measure_soil_moisture')) {
            this.setCapabilityValue('measure_soil_moisture', smoothed).catch(this.error);
          }

          // Local water-shortage alarm derived from dryness threshold setting
          const threshold = this.getSetting('soil_warning') ?? 70;
          const alarm = computeWaterAlarmFromSoilMoisture({
            soilMoisturePercent: smoothed,
            thresholdPercent: threshold,
          });
          this.log(`Setting water alarm to ${alarm} (threshold ${threshold}%)`);
          if (this.hasCapability('alarm_water')) {
            this.setCapabilityValue('alarm_water', alarm).catch(this.error);
          }
        }
        break;

      case 5: // Temperature (value / 10 = °C)
        if (typeof value === 'number') {
          const calibration = this.getSetting('temperature_calibration') || 0;
          const nowMs = Date.now();
          const dtSeconds = this.lastTempUpdateAtMs ? (nowMs - this.lastTempUpdateAtMs) / 1000 : undefined;
          this.lastTempUpdateAtMs = nowMs;

          const tauSeconds = this.getSetting('temperature_sampling') || 0;
          const rawTempC = applyTemperatureCalibrationC(rawTemperatureTimes10ToCelsius(value), calibration);
          const smoothedTempC = emaUpdate({
            previous: this.temperatureEmaC,
            next: rawTempC,
            dtSeconds,
            tauSeconds,
          });
          this.temperatureEmaC = smoothedTempC;

          this.log(`Setting temperature to ${smoothedTempC}°C (raw=${rawTempC}°C, tau=${tauSeconds}s)`);
          if (this.hasCapability('measure_temperature')) {
            this.setCapabilityValue('measure_temperature', smoothedTempC).catch(this.error);
          }
        }
        break;

      case 109: // Air Humidity
        if (typeof value === 'number') {
          const calibration = this.getSetting('humidity_calibration') || 0;
          const nowMs = Date.now();
          const dtSeconds = this.lastHumidityUpdateAtMs ? (nowMs - this.lastHumidityUpdateAtMs) / 1000 : undefined;
          this.lastHumidityUpdateAtMs = nowMs;

          const tauSeconds = this.getSetting('temperature_sampling') || 0;
          const rawPercent = clampPercent(value + calibration);
          const smoothed = clampPercent(emaUpdate({
            previous: this.humidityEma,
            next: rawPercent,
            dtSeconds,
            tauSeconds,
          }));
          this.humidityEma = smoothed;

          this.log(`Setting humidity to ${smoothed}% (raw=${rawPercent}%, tau=${tauSeconds}s)`);
          if (this.hasCapability('measure_humidity')) {
            this.setCapabilityValue('measure_humidity', smoothed).catch(this.error);
          }
        }
        break;

      case 15: // Battery percentage
        if (typeof value === 'number') {
          const battery = clampPercent(value);
          this.log(`Setting battery to ${battery}%`);
          if (this.hasCapability('measure_battery')) {
            this.setCapabilityValue('measure_battery', battery).catch(this.error);
          }
        }
        break;

      case 14: // Water warning (may need verification)
        if (typeof value === 'number' || typeof value === 'boolean') {
          const alarm = value === 1 || value === true;
          this.log(`Setting water alarm to ${alarm}`);
          if (this.hasCapability('alarm_water')) {
            this.setCapabilityValue('alarm_water', alarm).catch(this.error);
          }
        }
        break;

      default:
        this.log(`Unhandled DP ${dp} = ${value}`);
    }
  }

  /**
   * Read battery status
   */
  private async readBattery(endpoint: any) {
    if (!endpoint.clusters[CLUSTER.POWER_CONFIGURATION.NAME]) {
      this.log('PowerConfiguration cluster not available');
      return;
    }

    try {
      const batteryStatus = await endpoint.clusters[CLUSTER.POWER_CONFIGURATION.NAME].readAttributes(['batteryPercentageRemaining']);
      if (batteryStatus.batteryPercentageRemaining !== undefined) {
        const battery = Math.round(batteryStatus.batteryPercentageRemaining / 2);
        this.log('Battery level:', battery, '%');
        await this.setCapabilityValue('measure_battery', battery);
      }
    } catch (err) {
      this.log('Could not read battery (device may be sleeping):', err);
    }
  }

  /**
   * Handle setting changes
   */
  async onSettings({ oldSettings, newSettings, changedKeys }: {
    oldSettings: Record<string, any>;
    newSettings: Record<string, any>;
    changedKeys: string[];
  }): Promise<void> {
    this.log('Settings changed:', changedKeys);

    for (const key of changedKeys) {
      const value = newSettings[key];

      if (key === 'soil_warning') {
        // Recompute alarm immediately from last known soil moisture (if any)
        if (typeof this.lastSoilMoisturePercent === 'number') {
          const alarm = computeWaterAlarmFromSoilMoisture({
            soilMoisturePercent: this.lastSoilMoisturePercent,
            thresholdPercent: value ?? 70,
          });
          this.log(`Recomputed water alarm to ${alarm} after threshold change`);
          if (this.hasCapability('alarm_water')) {
            this.setCapabilityValue('alarm_water', alarm).catch(this.error);
          }
        }
      }
    }
  }

  /**
   * Clean up on device removal
   */
  async onDeleted() {
    this.log('ZG-303Z device deleted');
  }

};
