// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { RequestNetworkInformation } from '../wifimanager/request-network-information';
import { RequestWifiConnect } from '../wifimanager/request-wifi-connect';
import { RequestWifiDisconnect } from '../wifimanager/request-wifi-disconnect';


export enum Requests {
  NONE = 0,
  RequestNetworkInformation = 1,
  RequestWifiConnect = 2,
  RequestWifiDisconnect = 3
}

export function unionToRequests(
  type: Requests,
  accessor: (obj:RequestNetworkInformation|RequestWifiConnect|RequestWifiDisconnect) => RequestNetworkInformation|RequestWifiConnect|RequestWifiDisconnect|null
): RequestNetworkInformation|RequestWifiConnect|RequestWifiDisconnect|null {
  switch(Requests[type]) {
    case 'NONE': return null; 
    case 'RequestNetworkInformation': return accessor(new RequestNetworkInformation())! as RequestNetworkInformation;
    case 'RequestWifiConnect': return accessor(new RequestWifiConnect())! as RequestWifiConnect;
    case 'RequestWifiDisconnect': return accessor(new RequestWifiDisconnect())! as RequestWifiDisconnect;
    default: return null;
  }
}

export function unionListToRequests(
  type: Requests, 
  accessor: (index: number, obj:RequestNetworkInformation|RequestWifiConnect|RequestWifiDisconnect) => RequestNetworkInformation|RequestWifiConnect|RequestWifiDisconnect|null, 
  index: number
): RequestNetworkInformation|RequestWifiConnect|RequestWifiDisconnect|null {
  switch(Requests[type]) {
    case 'NONE': return null; 
    case 'RequestNetworkInformation': return accessor(index, new RequestNetworkInformation())! as RequestNetworkInformation;
    case 'RequestWifiConnect': return accessor(index, new RequestWifiConnect())! as RequestWifiConnect;
    case 'RequestWifiDisconnect': return accessor(index, new RequestWifiDisconnect())! as RequestWifiDisconnect;
    default: return null;
  }
}
