// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { ResponseChat } from '../chatbot/response-chat';


export enum Responses {
  NONE = 0,
  ResponseChat = 1
}

export function unionToResponses(
  type: Responses,
  accessor: (obj:ResponseChat) => ResponseChat|null
): ResponseChat|null {
  switch(Responses[type]) {
    case 'NONE': return null; 
    case 'ResponseChat': return accessor(new ResponseChat())! as ResponseChat;
    default: return null;
  }
}

export function unionListToResponses(
  type: Responses, 
  accessor: (index: number, obj:ResponseChat) => ResponseChat|null, 
  index: number
): ResponseChat|null {
  switch(Responses[type]) {
    case 'NONE': return null; 
    case 'ResponseChat': return accessor(index, new ResponseChat())! as ResponseChat;
    default: return null;
  }
}