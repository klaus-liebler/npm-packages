// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

import { ApplicationId } from '../application-id';


export class RequestStatus {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):RequestStatus {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsRequestStatus(bb:flatbuffers.ByteBuffer, obj?:RequestStatus):RequestStatus {
  return (obj || new RequestStatus()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsRequestStatus(bb:flatbuffers.ByteBuffer, obj?:RequestStatus):RequestStatus {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new RequestStatus()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

ids(index: number):ApplicationId|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint16(this.bb!.__vector(this.bb_pos + offset) + index * 2) : 0;
}

idsLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

idsArray():Uint16Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? new Uint16Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

static startRequestStatus(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addIds(builder:flatbuffers.Builder, idsOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, idsOffset, 0);
}

static createIdsVector(builder:flatbuffers.Builder, data:ApplicationId[]):flatbuffers.Offset {
  builder.startVector(2, data.length, 2);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt16(data[i]!);
  }
  return builder.endVector();
}

static startIdsVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(2, numElems, 2);
}

static endRequestStatus(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRequestStatus(builder:flatbuffers.Builder, idsOffset:flatbuffers.Offset):flatbuffers.Offset {
  RequestStatus.startRequestStatus(builder);
  RequestStatus.addIds(builder, idsOffset);
  return RequestStatus.endRequestStatus(builder);
}
}