// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

import { AccessPoint } from '../wifimanager/access-point';


export class ResponseNetworkInformation {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):ResponseNetworkInformation {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsResponseNetworkInformation(bb:flatbuffers.ByteBuffer, obj?:ResponseNetworkInformation):ResponseNetworkInformation {
  return (obj || new ResponseNetworkInformation()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsResponseNetworkInformation(bb:flatbuffers.ByteBuffer, obj?:ResponseNetworkInformation):ResponseNetworkInformation {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new ResponseNetworkInformation()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

hostname():string|null
hostname(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
hostname(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

ssidAp():string|null
ssidAp(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
ssidAp(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

passwordAp():string|null
passwordAp(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
passwordAp(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

ipAp():number {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

isConnectedSta():boolean {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? !!this.bb!.readInt8(this.bb_pos + offset) : false;
}

ssidSta():string|null
ssidSta(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
ssidSta(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 14);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

ipSta():number {
  const offset = this.bb!.__offset(this.bb_pos, 16);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

netmaskSta():number {
  const offset = this.bb!.__offset(this.bb_pos, 18);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

gatewaySta():number {
  const offset = this.bb!.__offset(this.bb_pos, 20);
  return offset ? this.bb!.readUint32(this.bb_pos + offset) : 0;
}

rssiSta():number {
  const offset = this.bb!.__offset(this.bb_pos, 22);
  return offset ? this.bb!.readInt8(this.bb_pos + offset) : 0;
}

accesspoints(index: number, obj?:AccessPoint):AccessPoint|null {
  const offset = this.bb!.__offset(this.bb_pos, 24);
  return offset ? (obj || new AccessPoint()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

accesspointsLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 24);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startResponseNetworkInformation(builder:flatbuffers.Builder) {
  builder.startObject(11);
}

static addHostname(builder:flatbuffers.Builder, hostnameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, hostnameOffset, 0);
}

static addSsidAp(builder:flatbuffers.Builder, ssidApOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, ssidApOffset, 0);
}

static addPasswordAp(builder:flatbuffers.Builder, passwordApOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, passwordApOffset, 0);
}

static addIpAp(builder:flatbuffers.Builder, ipAp:number) {
  builder.addFieldInt32(3, ipAp, 0);
}

static addIsConnectedSta(builder:flatbuffers.Builder, isConnectedSta:boolean) {
  builder.addFieldInt8(4, +isConnectedSta, +false);
}

static addSsidSta(builder:flatbuffers.Builder, ssidStaOffset:flatbuffers.Offset) {
  builder.addFieldOffset(5, ssidStaOffset, 0);
}

static addIpSta(builder:flatbuffers.Builder, ipSta:number) {
  builder.addFieldInt32(6, ipSta, 0);
}

static addNetmaskSta(builder:flatbuffers.Builder, netmaskSta:number) {
  builder.addFieldInt32(7, netmaskSta, 0);
}

static addGatewaySta(builder:flatbuffers.Builder, gatewaySta:number) {
  builder.addFieldInt32(8, gatewaySta, 0);
}

static addRssiSta(builder:flatbuffers.Builder, rssiSta:number) {
  builder.addFieldInt8(9, rssiSta, 0);
}

static addAccesspoints(builder:flatbuffers.Builder, accesspointsOffset:flatbuffers.Offset) {
  builder.addFieldOffset(10, accesspointsOffset, 0);
}

static createAccesspointsVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startAccesspointsVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endResponseNetworkInformation(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  builder.requiredField(offset, 24) // accesspoints
  return offset;
}

static createResponseNetworkInformation(builder:flatbuffers.Builder, hostnameOffset:flatbuffers.Offset, ssidApOffset:flatbuffers.Offset, passwordApOffset:flatbuffers.Offset, ipAp:number, isConnectedSta:boolean, ssidStaOffset:flatbuffers.Offset, ipSta:number, netmaskSta:number, gatewaySta:number, rssiSta:number, accesspointsOffset:flatbuffers.Offset):flatbuffers.Offset {
  ResponseNetworkInformation.startResponseNetworkInformation(builder);
  ResponseNetworkInformation.addHostname(builder, hostnameOffset);
  ResponseNetworkInformation.addSsidAp(builder, ssidApOffset);
  ResponseNetworkInformation.addPasswordAp(builder, passwordApOffset);
  ResponseNetworkInformation.addIpAp(builder, ipAp);
  ResponseNetworkInformation.addIsConnectedSta(builder, isConnectedSta);
  ResponseNetworkInformation.addSsidSta(builder, ssidStaOffset);
  ResponseNetworkInformation.addIpSta(builder, ipSta);
  ResponseNetworkInformation.addNetmaskSta(builder, netmaskSta);
  ResponseNetworkInformation.addGatewaySta(builder, gatewaySta);
  ResponseNetworkInformation.addRssiSta(builder, rssiSta);
  ResponseNetworkInformation.addAccesspoints(builder, accesspointsOffset);
  return ResponseNetworkInformation.endResponseNetworkInformation(builder);
}
}
