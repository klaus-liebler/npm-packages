
import { TemplateResult, html } from 'lit-html';
import * as flatbuffers from 'flatbuffers';
import { Ref, createRef, ref } from 'lit-html/directives/ref.js';
import  * as fb from "@generated/flatbuffers_ts/sensact";
import { interfaces } from '@klaus-liebler/web-components';
import { styleMap } from 'lit-html/directives/style-map.js';
import * as cmd from "@generated/sensact_sendCommandImplementation/sendCommandImplementation"
import { ISensactContext } from '@klaus-liebler/sensact-base/interfaces';
import { uint8ArrayToBigInt } from '@klaus-liebler/commons';

export enum SyncState {
  NODATA,
  SYNCHRONIZED,
  NONSYNCHRONIZED,
}

export interface SensactContext {

};

export class ApplicationGroup {
  constructor(public readonly DisplayName: string, private readonly appManagement: interfaces.IAppManagement, public readonly Apps: Array<SensactApplication>, private readonly key: string | null = null) { }

  public get Key() {
    return this.key ?? this.DisplayName;
  }

  private panelOpen = false;
  public spanArrowContainer: Ref<HTMLElement> = createRef();
  public divPanel: Ref<HTMLTableSectionElement> = createRef();
  public btnOpenClose: Ref<HTMLElement> = createRef();
  public btnUpdate: Ref<HTMLButtonElement> = createRef();
  public btnReset: Ref<HTMLButtonElement> = createRef();

  public Template = () => {

    var itemTemplates: Array<TemplateResult<1>> = [];
    for (const app of this.Apps) {
      itemTemplates.push(app.OverallTemplate());
    }
    const divPanelStyle = { display: this.panelOpen ? 'block' : 'none'};
    return html`
    <div class="accordion appgroup">
        <button ${ref(this.btnOpenClose)} @click=${(e) => this.onBtnOpenCloseClicked(e)}>
            <span ${ref(this.spanArrowContainer)}>▶</span>
            <span style="flex-grow: 1; text-align:left; padding-left:10px;">${this.DisplayName}</span>
            <input ${ref(this.btnUpdate)} @click=${(e: MouseEvent) => this.onBtnUpdateClicked(e)} type="button" value=" ⟳ Fetch Values from Server" />
            <input ${ref(this.btnReset)} type="button" value=" 🗑 Reset Values" />
        </button>
        <div ${ref(this.divPanel)} style=${styleMap(divPanelStyle)}>
            <table>
                <thead>
                    <tr><th>Name</th><th>ID</th><th>Controls</th></tr>
                </thead>
                <tbody>${itemTemplates}</tbody>
            </table>
            
        </div>
    </div>
    `}

  private sendRequestGetApplicationStatus() {
    let b = new flatbuffers.Builder(1024);

    console.info(`sendRequestGetApplicationStatus`);
            
    var ids=new Array<fb.ApplicationId>();
    this.Apps.forEach((v,k) => {
        ids.push(v.applicationId)
    });
    b.finish(
      fb.RequestWrapper.createRequestWrapper(
        b, 
        fb.Requests.RequestStatus, 
        fb.RequestStatus.createRequestStatus(b, fb.RequestStatus.createIdsVector(b, ids))
      )
    )    
    this.appManagement.SendFinishedBuilder(fb.Namespace.Value, b, 3000);
  }


  private onBtnOpenCloseClicked(e: MouseEvent) {
    this.panelOpen = !this.panelOpen;
    console.info(`in onBtnOpenCloseClicked this.panelOpen=${this.panelOpen}`)
    if (this.panelOpen) {
      this.divPanel.value!.style.display = "block";
      this.btnOpenClose.value!.classList.add("active");
      this.spanArrowContainer.value!.textContent = "▼";
      this.sendRequestGetApplicationStatus();
    } else {
      this.divPanel.value!.style.display = "none";
      this.btnOpenClose.value!.classList.remove("active");
      this.spanArrowContainer.value!.textContent = "▶";
    }
    e.stopPropagation();
  }

  private onBtnUpdateClicked(e: MouseEvent) {
    this.sendRequestGetApplicationStatus();
    e.stopPropagation()
  }

}

export abstract class SensactApplication {

  protected syncState: SyncState = SyncState.NODATA;

  public abstract UpdateState(state32bit:number);

  constructor(public readonly applicationId: fb.ApplicationId, public readonly ApplicationDescription: string, public readonly ctx:ISensactContext) { }
  

  protected abstract CoreAppHtmlTemplate: () => TemplateResult<1>;

  public OverallTemplate = () => html`
  <tr class="app">
      <td>${this.ApplicationDescription}</td>
      <td>${fb.ApplicationId[this.applicationId]}${this.syncState==SyncState.SYNCHRONIZED?"(sync)":"(no sync)"}</td>
      <td>${this.CoreAppHtmlTemplate()}</td>
  </tr>
  `

  protected NoDataFromServerAvailable() {
    this.syncState=SyncState.NODATA;
  }

