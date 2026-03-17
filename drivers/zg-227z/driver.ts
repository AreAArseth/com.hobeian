'use strict';

import { ZigBeeDriver } from 'homey-zigbeedriver';

module.exports = class ZG227ZDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZG-227Z Driver has been initialized');
  }

};
