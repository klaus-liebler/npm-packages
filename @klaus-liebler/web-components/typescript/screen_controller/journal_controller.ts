import { html } from "lit-html";
import { ResponseWrapper, ResponseJournal, RequestJournal, RequestWrapper, Requests, Responses, Namespace } from "@generated/flatbuffers_ts/journal";
import { MyFavouriteDateTimeFormat } from "../utils/common";
import { ScreenController } from "./screen_controller";
import * as flatbuffers from "flatbuffers"
import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { zzfx } from "../zzfx"; 

export class JournalController extends ScreenController {

    private tblLogs:Ref<HTMLTableSectionElement> = createRef();

    public OnCreate(): void {
        this.appManagement.RegisterWebsocketMessageNamespace(this, Namespace.Value)
    }
    protected OnFirstStart(): void {
        this.sendRequestJournal();
    }
    protected OnRestart(): void {
        this.sendRequestJournal();
    }
    OnPause(): void {
        
    }


    public OnMessage(namespace: number, bb: flatbuffers.ByteBuffer): void {
        if(namespace!=Namespace.Value){
            console.error(`journal controller namespace problem: ${namespace}!=${Namespace.Value}`)
            return;
        }
        zzfx(...[,,80,.3,.4,.7,2,.1,-0.73,3.42,-430,.09,.17,,,,.19]);
        let messageWrapper = ResponseWrapper.getRootAsResponseWrapper(bb);
        let res = <ResponseJournal>messageWrapper.response(new ResponseJournal());
        this.tblLogs.value!.innerText="";
        for (let i = 0; i < res.journalItemsLength(); i++) {
            let item = res.journalItems(i);
            if(!item)return;
            var row = this.tblLogs.value!.insertRow();
            let secondsEpoch = item.lastMessageTimestamp()!;
            if (secondsEpoch > 1684412222){//this magic second is when I first wrote this code
                row.insertCell().textContent = new Date(1000*Number(secondsEpoch)).toLocaleString("de-DE", MyFavouriteDateTimeFormat);;
            }else{
                row.insertCell().textContent=secondsEpoch.toString();
            }
          
            row.insertCell().textContent = item.messageCode().toString();
            row.insertCell().textContent = item.messageString();
            row.insertCell().textContent = item.messageData().toString();
            row.insertCell().textContent = item.messageCount().toString();
        }
    }

    

    sendRequestJournal(){
        let b = new flatbuffers.Builder(1024);
        b.finish(RequestWrapper.createRequestWrapper(b,Requests.RequestJournal, RequestJournal.createRequestJournal(b)));
        this.appManagement.SendFinishedBuilder(Namespace.Value, b);
    }

    public Template =()=> html`<div><input @click=${()=>this.sendRequestJournal()} type="button" value=" ⟳ Update" /></div>
    <table>
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>Code</th>
                <th>Description</th>
                <th>Last Message Data</th>
                <th>Count</th>
            </tr>
        </thead>
        <tbody ${ref(this.tblLogs)}></tbody>
    </table>` 

}
