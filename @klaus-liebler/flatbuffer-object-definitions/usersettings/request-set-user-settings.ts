// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

import { SettingWrapper } from '../usersettings/setting-wrapper';


export class RequestSetUserSettings {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):RequestSetUserSettings {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsRequestSetUserSettings(bb:flatbuffers.ByteBuffer, obj?:RequestSetUserSettings):RequestSetUserSettings {
  return (obj || new RequestSetUserSettings()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsRequestSetUserSettings(bb:flatbuffers.ByteBuffer, obj?:RequestSetUserSettings):RequestSetUserSettings {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new RequestSetUserSettings()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

groupKey():string|null
groupKey(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
groupKey(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

settings(index: number, obj?:SettingWrapper):SettingWrapper|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? (obj || new SettingWrapper()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

settingsLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startRequestSetUserSettings(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addGroupKey(builder:flatbuffers.Builder, groupKeyOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, groupKeyOffset, 0);
}

static addSettings(builder:flatbuffers.Builder, settingsOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, settingsOffset, 0);
}

static createSettingsVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startSettingsVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endRequestSetUserSettings(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRequestSetUserSettings(builder:flatbuffers.Builder, groupKeyOffset:flatbuffers.Offset, settingsOffset:flatbuffers.Offset):flatbuffers.Offset {
  RequestSetUserSettings.startRequestSetUserSettings(builder);
  RequestSetUserSettings.addGroupKey(builder, groupKeyOffset);
  RequestSetUserSettings.addSettings(builder, settingsOffset);
  return RequestSetUserSettings.endRequestSetUserSettings(builder);
}
}
