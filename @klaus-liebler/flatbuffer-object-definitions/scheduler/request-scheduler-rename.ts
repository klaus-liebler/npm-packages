// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

export class RequestSchedulerRename {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):RequestSchedulerRename {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsRequestSchedulerRename(bb:flatbuffers.ByteBuffer, obj?:RequestSchedulerRename):RequestSchedulerRename {
  return (obj || new RequestSchedulerRename()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsRequestSchedulerRename(bb:flatbuffers.ByteBuffer, obj?:RequestSchedulerRename):RequestSchedulerRename {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new RequestSchedulerRename()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

oldName():string|null
oldName(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
oldName(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

newName():string|null
newName(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
newName(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startRequestSchedulerRename(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addOldName(builder:flatbuffers.Builder, oldNameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, oldNameOffset, 0);
}

static addNewName(builder:flatbuffers.Builder, newNameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, newNameOffset, 0);
}

static endRequestSchedulerRename(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRequestSchedulerRename(builder:flatbuffers.Builder, oldNameOffset:flatbuffers.Offset, newNameOffset:flatbuffers.Offset):flatbuffers.Offset {
  RequestSchedulerRename.startRequestSchedulerRename(builder);
  RequestSchedulerRename.addOldName(builder, oldNameOffset);
  RequestSchedulerRename.addNewName(builder, newNameOffset);
  return RequestSchedulerRename.endRequestSchedulerRename(builder);
}
}