  protected ConfirmSuccessfulWrite() {
    this.syncState=SyncState.SYNCHRONIZED;
  }

  

 
}

export class OnOffApplication extends SensactApplication {
  private inputElement: Ref<HTMLInputElement> = createRef()
  
  public UpdateState(state32bit:number){
    this.ConfirmSuccessfulWrite();
    this.inputElement.value!.checked=state32bit!=0;
  }

  private oninput() {
    if (this.inputElement.value!.checked) {
      cmd.SendONCommand(this.applicationId, 0, this.ctx);
    } else {
      cmd.SendOFFCommand(this.applicationId, 0, this.ctx);
    }
    console.log(`onoff ${this.applicationId} ${this.inputElement.value!.checked}`);
  }

  protected CoreAppHtmlTemplate = () => html`
       <input ${ref(this.inputElement)} @input=${() => this.oninput()} class="toggle" type="checkbox"></input>`

}
/*
Ein Blinds-Timer öffnet und schließt die verbundenen Rolläden 
+öffnen: beim CIVIL_SUNRISE + Offset +  Zufallsüberlagerung
es können mehrere Rolläden registriert werden
sie alle erhalten den gleichen SURISE-Type und den gleichen Offset, aber eine individuelle Zufallsüberlagerung
Implementierung in c++:
Beim Hochfahren/Initialisieren werden für alle Rolläden die nächsten Zeitpunkte zum Öffnen und zum Schließen berechnet und abgelegt als epoch seconds
Wenn diese Zeiten dann individuell erreicht werden, wird der passende Befehl an den Rolladen losgesendet und direkt der nächste Termin zum Öffnen/Schließen am Folgetag berechnet
*/
export class BlindsTimerApplication extends SensactApplication {
  private inputElement: Ref<HTMLInputElement> = createRef()
  
  protected CoreAppHtmlTemplate = () => html`
       <input ${ref(this.inputElement)} @input=${() => this.oninput()} type="checkbox"></input>
  `

  public UpdateState(state32bit:number){
    this.ConfirmSuccessfulWrite();
    this.inputElement.value!.checked=state32bit!=0;
  }


  private oninput() {
    if (this.inputElement.value!.checked) {
      cmd.SendONCommand(this.applicationId, 0, this.ctx);
    } else {
      cmd.SendOFFCommand(this.applicationId, 0, this.ctx);
    }
    console.log(`blindstimer ${this.applicationId} ${this.inputElement.value!.checked}`);

  }


}

export class BlindApplication extends SensactApplication {

  private upElement: Ref<HTMLInputElement> = createRef()
  private stopElement: Ref<HTMLInputElement> = createRef()
  private downElement: Ref<HTMLInputElement> = createRef()

  public UpdateState(state32bit:number){
    this.ConfirmSuccessfulWrite();
    var pos = (state32bit & 0xFF);
    var dir = (state32bit & 0xFF00)>>8;
  }

  onStop() {
    cmd.SendSTOPCommand(this.applicationId, this.ctx);
    console.log(`blind_stop ${this.applicationId}`);
  }

  onUp() {
    cmd.SendUPCommand(this.applicationId, 0, this.ctx);
    console.log(`blind_stop ${this.applicationId}`);
  }

  onDown() {
    cmd.SendDOWNCommand(this.applicationId, 0, this.ctx);
    console.log(`blind_down ${this.applicationId}`);
  }

  protected CoreAppHtmlTemplate = () => html`
  <button ${ref(this.upElement)} @click=${() => this.onUp()}>▲</button>
  <button ${ref(this.stopElement)} @click=${() => this.onStop()}>▮</button>
  <button ${ref(this.downElement)} @click=${() => this.onDown()}>▼</button>
  `
}


export class SinglePwmApplication extends SensactApplication {
  private onOffElement: Ref<HTMLInputElement> = createRef()
  private sliderElement: Ref<HTMLInputElement> = createRef()
  
  private oninput() {
    if (this.onOffElement.value!.checked) {
      //x.SendONCommand(this.applicationId, 0);
    } else {
      //x.SendOFFCommand(this.applicationId, 0);
    }
    console.log(`SinglePwmApplication ${this.applicationId} ${this.onOffElement.value!.checked}`);
  }

  public UpdateState(state32bit:number){
    this.ConfirmSuccessfulWrite();
    var brightness:number = (state32bit & 0xFF);
    var on:boolean = (state32bit & 0xFF00)!=0;
    if(brightness!=this.sliderElement.value!.valueAsNumber){
      this.sliderElement.value!.valueAsNumber=brightness;
    }
  }

  private onslide() {
    //x.SendSET_VERTICAL_TARGETCommand(this.applicationId, parseInt(slider.value));
    console.log(`singlepwm_slider ${this.applicationId} ${this.sliderElement.value!.valueAsNumber}`);
  }
  protected CoreAppHtmlTemplate = () => html`
  <input ${ref(this.onOffElement)} @input=${() => this.oninput()} class="toggle" type="checkbox"></input>
  <input ${ref(this.sliderElement)} @input=${() => this.onslide()} type="range" min="1" max="100" value="50">
  `
}