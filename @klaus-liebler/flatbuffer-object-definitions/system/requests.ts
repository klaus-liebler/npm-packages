// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { RequestRestart } from '../system/request-restart';
import { RequestSystemData } from '../system/request-system-data';


export enum Requests {
  NONE = 0,
  RequestRestart = 1,
  RequestSystemData = 2
}

export function unionToRequests(
  type: Requests,
  accessor: (obj:RequestRestart|RequestSystemData) => RequestRestart|RequestSystemData|null
): RequestRestart|RequestSystemData|null {
  switch(Requests[type]) {
    case 'NONE': return null; 
    case 'RequestRestart': return accessor(new RequestRestart())! as RequestRestart;
    case 'RequestSystemData': return accessor(new RequestSystemData())! as RequestSystemData;
    default: return null;
  }
}

export function unionListToRequests(
  type: Requests, 
  accessor: (index: number, obj:RequestRestart|RequestSystemData) => RequestRestart|RequestSystemData|null, 
  index: number
): RequestRestart|RequestSystemData|null {
  switch(Requests[type]) {
    case 'NONE': return null; 
    case 'RequestRestart': return accessor(index, new RequestRestart())! as RequestRestart;
    case 'RequestSystemData': return accessor(index, new RequestSystemData())! as RequestSystemData;
    default: return null;
  }
}
