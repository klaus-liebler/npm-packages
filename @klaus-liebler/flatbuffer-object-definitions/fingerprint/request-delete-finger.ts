// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

export class RequestDeleteFinger {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):RequestDeleteFinger {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsRequestDeleteFinger(bb:flatbuffers.ByteBuffer, obj?:RequestDeleteFinger):RequestDeleteFinger {
  return (obj || new RequestDeleteFinger()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsRequestDeleteFinger(bb:flatbuffers.ByteBuffer, obj?:RequestDeleteFinger):RequestDeleteFinger {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new RequestDeleteFinger()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startRequestDeleteFinger(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, nameOffset, 0);
}

static endRequestDeleteFinger(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRequestDeleteFinger(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset):flatbuffers.Offset {
  RequestDeleteFinger.startRequestDeleteFinger(builder);
  RequestDeleteFinger.addName(builder, nameOffset);
  return RequestDeleteFinger.endRequestDeleteFinger(builder);
}
}