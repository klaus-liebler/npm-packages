import { html } from "lit-html";
import { journal } from "@generated/wsprotocol_ts/ws-protocol";

import { ScreenController } from "./screen_controller";
import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { zzfx } from "../zzfx";
import { MyFavouriteDateTimeFormat } from "@klaus-liebler/commons";

export class JournalController extends ScreenController {

    private tblLogs:Ref<HTMLTableSectionElement> = createRef();

    public OnCreate(): void {
        this.appManagement.RegisterNamespace(this, journal.NAMESPACE_ID)
    }
    protected OnFirstStart(): void {
        this.sendRequestJournal();
    }
    protected OnRestart(): void {
        this.sendRequestJournal();
    }
    OnPause(): void {

    }


    public OnMessage(namespaceId: number, messageTypeId: number, view: DataView): void {
        if(namespaceId!=journal.NAMESPACE_ID){
            console.error(`journal controller namespace problem: ${namespaceId}!=${journal.NAMESPACE_ID}`)
            return;
        }
        if(messageTypeId!=journal.ResponseJournal.TYPE_ID) return;
        zzfx(...[,,80,.3,.4,.7,2,.1,-0.73,3.42,-430,.09,.17,,,,.19]);
        let res = journal.ResponseJournal.decode(view, 0);
        this.tblLogs.value!.innerText="";
        for (const item of res.journalItems) {
            var row = this.tblLogs.value!.insertRow();
            let secondsEpoch = item.lastMessageTimestamp;
            if (secondsEpoch > 1684412222){//this magic second is when I first wrote this code
                row.insertCell().textContent = new Date(1000*secondsEpoch).toLocaleString("de-DE", MyFavouriteDateTimeFormat);
            }else{
                row.insertCell().textContent=secondsEpoch.toString();
            }

            row.insertCell().textContent = item.messageCode.toString();
            row.insertCell().textContent = item.messageString;
            row.insertCell().textContent = item.messageData.toString();
            row.insertCell().textContent = item.messageCount.toString();
        }
    }



    sendRequestJournal(){
        const bytes = journal.RequestJournal.encode({ requestId: 0 });
        this.appManagement.SendFrame(journal.NAMESPACE_ID, bytes);
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
