import { sensact } from "@generated/wsprotocol_ts/ws-protocol"
export interface ISensactContext{
	SendCommandMessage(id: sensact.ApplicationId, cmd: sensact.Command, payload: DataView):void;
}
