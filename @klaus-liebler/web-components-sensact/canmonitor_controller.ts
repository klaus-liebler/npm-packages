import { html } from "lit-html";
import { canmonitor } from "@generated/wsprotocol_ts/ws-protocol";
import { ScreenController } from "@klaus-liebler/web-components";
import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { IAppManagement } from "@klaus-liebler/web-components/typescript/utils/interfaces.ts";
import { canMessage2HexString, cCANMessageBuilderParserOld } from "@klaus-liebler/sensact-base/can_message_utils";
import { MyFavouriteDateTimeFormat } from "@klaus-liebler/commons";



export class CanMonitorScreenController extends ScreenController {

	private tblCanMessages: Ref<HTMLTableSectionElement> = createRef();
	private parser = new cCANMessageBuilderParserOld();

	constructor(appManagement: IAppManagement) {
		super(appManagement)
	}

	OnMessage(namespaceId:number, messageTypeId: number, view: DataView): void {
		if(namespaceId!=canmonitor.NAMESPACE_ID) return;
		if(messageTypeId!=canmonitor.NotifyCanMessage.TYPE_ID) return;
		let d = canmonitor.NotifyCanMessage.decode(view, 0)


		var description = this.parser.TraceCommandMessage(d);

		if (!this.tblCanMessages.value) return;
		var t = this.tblCanMessages.value
		if (t.rows.length > 100) {
			t.deleteRow(-1);
		}
		var row = t.insertRow(0);
		row.insertCell().textContent = new Date().toLocaleString("de-DE", MyFavouriteDateTimeFormat);
		row.insertCell().textContent = `0x${d.messageId.toString(16)}`;
		row.insertCell().textContent = `0x${canMessage2HexString(d)}`;
		row.insertCell().textContent = d.dataLen.toString();
		row.insertCell().textContent = description;
	}

	OnCreate(): void {
		this.appManagement.RegisterNamespace(this, canmonitor.NAMESPACE_ID);

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
                <th>MessageId [0x]</th>
                <th>Data [0x]</th>
                <th>Data Len [byte]</th>
				<th>Parsed Data</th>
            </tr>
        </thead>
        <tbody ${ref(this.tblCanMessages)}></tbody>
    </table>`
}
