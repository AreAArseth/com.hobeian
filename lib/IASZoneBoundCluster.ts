'use strict';

import { BoundCluster } from 'zigbee-clusters';

export default class IASZoneBoundCluster extends BoundCluster {

  private device: any;

  constructor(device: any) {
    super();
    this.device = device;
  }

  zoneStatusChangeNotification({
    zoneStatus,
  }: {
    zoneStatus: Record<string, boolean>;
    extendedStatus: number;
    zoneId: number;
    delay: number;
  }) {
    this.device.log('IAS Zone status change:', JSON.stringify(zoneStatus));
    this.device.onZoneStatusChange(zoneStatus);
  }

  zoneEnrollRequest({
    zoneType,
    manufacturerCode,
  }: {
    zoneType: string;
    manufacturerCode: number;
  }) {
    this.device.log('IAS Zone enroll request:', zoneType, 'manufacturer:', manufacturerCode);
    return { enrollResponseCode: 0, zoneId: 0 };
  }

}
