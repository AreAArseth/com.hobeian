declare module 'zigbee-clusters' {
  export const CLUSTER: any;
  
  export class Cluster {
    static get ID(): number;
    static get NAME(): string;
    static get ATTRIBUTES(): any;
    static get COMMANDS(): any;
    static addCluster(cluster: typeof Cluster): void;
    
    on(event: string, callback: (...args: any[]) => void): void;
    writeCommand(command: string, args: any): Promise<any>;
    readAttributes(attributes: string[]): Promise<any>;
  }

  export class BoundCluster {
    static get ID(): number;
    static get NAME(): string;
  }

  export const ZCLDataTypes: {
    uint8: any;
    uint16: any;
    uint32: any;
    int8: any;
    int16: any;
    int32: any;
    boolean: any;
    string: any;
    buffer: any;
    Array0: any;
    map8: any;
    enum8: any;
    [key: string]: any;
  };

  export class ZCLNode {
    endpoints: { [key: string]: any };
  }
}

