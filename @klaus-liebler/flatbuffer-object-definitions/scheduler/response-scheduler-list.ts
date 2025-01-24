// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

import { ResponseSchedulerListItem } from '../scheduler/response-scheduler-list-item';


export class ResponseSchedulerList {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):ResponseSchedulerList {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsResponseSchedulerList(bb:flatbuffers.ByteBuffer, obj?:ResponseSchedulerList):ResponseSchedulerList {
  return (obj || new ResponseSchedulerList()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsResponseSchedulerList(bb:flatbuffers.ByteBuffer, obj?:ResponseSchedulerList):ResponseSchedulerList {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new ResponseSchedulerList()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

items(index: number, obj?:ResponseSchedulerListItem):ResponseSchedulerListItem|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new ResponseSchedulerListItem()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

itemsLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startResponseSchedulerList(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addItems(builder:flatbuffers.Builder, itemsOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, itemsOffset, 0);
}

static createItemsVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startItemsVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endResponseSchedulerList(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createResponseSchedulerList(builder:flatbuffers.Builder, itemsOffset:flatbuffers.Offset):flatbuffers.Offset {
  ResponseSchedulerList.startResponseSchedulerList(builder);
  ResponseSchedulerList.addItems(builder, itemsOffset);
  return ResponseSchedulerList.endResponseSchedulerList(builder);
}
}
