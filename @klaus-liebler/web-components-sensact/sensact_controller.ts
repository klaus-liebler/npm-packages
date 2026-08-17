import { ControllerState, ScreenController } from "@klaus-liebler/web-components";
import { TemplateResult, html, render } from "lit-html";
import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { ApplicationGroup, SensactApplication, SensactApplicationAndLocalFlag } from "./sensactapps_base";

import bed from '@klaus-liebler/svgs/solid/bed.svg?raw'
import lightbulb from '@klaus-liebler/svgs/solid/lightbulb.svg?raw'
import arrows_to_circle from '@klaus-liebler/svgs/solid/arrows-to-circle.svg?raw'
import { unsafeSVG } from "lit-html/directives/unsafe-svg.js";
import { GetLevelFromApplicationId, GetRoomFromApplicationId, GetTechnologyFromApplicationId } from "@klaus-liebler/sensact-base/application_id_utils";

import { sensact } from "@generated/wsprotocol_ts/ws-protocol";
import { ISensactContext } from "@klaus-liebler/sensact-base/interfaces";
import { IAppManagement } from "@klaus-liebler/web-components/typescript/utils/interfaces";
import  "@klaus-liebler/commons"


export class SensactController extends ScreenController implements ISensactContext {


    public SendCommandMessage(id: sensact.ApplicationId, cmd: sensact.Command, payload: DataView) {
        const payloadArray = Array.from(new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength));
        const data = new Array<number>(8).fill(0);
        for (let i = 0; i < payloadArray.length && i < 8; i++) data[i] = payloadArray[i];

