import { ScreenController } from "@klaus-liebler/web-components";
import { TemplateResult, html, render } from "lit-html";
import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { ApplicationGroup, SensactApplication } from "./sensactapps_base";
import * as flatbuffers from 'flatbuffers';

import bed from '@klaus-liebler/svgs/solid/bed.svg?raw'
import lightbulb from '@klaus-liebler/svgs/solid/lightbulb.svg?raw'
import { unsafeSVG } from "lit-html/directives/unsafe-svg.js";
import { GetLevelFromApplicationId, GetRoomFromApplicationId, GetTechnologyFromApplicationId } from "@klaus-liebler/sensact-base/application_id_utils";

import { ApplicationId, Command, Namespace, NotifyStatus, Requests, ResponseCommand, Responses, ResponseStatus, ResponseWrapper, RequestWrapper, RequestCommand } from "@generated/flatbuffers_ts/sensact";
import { ISensactContext } from "@klaus-liebler/sensact-base/interfaces";
import { IAppManagement } from "@klaus-liebler/web-components/typescript/utils/interfaces";
import  "@klaus-liebler/commons"


export class SensactController extends ScreenController implements ISensactContext {
    
    public SendCommandMessage(id: ApplicationId, cmd: Command, payload: Uint8Array) {
        let view = new DataView(payload.buffer, 0);
        let b = new flatbuffers.Builder(1024);
        b.finish(
            RequestWrapper.createRequestWrapper(
                b,
                Requests.RequestCommand,
                RequestCommand.createRequestCommand(b, id, cmd, view.getBigUint64(0, true))
            )
        )
        this.appManagement.SendFinishedBuilder(Namespace.Value, b, 3000);
    }

    private groups: Array<ApplicationGroup>;

    private btnSortTechnology() {
        var tech2apps = new Map<string, Array<SensactApplication>>();
        for (const app of this.sensactApps.values()) {
            var k = GetTechnologyFromApplicationId(app.applicationId);
            var arr = tech2apps.getOrAdd(k, () => new Array<SensactApplication>());
            arr.push(app);
        }
        var sortedMap = new Map([...tech2apps.entries()].sort((a, b) => a[0].localeCompare(b[0])));
        this.groups = [];
        sortedMap.forEach((v, k) => {
            this.groups.push(new ApplicationGroup(k, this.appManagement, v, k));
        });
        this.execTemplates();
    }

    private btnSortRooms() {
        var level_room2apps = new Map<string, Array<SensactApplication>>();
        for (const app of this.sensactApps.values()) {
            var room_level = GetRoomFromApplicationId(app.applicationId) + "_" + GetLevelFromApplicationId(app.applicationId);
            var arr = level_room2apps.getOrAdd(room_level, () => new Array<SensactApplication>());
            arr.push(app);
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
        <button class="withsvg" @click=${() => this.btnSortRooms()}>${unsafeSVG(bed)}<span>Sort Rooms<span></button>
        <button class="withsvg" @click=${() => this.btnSortTechnology()}>${unsafeSVG(lightbulb)}<span>Sort Tech<span></button>
    </div>
    <section ${ref(this.mainElement)}></section>`;

    private sensactApps: Map<number, SensactApplication>;

    OnMessage(namespace: number, bb: flatbuffers.ByteBuffer): void {
        if (namespace != Namespace.Value) return;
        var messageWrapper = ResponseWrapper.getRootAsResponseWrapper(bb);
        switch (messageWrapper.responseType()) {
            case Responses.ResponseCommand:
                this.onResponseCommand(<ResponseCommand>messageWrapper.response(new ResponseCommand()));
                break;
            case Responses.NotifyStatus:
                this.onNotifyStatus(<NotifyStatus>messageWrapper.response(new NotifyStatus()));
                break;
            case Responses.ResponseStatus:
                this.onResponseStatus(<ResponseStatus>messageWrapper.response(new ResponseStatus()));
                break;
            default:
                break;
        }
        this.execTemplates();
    }

    private onResponseCommand(m: ResponseCommand) {
        console.log("Command confirmed");
    }

    private onNotifyStatus(m: NotifyStatus) {
        var app = this.sensactApps.get(m.id());
        if (!app) {
            console.warn(`Unknown app with id ${m.id()}`);
            return;
        }
        app.UpdateState(m.status());
    }

    private onResponseStatus(m: ResponseStatus) {
        for (var i = 0; i < m.statesLength(); i++) {
            var app = this.sensactApps.get(m.states(i)!.id());
            if (!app) {
                console.warn(`Unknown app with id ${m.states(i)!.id()}`);
                continue;
            }
            app.UpdateState(m.states(i)!.status());
        }
    }

    public constructor(appManagement: IAppManagement){
        super(appManagement)
    }
    private apps:Array<SensactApplication>
    public AddApps(apps:Array<SensactApplication>){
        this.apps=apps;
    }
   
    OnCreate(): void {
        this.appManagement.RegisterWebsocketMessageNamespace(this, Namespace.Value);
        this.sensactApps = new Map<number, SensactApplication>(this.apps.map(v => [v.applicationId, v]));
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
