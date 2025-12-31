'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { decodeTuyaDpValuesFromZclFrame } = require('../.homeybuild/lib/tuyaFrame');

test('decodeTuyaDpValuesFromZclFrame parses manufacturer-specific ZCL header and multiple DPs', () => {
  // ZCL header: frameControl + manufCode(2) + seq + cmd
  // Use manufacturer-specific + cluster-specific frame control (0x04 + 0x01)
  const frameControl = 0x05;
  const manufCodeLE = Buffer.from([0x11, 0x22]);
  const seq = 0x01;
  const cmd = 0x02;

  // Tuya payload: status + transid + [dp,type,lenBE,data]...
  const status = 0x00;
  const transid = 0x10;

  const dpSoil = 107; // 0x6B
  const dpTemp = 101; // 0x65
  const typeValue = 0x02;

  const soilData = Buffer.from([0x00, 0x00, 0x00, 0x36]); // 54
  const tempData = Buffer.from([0x00, 0x00, 0x00, 0xfd]); // 253 => 25.3°C

  const entry = (dp, data) => Buffer.concat([
    Buffer.from([dp, typeValue]),
    Buffer.from([0x00, data.length]),
    data,
  ]);

  const frame = Buffer.concat([
    Buffer.from([frameControl]),
    manufCodeLE,
    Buffer.from([seq, cmd, status, transid]),
    entry(dpSoil, soilData),
    entry(dpTemp, tempData),
  ]);

  const decoded = decodeTuyaDpValuesFromZclFrame(frame);
  assert.equal(decoded.zclHeaderLength, 5);
  assert.equal(decoded.commandId, cmd);
  assert.equal(decoded.status, status);
  assert.equal(decoded.transid, transid);
  assert.equal(decoded.dpValues.length, 2);

  assert.deepEqual(decoded.dpValues[0], { dp: dpSoil, datatype: typeValue, data: soilData });
  assert.deepEqual(decoded.dpValues[1], { dp: dpTemp, datatype: typeValue, data: tempData });
});
