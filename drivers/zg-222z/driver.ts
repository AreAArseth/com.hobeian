'use strict';

import { ZigBeeDriver } from 'homey-zigbeedriver';

module.exports = class ZG222ZDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZG-222Z Driver has been initialized');
  }

};
