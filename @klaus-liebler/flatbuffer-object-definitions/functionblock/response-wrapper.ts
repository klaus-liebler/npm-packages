// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

import { Responses, unionToResponses, unionListToResponses } from '../functionblock/responses';


export class ResponseWrapper {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):ResponseWrapper {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsResponseWrapper(bb:flatbuffers.ByteBuffer, obj?:ResponseWrapper):ResponseWrapper {
  return (obj || new ResponseWrapper()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsResponseWrapper(bb:flatbuffers.ByteBuffer, obj?:ResponseWrapper):ResponseWrapper {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new ResponseWrapper()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

responseType():Responses {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint8(this.bb_pos + offset) : Responses.NONE;
}

response<T extends flatbuffers.Table>(obj:any):any|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__union(obj, this.bb_pos + offset) : null;
}

static startResponseWrapper(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addResponseType(builder:flatbuffers.Builder, responseType:Responses) {
  builder.addFieldInt8(0, responseType, Responses.NONE);
}

static addResponse(builder:flatbuffers.Builder, responseOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, responseOffset, 0);
}

static endResponseWrapper(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createResponseWrapper(builder:flatbuffers.Builder, responseType:Responses, responseOffset:flatbuffers.Offset):flatbuffers.Offset {
  ResponseWrapper.startResponseWrapper(builder);
  ResponseWrapper.addResponseType(builder, responseType);
  ResponseWrapper.addResponse(builder, responseOffset);
  return ResponseWrapper.endResponseWrapper(builder);
}
}
