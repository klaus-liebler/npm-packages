// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

export class Uint8x32 {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):Uint8x32 {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

v(index: number):number|null {
    return this.bb!.readUint8(this.bb_pos + 0 + index);
}

static sizeOf():number {
  return 32;
}

static createUint8x32(builder:flatbuffers.Builder, v: number[]|null):flatbuffers.Offset {
  builder.prep(1, 32);

  for (let i = 31; i >= 0; --i) {
    builder.writeInt8((v?.[i] ?? 0));

  }

  return builder.offset();
}

}