import * as fb from "@generated/flatbuffers_ts/sensact"
export interface ISensactContext{
	SendCommandMessage(id: fb.ApplicationId, cmd: fb.Command, payload: DataView);
}

