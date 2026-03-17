'use strict';

import { ZigBeeDevice } from 'homey-zigbeedriver';
import { CLUSTER } from 'zigbee-clusters';
import IASZoneBoundCluster from '../../lib/IASZoneBoundCluster';

module.exports = class ZG222ZDevice extends ZigBeeDevice {

  private lastWakeHandledAt = 0;

  async onNodeInit({ zclNode }: { zclNode: any }) {
    this.log('ZG-222Z device initialized');

    this.log('Available endpoints:', Object.keys(zclNode.endpoints));
    for (const [endpointId, endpoint] of Object.entries(zclNode.endpoints)) {
      this.log(`Endpoint ${endpointId} clusters:`, Object.keys((endpoint as any).clusters));
    }

    const endpoint = zclNode.endpoints[1];
    if (!endpoint) {
      this.error('Endpoint 1 not found');
      return;
    }

    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        },
      },
    });

    this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION);

    zclNode.endpoints[1].bind(CLUSTER.IAS_ZONE.NAME, new IASZoneBoundCluster(this));
    this.log('Bound IAS Zone cluster for status notifications');

    await this.configureIASZone(endpoint).catch(this.error);

    const isSleepy = this.isDeviceSleepy();
    this.log(`Device is ${isSleepy ? 'sleepy (battery-powered)' : 'always-on'}`);
  }

  private async configureIASZone(endpoint: any): Promise<void> {
    const iasZoneCluster = endpoint.clusters[CLUSTER.IAS_ZONE.NAME];
    if (!iasZoneCluster) {
      this.log('IAS Zone cluster not available for configuration');
      return;
    }

    try {
      const attrs = await iasZoneCluster.readAttributes(['zoneState', 'zoneType', 'zoneStatus']);
      this.log('IAS Zone attributes:', JSON.stringify(attrs));

      if (attrs.zoneStatus) {
        this.onZoneStatusChange(attrs.zoneStatus);
      }
    } catch (err) {
      this.log('Could not read IAS Zone attributes (device may be sleeping):', err);
    }
  }

  onZoneStatusChange(zoneStatus: Record<string, boolean>) {
    this.log('Processing zone status:', JSON.stringify(zoneStatus));

    const waterLeak = zoneStatus.alarm1 === true;
    this.log(`Water leak: ${waterLeak}`);
    if (this.hasCapability('alarm_water')) {
      this.setCapabilityValue('alarm_water', waterLeak).catch(this.error);
    }

    const tamper = zoneStatus.tamper === true;
    this.log(`Tamper: ${tamper}`);
    if (this.hasCapability('alarm_tamper')) {
      this.setCapabilityValue('alarm_tamper', tamper).catch(this.error);
    }

    const batteryLow = zoneStatus.battery === true;
    this.log(`Battery low: ${batteryLow}`);
    if (this.hasCapability('alarm_battery')) {
      this.setCapabilityValue('alarm_battery', batteryLow).catch(this.error);
    }

    this.setAvailable().catch(this.error);
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
  }

  private isDeviceSleepy(): boolean {
    return (this as any).node?.receiveWhenIdle === false;
  }

  async onDeleted() {
    this.log('ZG-222Z device deleted');
  }

};
