declare module 'homey-zigbeedriver' {
  import Homey from 'homey';
  
  export class ZigBeeDriver extends Homey.Driver {
    log(...args: any[]): void;
    error(...args: any[]): void;
  }

  export class ZigBeeDevice extends Homey.Device {
    zclNode: any;
    log(...args: any[]): void;
    error(...args: any[]): void;
    getSetting(key: string): any;
    setCapabilityValue(capability: string, value: any): Promise<void>;
    onNodeInit(options: { zclNode: any }): Promise<void>;
  }

  export const CLUSTER: any;
}

