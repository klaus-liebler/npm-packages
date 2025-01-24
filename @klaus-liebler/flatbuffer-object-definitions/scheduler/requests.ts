// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { RequestSchedulerDelete } from '../scheduler/request-scheduler-delete';
import { RequestSchedulerList } from '../scheduler/request-scheduler-list';
import { RequestSchedulerOpen } from '../scheduler/request-scheduler-open';
import { RequestSchedulerRename } from '../scheduler/request-scheduler-rename';
import { RequestSchedulerSave } from '../scheduler/request-scheduler-save';


export enum Requests {
  NONE = 0,
  RequestSchedulerList = 1,
  RequestSchedulerOpen = 2,
  RequestSchedulerSave = 3,
  RequestSchedulerRename = 4,
  RequestSchedulerDelete = 5
}

export function unionToRequests(
  type: Requests,
  accessor: (obj:RequestSchedulerDelete|RequestSchedulerList|RequestSchedulerOpen|RequestSchedulerRename|RequestSchedulerSave) => RequestSchedulerDelete|RequestSchedulerList|RequestSchedulerOpen|RequestSchedulerRename|RequestSchedulerSave|null
): RequestSchedulerDelete|RequestSchedulerList|RequestSchedulerOpen|RequestSchedulerRename|RequestSchedulerSave|null {
  switch(Requests[type]) {
    case 'NONE': return null; 
    case 'RequestSchedulerList': return accessor(new RequestSchedulerList())! as RequestSchedulerList;
    case 'RequestSchedulerOpen': return accessor(new RequestSchedulerOpen())! as RequestSchedulerOpen;
    case 'RequestSchedulerSave': return accessor(new RequestSchedulerSave())! as RequestSchedulerSave;
    case 'RequestSchedulerRename': return accessor(new RequestSchedulerRename())! as RequestSchedulerRename;
    case 'RequestSchedulerDelete': return accessor(new RequestSchedulerDelete())! as RequestSchedulerDelete;
    default: return null;
  }
}

export function unionListToRequests(
  type: Requests, 
  accessor: (index: number, obj:RequestSchedulerDelete|RequestSchedulerList|RequestSchedulerOpen|RequestSchedulerRename|RequestSchedulerSave) => RequestSchedulerDelete|RequestSchedulerList|RequestSchedulerOpen|RequestSchedulerRename|RequestSchedulerSave|null, 
  index: number
): RequestSchedulerDelete|RequestSchedulerList|RequestSchedulerOpen|RequestSchedulerRename|RequestSchedulerSave|null {
  switch(Requests[type]) {
    case 'NONE': return null; 
    case 'RequestSchedulerList': return accessor(index, new RequestSchedulerList())! as RequestSchedulerList;
    case 'RequestSchedulerOpen': return accessor(index, new RequestSchedulerOpen())! as RequestSchedulerOpen;
    case 'RequestSchedulerSave': return accessor(index, new RequestSchedulerSave())! as RequestSchedulerSave;
    case 'RequestSchedulerRename': return accessor(index, new RequestSchedulerRename())! as RequestSchedulerRename;
    case 'RequestSchedulerDelete': return accessor(index, new RequestSchedulerDelete())! as RequestSchedulerDelete;
    default: return null;
  }
}
