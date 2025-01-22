// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

export class StringSetting {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):StringSetting {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsStringSetting(bb:flatbuffers.ByteBuffer, obj?:StringSetting):StringSetting {
  return (obj || new StringSetting()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsStringSetting(bb:flatbuffers.ByteBuffer, obj?:StringSetting):StringSetting {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new StringSetting()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

value():string|null
value(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
value(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startStringSetting(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addValue(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, valueOffset, 0);
}

static endStringSetting(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createStringSetting(builder:flatbuffers.Builder, valueOffset:flatbuffers.Offset):flatbuffers.Offset {
  StringSetting.startStringSetting(builder);
  StringSetting.addValue(builder, valueOffset);
  return StringSetting.endStringSetting(builder);
}
}
