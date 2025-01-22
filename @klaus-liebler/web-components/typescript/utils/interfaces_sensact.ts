import * as flatbuffers from "flatbuffers";
import { Requests, Responses } from "@klaus-liebler/flatbuffer-object-definitions/sensact";

export interface ISensactContext{
    WrapAndFinishAndSend(b:flatbuffers.Builder, message_type:Requests,  message:flatbuffers.Offset, messagesToUnlock?: Array<Responses>, maxWaitingTimeMs?: number);
  }