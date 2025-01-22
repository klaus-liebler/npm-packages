// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

export class RequestNetworkInformation {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):RequestNetworkInformation {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsRequestNetworkInformation(bb:flatbuffers.ByteBuffer, obj?:RequestNetworkInformation):RequestNetworkInformation {
  return (obj || new RequestNetworkInformation()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsRequestNetworkInformation(bb:flatbuffers.ByteBuffer, obj?:RequestNetworkInformation):RequestNetworkInformation {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new RequestNetworkInformation()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

forceNewSearch():boolean {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? !!this.bb!.readInt8(this.bb_pos + offset) : false;
}

static startRequestNetworkInformation(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addForceNewSearch(builder:flatbuffers.Builder, forceNewSearch:boolean) {
  builder.addFieldInt8(0, +forceNewSearch, +false);
}

static endRequestNetworkInformation(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRequestNetworkInformation(builder:flatbuffers.Builder, forceNewSearch:boolean):flatbuffers.Offset {
  RequestNetworkInformation.startRequestNetworkInformation(builder);
  RequestNetworkInformation.addForceNewSearch(builder, forceNewSearch);
  return RequestNetworkInformation.endRequestNetworkInformation(builder);
}
}