        const bytes = sensact.RequestCommand.encode({
            requestId: 0,
            id,
            cmd,
            payload: { data, len: payloadArray.length },
        });
        this.appManagement.SendFrame(sensact.NAMESPACE_ID, bytes, 0);
    }

    private groups: Array<ApplicationGroup>=[];
    private filterLocal:boolean=true;
    private filterLevel: string="";

    private btnSortTechnology() {
        var tech2apps = new Map<string, Array<SensactApplication>>();
        for (const appc of this.id2appContainer.values()) {
            if(this.filterLocal && !appc.local) continue;
            var k = GetTechnologyFromApplicationId(appc.app.applicationId);
            var arr = tech2apps.getOrAdd(k, () => new Array<SensactApplication>());
            arr.push(appc.app);
        }
        var sortedMap = new Map([...tech2apps.entries()].sort((a, b) => a[0].localeCompare(b[0])));
        this.groups = [];
        sortedMap.forEach((v, k) => {
            this.groups.push(new ApplicationGroup(k, this.appManagement, v, k));
        });
        this.execTemplates();
    }

    private btnOnlyLocalApps(e:MouseEvent){
        const b = e.currentTarget as HTMLButtonElement;
        b.classList.toggle('active');
        this.filterLocal=b.classList.contains("active");
        console.log(`Only Local Apps is ${this.filterLocal}`)
        this.btnSortTechnology()
    }

    private btnOnlyAppsOfLevel(e:MouseEvent, level:string){
        const b = e.currentTarget as HTMLButtonElement;
        window.document.querySelectorAll(".levelfilter").forEach((b) => {
            b.classList.remove('active');
        })
        b.classList.add('active');
        this.filterLevel=level;
        console.log(`Only Level ${this.filterLevel}`)
        this.btnSortRooms()
    }

    private btnSortRooms() {
        var level_room2apps = new Map<string, Array<SensactApplication>>();
        for (const appc of this.id2appContainer.values()) {
            if(this.filterLocal && !appc.local) continue;
            if(this.filterLevel!="" && this.filterLevel != GetLevelFromApplicationId(appc.app.applicationId)) continue;
            var room_level = GetRoomFromApplicationId(appc.app.applicationId) + "_" + GetLevelFromApplicationId(appc.app.applicationId);
            var arr = level_room2apps.getOrAdd(room_level, () => new Array<SensactApplication>());
            arr.push(appc.app);
        }
        var sortedMap = new Map([...level_room2apps.entries()].sort((a, b) => a[0].localeCompare(b[0])));
        this.groups = [];
        sortedMap.forEach((v, k) => {
            this.groups.push(new ApplicationGroup(k, this.appManagement, v, k));
        });
        this.execTemplates();
    }

    private execTemplates() {
        var templates = new Array<TemplateResult<1>>();
        this.groups.forEach((group) => {
            templates.push(group.Template());
        });
        render(templates, this.mainElement.value!);
    }

    private mainElement: Ref<HTMLElement> = createRef();
    public Template = () => html`
    <h1>Sensact Controls</h1>

    <div class="buttons">
        <button class="levelfilter active" @click=${(e:MouseEvent) => this.btnOnlyAppsOfLevel(e, "")}>X</button>
        <button class="levelfilter" @click=${(e:MouseEvent) => this.btnOnlyAppsOfLevel(e, "L0")}>K</button>
        <button class="levelfilter" @click=${(e:MouseEvent) => this.btnOnlyAppsOfLevel(e, "L1")}>E</button>
        <button class="levelfilter" @click=${(e:MouseEvent) => this.btnOnlyAppsOfLevel(e, "L2")}>O</button>
        <button class="levelfilter" @click=${(e:MouseEvent) => this.btnOnlyAppsOfLevel(e, "L3")}>D</button>
        <button class="levelfilter" @click=${(e:MouseEvent) => this.btnOnlyAppsOfLevel(e, "LX")}>A</button>
        <button class="withsvg" @click=${() => this.btnSortRooms()}>${unsafeSVG(bed)}<span>Sort Rooms<span></button>
        <button class="withsvg" @click=${() => this.btnSortTechnology()}>${unsafeSVG(lightbulb)}<span>Sort Tech<span></button>
        <button class="withsvg toggle-button active" @click=${(e:MouseEvent) => this.btnOnlyLocalApps(e)}>${unsafeSVG(arrows_to_circle)}<span>Only Local Apps<span></button>
    </div>
    <section ${ref(this.mainElement)}></section>`;

    private id2appContainer: Map<number, SensactApplicationAndLocalFlag>;

    OnMessage(namespaceId: number, messageTypeId: number, view: DataView): void {
        if (namespaceId != sensact.NAMESPACE_ID) return;

        switch (messageTypeId) {
            case sensact.ResponseCommand.TYPE_ID:
                this.onResponseCommand(sensact.ResponseCommand.decode(view, 0));
                break;
            case sensact.NotifyStatus.TYPE_ID:
                this.onNotifyStatus(sensact.NotifyStatus.decode(view, 0));
                break;
            case sensact.ResponseStatus.TYPE_ID:
                this.onResponseStatus(sensact.ResponseStatus.decode(view, 0));
                break;
            default:
                break;
        }
        if(this.State == ControllerState.STARTED){
            this.execTemplates();
        }
    }

    private onResponseCommand(_m: sensact.ResponseCommand.Payload) {
        console.debug("Command confirmed");
    }

    private onNotifyStatus(m: sensact.NotifyStatus.Payload) {

        var appc = this.id2appContainer.get(m.id);
        if (!appc) {
            //console.debug(`Unknown app with id ${m.id}`);
            return;
        }

        const arr = new Uint16Array(m.status.data);
        if(m.status.data[0]==0xFFFF){
            return;
        }
        console.debug(`onNotifyStatus for app '${appc.app.ApplicationDescription}' with data ${arr}`);
        appc.app.UpdateState(arr);
    }


    private onResponseStatus(m: sensact.ResponseStatus.Payload) {
        console.info(`onResponseStatus for ${m.states.length} items`);
        for (const state of m.states) {
            var appc = this.id2appContainer.get(state.id);
            if (!appc) {
                console.warn(`Unknown app with id ${state.id}`);
                continue;
            }
            if (state.status.data[0] == 0xFFFF) {
                appc.app.NoDataFromServerAvailable();
                continue;
            }
            const arr = new Uint16Array(state.status.data);
            appc.app.UpdateState(arr);
        }
    }

    public constructor(appManagement: IAppManagement){
        super(appManagement)
        this.apps=[];
        this.id2appContainer=new Map<number, SensactApplicationAndLocalFlag>();
    }
    private apps:Array<SensactApplicationAndLocalFlag>
    public AddApps(apps:Array<SensactApplicationAndLocalFlag>){
        this.apps=apps;
    }

    OnCreate(): void {
        this.appManagement.RegisterNamespace(this, sensact.NAMESPACE_ID);
        this.id2appContainer = new Map<number, SensactApplicationAndLocalFlag>(this.apps.map(v => [v.app.applicationId, v]));
    }

    private onStart_or_onRestart() {
        this.btnSortTechnology();
    }

    OnFirstStart(): void {
        this.onStart_or_onRestart();
    }

    OnRestart(): void {
        this.onStart_or_onRestart();
    }

    OnPause(): void {
    }
}
