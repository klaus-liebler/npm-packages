
import * as canmonitor from "@generated/flatbuffers_ts/canmonitor"
import * as sensact from "@generated/flatbuffers_ts/sensact"
import { uint8Array2HexString } from "@klaus-liebler/commons";

export function canMessage2HexString(d: canmonitor.NotifyCanMessage) {
	var s = "";
	for (let index = 0; index < d.dataLen(); index++) {
		var xx = d.data()!.data(index)!.toString(16);
		if (xx.length == 1) s += "0" + xx;
		else s += xx;
	}
	return s;
}

export const  MessageTypeMask=0x1F000000;

export class cCANMessageBuilderParserOld{

    public ParseApplicationCommandMessageId(m:canmonitor.NotifyCanMessage)
    {
        var ret={destinationAppId:0, commandId:0}
        ret.destinationAppId = ((m.messageId() & 0x3FF));
        ret.commandId = m.data()!.data(0)!;
        return ret;
    }

    public TraceCommandMessage(m:canmonitor.NotifyCanMessage){

        //assert that it is really a command message
        var type = (m.messageId() & MessageTypeMask);   
        if(type!=0){
            console.error(`There is a message with id 0x${m.messageId().toString(16)} which is not allowed`);
        }
        var dc=this.ParseApplicationCommandMessageId(m);
        var payloadLen=m.dataLen()-1;
        var arr:Uint8Array= new Uint8Array(8);
        for(var i=0; i<payloadLen;i++){
            arr[i]=m.data()?.data(i)!;
        }
        var s= `ApplicationCommand (old CAN-ID) to id 0x${dc.destinationAppId.toString(16)} (${sensact.ApplicationId[dc.destinationAppId]}); command:0x${dc.commandId.toString(16)} (${sensact.Command[dc.commandId]}); len:${payloadLen}; payload: 0x${uint8Array2HexString(arr)}`
        console.log(s);
        return s;

    }
}