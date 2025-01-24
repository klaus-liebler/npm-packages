// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

export class ResponseCommand {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):ResponseCommand {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsResponseCommand(bb:flatbuffers.ByteBuffer, obj?:ResponseCommand):ResponseCommand {
  return (obj || new ResponseCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsResponseCommand(bb:flatbuffers.ByteBuffer, obj?:ResponseCommand):ResponseCommand {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new ResponseCommand()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static startResponseCommand(builder:flatbuffers.Builder) {
  builder.startObject(0);
}

static endResponseCommand(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createResponseCommand(builder:flatbuffers.Builder):flatbuffers.Offset {
  ResponseCommand.startResponseCommand(builder);
  return ResponseCommand.endResponseCommand(builder);
}
}
