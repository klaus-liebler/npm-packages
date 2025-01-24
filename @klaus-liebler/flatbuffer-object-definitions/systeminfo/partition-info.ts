// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

export class PartitionInfo {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):PartitionInfo {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsPartitionInfo(bb:flatbuffers.ByteBuffer, obj?:PartitionInfo):PartitionInfo {
  return (obj || new PartitionInfo()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsPartitionInfo(bb:flatbuffers.ByteBuffer, obj?:PartitionInfo):PartitionInfo {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new PartitionInfo()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

label():string|null
label(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
label(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

type():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readUint8(this.bb_pos + offset) : 0;
}

subtype():number {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.readUint8(this.bb_pos + offset) : 0;
}

size():number {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

otaState():number {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.readInt8(this.bb_pos + offset) : 0;
}

running():boolean {
  const offset = this.bb!.__offset(this.bb_pos, 14);
  return offset ? !!this.bb!.readInt8(this.bb_pos + offset) : false;
}

appName():string|null
appName(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
appName(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 16);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

appVersion():string|null
appVersion(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
appVersion(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 18);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

appDate():string|null
appDate(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
appDate(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 20);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

appTime():string|null
appTime(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
appTime(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 22);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startPartitionInfo(builder:flatbuffers.Builder) {
  builder.startObject(10);
}

static addLabel(builder:flatbuffers.Builder, labelOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, labelOffset, 0);
}

static addType(builder:flatbuffers.Builder, type:number) {
  builder.addFieldInt8(1, type, 0);
}

static addSubtype(builder:flatbuffers.Builder, subtype:number) {
  builder.addFieldInt8(2, subtype, 0);
}

static addSize(builder:flatbuffers.Builder, size:number) {
  builder.addFieldInt32(3, size, 0);
}

static addOtaState(builder:flatbuffers.Builder, otaState:number) {
  builder.addFieldInt8(4, otaState, 0);
}

static addRunning(builder:flatbuffers.Builder, running:boolean) {
  builder.addFieldInt8(5, +running, +false);
}

static addAppName(builder:flatbuffers.Builder, appNameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(6, appNameOffset, 0);
}

static addAppVersion(builder:flatbuffers.Builder, appVersionOffset:flatbuffers.Offset) {
  builder.addFieldOffset(7, appVersionOffset, 0);
}

static addAppDate(builder:flatbuffers.Builder, appDateOffset:flatbuffers.Offset) {
  builder.addFieldOffset(8, appDateOffset, 0);
}

static addAppTime(builder:flatbuffers.Builder, appTimeOffset:flatbuffers.Offset) {
  builder.addFieldOffset(9, appTimeOffset, 0);
}

static endPartitionInfo(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createPartitionInfo(builder:flatbuffers.Builder, labelOffset:flatbuffers.Offset, type:number, subtype:number, size:number, otaState:number, running:boolean, appNameOffset:flatbuffers.Offset, appVersionOffset:flatbuffers.Offset, appDateOffset:flatbuffers.Offset, appTimeOffset:flatbuffers.Offset):flatbuffers.Offset {
  PartitionInfo.startPartitionInfo(builder);
  PartitionInfo.addLabel(builder, labelOffset);
  PartitionInfo.addType(builder, type);
  PartitionInfo.addSubtype(builder, subtype);
  PartitionInfo.addSize(builder, size);
  PartitionInfo.addOtaState(builder, otaState);
  PartitionInfo.addRunning(builder, running);
  PartitionInfo.addAppName(builder, appNameOffset);
  PartitionInfo.addAppVersion(builder, appVersionOffset);
  PartitionInfo.addAppDate(builder, appDateOffset);
  PartitionInfo.addAppTime(builder, appTimeOffset);
  return PartitionInfo.endPartitionInfo(builder);
}
}
