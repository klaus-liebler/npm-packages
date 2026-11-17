import { sensact } from "@generated/wsprotocol_ts/ws-protocol"
import { ApplicationId } from "@generated/sensact_applicationids/applicationIds";
export interface ISensactContext{
	SendCommandMessage(id: ApplicationId, cmd: sensact.Command, payload: DataView):void;
}
