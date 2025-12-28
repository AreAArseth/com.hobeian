'use strict';

import { ZigBeeDriver } from 'homey-zigbeedriver';

module.exports = class ZG303ZDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZG-303Z Driver has been initialized');
  }

}
