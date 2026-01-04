'use strict';

import { ZigBeeDevice } from 'homey-zigbeedriver';
import { CLUSTER } from 'zigbee-clusters';

// Import and register Tuya cluster
import { TuyaDataTypes, TUYA_CLUSTER_ID } from '../../lib/TuyaCluster';
import { decodeTuyaDpValuesFromZclFrame } from '../../lib/tuyaFrame';
import {
  clampPercent,
  computeWaterAlarmFromSoilMoisture,
  rawTemperatureTimes10ToCelsius,
  toTuyaPercentCalibration,
  toTuyaSamplingSeconds,
  toTuyaSoilWarningThresholdPercent,
  toTuyaTemperatureCalibrationTenths,
} from '../../lib/zg303z';
import { DP_HANDLERS, DP_WRITE, DEFAULTS } from '../../lib/zg303zDatapoints';

module.exports = class ZG303ZDevice extends ZigBeeDevice {

  private tuyaCluster: any = null;
  private lastSoilMoisturePercent?: number;
  private pendingSettingsApply = false;
  private endpoint1: any = null;
  private lastWakeHandledAt = 0;

  async onNodeInit({ zclNode }: { zclNode: any }) {
    this.log('ZG-303Z device initialized');

    // This Tuya device supports configuring sampling/calibration via datapoints on 0xEF00.

    // Log available endpoints and clusters for debugging
    this.log('Available endpoints:', Object.keys(zclNode.endpoints));

    for (const [endpointId, endpoint] of Object.entries(zclNode.endpoints)) {
      this.log(`Endpoint ${endpointId} clusters:`, Object.keys((endpoint as any).clusters));
    }

    // Get endpoint 1 and store for later use
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) {
      this.error('Endpoint 1 not found');
      return;
    }
    this.endpoint1 = endpoint;

    // Detect if this is a sleepy (battery-powered) device
    const isSleepy = this.isDeviceSleepy();
    this.log(`Device is ${isSleepy ? 'sleepy (battery-powered)' : 'always-on'}`);

    // Only send magic packet on first init (pairing), not on app restarts
    const isFirstInit = typeof (this as any).isFirstInit === 'function' ? (this as any).isFirstInit() : false;
    if (isFirstInit) {
      this.log('First init - sending Tuya magic packet');
      await this.configureMagicPacket(zclNode).catch(this.error);
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

    // For sleepy devices, defer commands until device wakes up
    // For always-on devices, apply settings immediately
    if (isSleepy) {
      this.log('Device is sleepy - will apply settings and read battery when device wakes up');
      // Do NOT set pendingSettingsApply = true here - no user changes pending yet
    } else {
      // Device is always-on, apply settings immediately
      if (this.tuyaCluster) {
        await this.applyDeviceSettings().catch(this.error);
      }
      await this.readBattery(endpoint).catch(this.error);
    }
  }

  private async applyDeviceSettings(): Promise<void> {
    if (!this.tuyaCluster) return;

    const temperatureSampling = toTuyaSamplingSeconds(this.getSetting('temperature_sampling') ?? DEFAULTS.SAMPLING_SECONDS);
    const soilSampling = toTuyaSamplingSeconds(this.getSetting('soil_sampling') ?? DEFAULTS.SAMPLING_SECONDS);
    const soilWarning = toTuyaSoilWarningThresholdPercent(this.getSetting('soil_warning') ?? DEFAULTS.SOIL_WARNING_PERCENT);

    // Calibrations
    const temperatureCalibrationTenths = toTuyaTemperatureCalibrationTenths(this.getSetting('temperature_calibration') ?? DEFAULTS.CALIBRATION);
    const humidityCalibration = toTuyaPercentCalibration(this.getSetting('humidity_calibration') ?? DEFAULTS.CALIBRATION);
    const soilCalibration = toTuyaPercentCalibration(this.getSetting('soil_calibration') ?? DEFAULTS.CALIBRATION);

    // Best-effort: device may be sleeping; will apply on next awake/report window.
    await this.tuyaCluster.setDatapointEnum?.(DP_WRITE.TEMP_UNIT, 0); // enforce Celsius
    await this.tuyaCluster.setDatapointValue(DP_WRITE.TEMP_SAMPLING_INTERVAL, temperatureSampling);
    await this.tuyaCluster.setDatapointValue(DP_WRITE.SOIL_SAMPLING_INTERVAL, soilSampling);
    await this.tuyaCluster.setDatapointValue(DP_WRITE.SOIL_WARNING_THRESHOLD, soilWarning);

    await this.tuyaCluster.setDatapointValue(DP_WRITE.TEMP_CALIBRATION, temperatureCalibrationTenths);
    await this.tuyaCluster.setDatapointValue(DP_WRITE.HUMIDITY_CALIBRATION, humidityCalibration);
    await this.tuyaCluster.setDatapointValue(DP_WRITE.SOIL_CALIBRATION, soilCalibration);

    this.log('Applied device settings via Tuya DPs', {
      temperatureSampling,
      soilSampling,
      soilWarning,
      temperatureCalibrationTenths,
      humidityCalibration,
      soilCalibration,
    });
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

          // Device is awake since we received data - trigger wake handler
          this.onDeviceAwake().catch(this.error);
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
      const decoded = decodeTuyaDpValuesFromZclFrame(frame);
      if (decoded.dpValues.length === 0) return;

      this.log(
        `Decoded Tuya frame: cmd=${decoded.commandId} status=${decoded.status} transid=${decoded.transid} dpCount=${decoded.dpValues.length}`,
      );

      for (const dpValue of decoded.dpValues) {
        this.processDataPoint(dpValue.dp, dpValue.datatype, dpValue.data);
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
   * Parse a raw value from Tuya datapoint data based on datatype
   */
  private parseDpValue(datatype: number, data: Buffer): number | boolean {
    switch (datatype) {
      case TuyaDataTypes.BOOL:
        return data.readUInt8(0) !== 0;
      case TuyaDataTypes.VALUE:
        if (data.length >= 4) return data.readInt32BE(0);
        if (data.length >= 2) return data.readInt16BE(0);
        return data.readUInt8(0);
      case TuyaDataTypes.ENUM:
        return data.readUInt8(0);
      default:
        if (data.length >= 4) return data.readInt32BE(0);
        if (data.length >= 2) return data.readUInt16BE(0);
        if (data.length >= 1) return data.readUInt8(0);
        throw new Error(`Unknown datatype ${datatype} or empty data`);
    }
  }

  /**
   * Process a Tuya datapoint value using the DP_HANDLERS mapping table
   */
  private processDataPoint(dp: number, datatype: number, data: Buffer) {
    const mapping = DP_HANDLERS[dp];
    
    if (!mapping) {
      this.log(`Unknown DP ${dp} (type: ${datatype})`);
      return;
    }

    const rawValue = this.parseDpValue(datatype, data);
    
    // Apply divideBy transformation if specified in mapping
    const value = mapping.divideBy && typeof rawValue === 'number' 
      ? rawValue / mapping.divideBy 
      : rawValue;

    this.log(`Processing DP ${dp} = ${value} (handler: ${mapping.handler})`);

    // Dispatch based on handler type
    switch (mapping.handler) {
      case 'temperature':
        if (typeof rawValue === 'number') {
          const tempC = rawTemperatureTimes10ToCelsius(rawValue);
          this.log(`Setting temperature to ${tempC}°C`);
          if (this.hasCapability('measure_temperature')) {
            this.setCapabilityValue('measure_temperature', tempC).catch(this.error);
          }
        }
        break;

      case 'soilMoisture':
        if (typeof value === 'number') {
          const soilMoisture = clampPercent(value);
          this.lastSoilMoisturePercent = soilMoisture;

          this.log(`Setting soil moisture to ${soilMoisture}%`);
          if (this.hasCapability('measure_soil_moisture')) {
            this.setCapabilityValue('measure_soil_moisture', soilMoisture).catch(this.error);
          }

          // Fallback: local alarm derived from threshold setting
          const threshold = this.getSetting('soil_warning') ?? DEFAULTS.SOIL_WARNING_PERCENT;
          const alarm = computeWaterAlarmFromSoilMoisture({
            soilMoisturePercent: soilMoisture,
            thresholdPercent: threshold,
          });
          this.log(`Setting water alarm to ${alarm} (threshold ${threshold}%)`);
          if (this.hasCapability('alarm_water')) {
            this.setCapabilityValue('alarm_water', alarm).catch(this.error);
          }
        }
        break;

      case 'battery':
        if (typeof value === 'number') {
          const battery = clampPercent(value);
          this.log(`Setting battery to ${battery}%`);
          if (this.hasCapability('measure_battery')) {
            this.setCapabilityValue('measure_battery', battery).catch(this.error);
          }
        }
        break;

      case 'humidity':
        if (typeof value === 'number') {
          const humidity = clampPercent(value);
          this.log(`Setting humidity to ${humidity}%`);
          if (this.hasCapability('measure_humidity')) {
            this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
          }
        }
        break;

      case 'waterWarning':
        if (typeof value === 'number' || typeof value === 'boolean') {
          const alarm = value === 1 || value === true;
          this.log(`Setting water alarm to ${alarm}`);
          if (this.hasCapability('alarm_water')) {
            this.setCapabilityValue('alarm_water', alarm).catch(this.error);
          }
        }
        break;

      case 'setting':
        this.log(`Setting DP ${dp} confirmed: ${value}`);
        break;
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

    const isSleepy = this.isDeviceSleepy();

    // For sleepy devices, queue settings for when device wakes up
    if (isSleepy) {
      this.log('Device is sleepy - queueing settings for next wake-up');
      this.pendingSettingsApply = true;
    } else if (this.tuyaCluster) {
      // Device is always-on, apply settings immediately
      for (const key of changedKeys) {
        const value = newSettings[key];
        try {
          if (key === 'temperature_sampling') {
            await this.tuyaCluster.setDatapointValue(DP_WRITE.TEMP_SAMPLING_INTERVAL, toTuyaSamplingSeconds(value ?? DEFAULTS.SAMPLING_SECONDS));
          }
          if (key === 'soil_sampling') {
            await this.tuyaCluster.setDatapointValue(DP_WRITE.SOIL_SAMPLING_INTERVAL, toTuyaSamplingSeconds(value ?? DEFAULTS.SAMPLING_SECONDS));
          }
          if (key === 'soil_warning') {
            await this.tuyaCluster.setDatapointValue(DP_WRITE.SOIL_WARNING_THRESHOLD, toTuyaSoilWarningThresholdPercent(value ?? DEFAULTS.SOIL_WARNING_PERCENT));
          }
          if (key === 'temperature_calibration') {
            await this.tuyaCluster.setDatapointValue(DP_WRITE.TEMP_CALIBRATION, toTuyaTemperatureCalibrationTenths(value ?? DEFAULTS.CALIBRATION));
          }
          if (key === 'humidity_calibration') {
            await this.tuyaCluster.setDatapointValue(DP_WRITE.HUMIDITY_CALIBRATION, toTuyaPercentCalibration(value ?? DEFAULTS.CALIBRATION));
          }
          if (key === 'soil_calibration') {
            await this.tuyaCluster.setDatapointValue(DP_WRITE.SOIL_CALIBRATION, toTuyaPercentCalibration(value ?? DEFAULTS.CALIBRATION));
          }
        } catch (err) {
          this.error('Failed to apply setting to device:', err);
        }
      }
    }

    // Always recompute local alarm immediately (doesn't require device communication)
    if (changedKeys.includes('soil_warning')) {
      const value = newSettings['soil_warning'];
      if (typeof this.lastSoilMoisturePercent === 'number') {
        const alarm = computeWaterAlarmFromSoilMoisture({
          soilMoisturePercent: this.lastSoilMoisturePercent,
          thresholdPercent: value ?? DEFAULTS.SOIL_WARNING_PERCENT,
        });
        this.log(`Recomputed water alarm to ${alarm} after threshold change`);
        if (this.hasCapability('alarm_water')) {
          this.setCapabilityValue('alarm_water', alarm).catch(this.error);
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

  /**
   * Called when a sleepy device announces itself (wakes up and rejoins network)
   */
  async onEndDeviceAnnounce(): Promise<void> {
    this.log('Device announced (woke up from sleep)');
    await this.onDeviceAwake();
  }

  private async configureMagicPacket(zclNode: any): Promise<void> {
    const endpoints = Object.values(zclNode.endpoints || {}) as any[];
    const candidates = endpoints.filter((e) => e?.clusters?.[CLUSTER.BASIC.NAME]);
    for (const endpoint of candidates) {
      try {
        await endpoint.clusters[CLUSTER.BASIC.NAME].readAttributes([
          'manufacturerName',
          'zclVersion',
          'appVersion',
          'modelId',
          'powerSource',
          0xfffe,
        ]);
        this.log('Sent Tuya configureMagicPacket readAttributes');
        return;
      } catch (err) {
        this.log('Tuya configureMagicPacket readAttributes failed on endpoint, trying next:', err);
      }
    }
  }

  /**
   * Check if device is sleepy (battery-powered, not always listening)
   */
  private isDeviceSleepy(): boolean {
    return (this as any).node?.receiveWhenIdle === false;
  }

  /**
   * Centralized handler for device wake-up events.
   * Called from onEndDeviceAnnounce and handleFrame when data is received.
   * Debounced to avoid duplicate processing within a short window.
   */
  private async onDeviceAwake(): Promise<void> {
    const now = Date.now();
    const DEBOUNCE_MS = 5000;

    if (now - this.lastWakeHandledAt < DEBOUNCE_MS) {
      this.log('Skipping duplicate wake handling (debounce)');
      return;
    }
    this.lastWakeHandledAt = now;

    this.log('Handling device wake-up');

    // Mark device as available
    await this.setAvailable().catch(this.error);

    // Only apply settings if user changed them while device was sleeping
    if (this.pendingSettingsApply) {
      this.log('Applying pending user settings...');
      await this.applyDeviceSettings().catch(this.error);
      this.pendingSettingsApply = false;
    }

    // Read battery status
    if (this.endpoint1) {
      await this.readBattery(this.endpoint1).catch(this.error);
    }
  }

};
