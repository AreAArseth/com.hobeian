'use strict';

import { ZigBeeDevice } from 'homey-zigbeedriver';
import { CLUSTER } from 'zigbee-clusters';

module.exports = class ZG227ZDevice extends ZigBeeDevice {

  private endpoint1: any = null;
  private lastWakeHandledAt = 0;

  async onNodeInit({ zclNode }: { zclNode: any }) {
    this.log('ZG-227Z device initialized');

    this.log('Available endpoints:', Object.keys(zclNode.endpoints));
    for (const [endpointId, endpoint] of Object.entries(zclNode.endpoints)) {
      this.log(`Endpoint ${endpointId} clusters:`, Object.keys((endpoint as any).clusters));
    }

    const endpoint = zclNode.endpoints[1];
    if (!endpoint) {
      this.error('Endpoint 1 not found');
      return;
    }
    this.endpoint1 = endpoint;

    const isSleepy = this.isDeviceSleepy();
    this.log(`Device is ${isSleepy ? 'sleepy (battery-powered)' : 'always-on'}`);

    this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 60,
          maxInterval: 3600,
          minChange: 50, // 0.5°C (value is in hundredths)
        },
      },
    });

    this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 60,
          maxInterval: 3600,
          minChange: 100, // 1% (value is in hundredths)
        },
      },
    });

    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 3600,
          maxInterval: 43200, // 12 hours
          minChange: 2, // 1% (value is 0-200, so 2 = 1%)
        },
      },
    });

    if (!isSleepy) {
      await this.readBattery(endpoint).catch(this.error);
    }
  }

  async onEndDeviceAnnounce(): Promise<void> {
    this.log('Device announced (woke up from sleep)');
    await this.onDeviceAwake();
  }

  private async onDeviceAwake(): Promise<void> {
    const now = Date.now();
    const DEBOUNCE_MS = 5000;

    if (now - this.lastWakeHandledAt < DEBOUNCE_MS) {
      this.log('Skipping duplicate wake handling (debounce)');
      return;
    }
    this.lastWakeHandledAt = now;

    this.log('Handling device wake-up');
    await this.setAvailable().catch(this.error);

    if (this.endpoint1) {
      await this.readBattery(this.endpoint1).catch(this.error);
    }
  }

  private async readBattery(endpoint: any): Promise<void> {
    const powerCluster = endpoint.clusters[CLUSTER.POWER_CONFIGURATION.NAME];
    if (!powerCluster) {
      this.log('PowerConfiguration cluster not available');
      return;
    }

    try {
      const batteryStatus = await powerCluster.readAttributes(['batteryPercentageRemaining']);
      if (batteryStatus.batteryPercentageRemaining !== undefined) {
        const battery = Math.round(batteryStatus.batteryPercentageRemaining / 2);
        this.log('Battery level:', battery, '%');
        await this.setCapabilityValue('measure_battery', battery);
      }
    } catch (err) {
      this.log('Could not read battery (device may be sleeping):', err);
    }
  }

  private isDeviceSleepy(): boolean {
    return (this as any).node?.receiveWhenIdle === false;
  }

  async onDeleted() {
    this.log('ZG-227Z device deleted');
  }

};
