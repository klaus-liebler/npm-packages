import { html } from "lit-html";
import { NotifyCanMessage, Namespace} from "@generated/flatbuffers_ts/canmonitor";
import {common} from "@klaus-liebler/web-components";
import { ScreenController } from "@klaus-liebler/web-components";
import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { cCANMessageBuilderParserOld } from "./sensact.ts";
import { ByteBuffer } from "flatbuffers";
import { IAppManagement } from "@klaus-liebler/web-components/typescript/utils/interfaces.ts";

function uint8Array2HexString(d: NotifyCanMessage) {
	var s = "";
	for (let index = 0; index < d.dataLen(); index++) {
		var xx = d.data()!.data(index)!.toString(16);
		if (xx.length == 1) s += "0" + xx;
		else s += xx;
	}
	return s;
}

export class CanMonitorScreenController extends ScreenController {

	private tblCanMessages: Ref<HTMLTableSectionElement> = createRef();
	private parser = new cCANMessageBuilderParserOld();

	constructor(appManagement: IAppManagement) {
		super(appManagement)
	}

	OnMessage(namespace:number, bb: ByteBuffer): void {
		if(namespace!=Namespace.Value) return;
		let d = NotifyCanMessage.getRootAsNotifyCanMessage(bb)

		
		this.parser.TraceCommandMessage(d);

		if (!this.tblCanMessages.value) return;
		var t = this.tblCanMessages.value
		if (t.rows.length > 100) {
			t.deleteRow(-1);
		}
		var row = t.insertRow(0);
		row.insertCell().textContent = new Date().toLocaleString("de-DE", common.MyFavouriteDateTimeFormat);
		row.insertCell().textContent = d.messageId().toString(16);
		row.insertCell().textContent = uint8Array2HexString(d);
		row.insertCell().textContent = d.dataLen.toString();
		row.insertCell().textContent = d.dataLen.toString();
	}

	OnCreate(): void {
		this.appManagement.RegisterWebsocketMessageNamespace(this, Namespace.Value);

	}
	OnFirstStart(): void {

	}
	OnRestart(): void {

	}
	OnPause(): void {
	}

	public Template = () => html`
    <table>
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>MessageId</th>
                <th>Data</th>
                <th>Data Len [byte]</th>
				<th>Parsed Data</th>
            </tr>
        </thead>
        <tbody ${ref(this.tblCanMessages)}></tbody>
    </table>`
}
