// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

export class RequestFingerprintSensorInfo {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):RequestFingerprintSensorInfo {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsRequestFingerprintSensorInfo(bb:flatbuffers.ByteBuffer, obj?:RequestFingerprintSensorInfo):RequestFingerprintSensorInfo {
  return (obj || new RequestFingerprintSensorInfo()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsRequestFingerprintSensorInfo(bb:flatbuffers.ByteBuffer, obj?:RequestFingerprintSensorInfo):RequestFingerprintSensorInfo {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new RequestFingerprintSensorInfo()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static startRequestFingerprintSensorInfo(builder:flatbuffers.Builder) {
  builder.startObject(0);
}

static endRequestFingerprintSensorInfo(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRequestFingerprintSensorInfo(builder:flatbuffers.Builder):flatbuffers.Offset {
  RequestFingerprintSensorInfo.startRequestFingerprintSensorInfo(builder);
  return RequestFingerprintSensorInfo.endRequestFingerprintSensorInfo(builder);
}
}
