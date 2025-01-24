// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

export class RequestChat {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):RequestChat {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsRequestChat(bb:flatbuffers.ByteBuffer, obj?:RequestChat):RequestChat {
  return (obj || new RequestChat()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsRequestChat(bb:flatbuffers.ByteBuffer, obj?:RequestChat):RequestChat {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new RequestChat()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

text():string|null
text(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
text(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startRequestChat(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addText(builder:flatbuffers.Builder, textOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, textOffset, 0);
}

static endRequestChat(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRequestChat(builder:flatbuffers.Builder, textOffset:flatbuffers.Offset):flatbuffers.Offset {
  RequestChat.startRequestChat(builder);
  RequestChat.addText(builder, textOffset);
  return RequestChat.endRequestChat(builder);
}
}
