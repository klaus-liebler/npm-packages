// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

export class EnumSetting {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):EnumSetting {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsEnumSetting(bb:flatbuffers.ByteBuffer, obj?:EnumSetting):EnumSetting {
  return (obj || new EnumSetting()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsEnumSetting(bb:flatbuffers.ByteBuffer, obj?:EnumSetting):EnumSetting {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new EnumSetting()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

value():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readInt32(this.bb_pos + offset) : 0;
}

static startEnumSetting(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addValue(builder:flatbuffers.Builder, value:number) {
  builder.addFieldInt32(0, value, 0);
}

static endEnumSetting(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createEnumSetting(builder:flatbuffers.Builder, value:number):flatbuffers.Offset {
  EnumSetting.startEnumSetting(builder);
  EnumSetting.addValue(builder, value);
  return EnumSetting.endEnumSetting(builder);
}
}
