'use strict';

export type TuyaDpValue = {
  dp: number;
  datatype: number;
  data: Buffer;
};

export type DecodedTuyaFrame = {
  zclHeaderLength: number;
  commandId: number;
  status?: number;
  transid?: number;
  dpValues: TuyaDpValue[];
};

function readZclHeaderLength(frame: Buffer): number {
  if (frame.length < 3) return 0;
  const frameControl = frame.readUInt8(0);
  const manufacturerSpecific = (frameControl & 0x04) !== 0;
  // ZCL header: frameControl(1) + [manufCode(2)] + seq(1) + cmd(1)
  return manufacturerSpecific ? 5 : 3;
}

/**
 * Decode a Tuya 0xEF00 ZCL frame into datapoint values.
 *
 * Supports the common Tuya payload layout:
 *   [status:1][transid:1][dp:1][datatype:1][len:2][data:len]...
 *
 * Notes:
 * - Tuya uses big-endian for the length field.
 * - Some frames contain multiple dp entries after a single status/transid.
 */
export function decodeTuyaDpValuesFromZclFrame(frame: Buffer): DecodedTuyaFrame {
  const headerLen = readZclHeaderLength(frame);
  if (headerLen === 0 || frame.length < headerLen) {
    return { zclHeaderLength: 0, commandId: 0, dpValues: [] };
  }

  const commandId = frame.readUInt8(headerLen - 1);
  let offset = headerLen;

  if (frame.length - offset < 2) {
    return { zclHeaderLength: headerLen, commandId, dpValues: [] };
  }

  const status = frame.readUInt8(offset);
  const transid = frame.readUInt8(offset + 1);
  offset += 2;

  const dpValues: TuyaDpValue[] = [];

  while (frame.length - offset >= 4) {
    const dp = frame.readUInt8(offset);
    const datatype = frame.readUInt8(offset + 1);
    const len = frame.readUInt16BE(offset + 2);
    offset += 4;

    if (len < 0 || frame.length - offset < len) break;

    const data = frame.subarray(offset, offset + len);
    offset += len;

    dpValues.push({ dp, datatype, data });
  }

  return {
    zclHeaderLength: headerLen,
    commandId,
    status,
    transid,
    dpValues,
  };
}
