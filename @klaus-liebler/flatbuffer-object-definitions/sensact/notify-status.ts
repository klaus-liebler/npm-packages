// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

import { ApplicationId } from '../application-id';


export class NotifyStatus {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):NotifyStatus {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsNotifyStatus(bb:flatbuffers.ByteBuffer, obj?:NotifyStatus):NotifyStatus {
  return (obj || new NotifyStatus()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsNotifyStatus(bb:flatbuffers.ByteBuffer, obj?:NotifyStatus):NotifyStatus {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new NotifyStatus()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

id():ApplicationId {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint16(this.bb_pos + offset) : ApplicationId.MASTER;
}

status():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

static startNotifyStatus(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addId(builder:flatbuffers.Builder, id:ApplicationId) {
  builder.addFieldInt16(0, id, ApplicationId.MASTER);
}

static addStatus(builder:flatbuffers.Builder, status:number) {
  builder.addFieldInt32(1, status, 0);
}

static endNotifyStatus(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createNotifyStatus(builder:flatbuffers.Builder, id:ApplicationId, status:number):flatbuffers.Offset {
  NotifyStatus.startNotifyStatus(builder);
  NotifyStatus.addId(builder, id);
  NotifyStatus.addStatus(builder, status);
  return NotifyStatus.endNotifyStatus(builder);
}
}