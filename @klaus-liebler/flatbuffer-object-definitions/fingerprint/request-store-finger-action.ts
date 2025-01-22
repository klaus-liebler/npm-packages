// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

export class RequestStoreFingerAction {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):RequestStoreFingerAction {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsRequestStoreFingerAction(bb:flatbuffers.ByteBuffer, obj?:RequestStoreFingerAction):RequestStoreFingerAction {
  return (obj || new RequestStoreFingerAction()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsRequestStoreFingerAction(bb:flatbuffers.ByteBuffer, obj?:RequestStoreFingerAction):RequestStoreFingerAction {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new RequestStoreFingerAction()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

fingerIndex():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint16(this.bb_pos + offset) : 0;
}

actionIndex():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint16(this.bb_pos + offset) : 0;
}

static startRequestStoreFingerAction(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addFingerIndex(builder:flatbuffers.Builder, fingerIndex:number) {
  builder.addFieldInt16(0, fingerIndex, 0);
}

static addActionIndex(builder:flatbuffers.Builder, actionIndex:number) {
  builder.addFieldInt16(1, actionIndex, 0);
}

static endRequestStoreFingerAction(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRequestStoreFingerAction(builder:flatbuffers.Builder, fingerIndex:number, actionIndex:number):flatbuffers.Offset {
  RequestStoreFingerAction.startRequestStoreFingerAction(builder);
  RequestStoreFingerAction.addFingerIndex(builder, fingerIndex);
  RequestStoreFingerAction.addActionIndex(builder, actionIndex);
  return RequestStoreFingerAction.endRequestStoreFingerAction(builder);
}
}
