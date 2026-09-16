import { TemplateResult, html } from 'lit-html';
import { Ref, createRef, ref } from 'lit-html/directives/ref.js';
import { sensact as fb } from "@generated/wsprotocol_ts/ws-protocol";
import { interfaces } from '@klaus-liebler/web-components';
import { styleMap } from 'lit-html/directives/style-map.js';
import * as cmd from "@generated/sensact_sendCommandImplementation/sendCommandImplementation"
import { ISensactContext } from '@klaus-liebler/sensact-base/interfaces';
import { unsafeSVG } from "lit-html/directives/unsafe-svg.js";
import lightbulb from '@klaus-liebler/svgs/solid/lightbulb.svg?raw';

export enum SyncState {
  NODATA,
  SYNCHRONIZED,
  NONSYNCHRONIZED,
}

export interface SensactContext {

};

export interface SensactApplicationAndLocalFlag {
  local: boolean;
  app: SensactApplication;
}

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
    const divPanelStyle = { display: this.panelOpen ? 'block' : 'none' };
    return html`
    <div class="accordion appgroup">
        <button ${ref(this.btnOpenClose)} @click=${(e: MouseEvent) => this.onBtnOpenCloseClicked(e)}>
            <span ${ref(this.spanArrowContainer)} style="height: 100%;">▶</span>
            <span style="flex-grow: 1; text-align:left; padding-left:10px;">${this.DisplayName}</span>
            <input ${ref(this.btnUpdate)} @click=${(e: MouseEvent) => this.onBtnUpdateClicked(e)} type="button" value=" ⟳ Fetch Values from Server" />
        </button>
        <div ${ref(this.divPanel)} style=${styleMap(divPanelStyle)}>
            <table>
                <thead>
                    <tr><th style="width:200px">Name</th><th style="width:200px">ID</th><th>Controls</th></tr>
                </thead>
                <tbody>${itemTemplates}</tbody>
            </table>
            
        </div>
    </div>
    `}

  private sendRequestGetApplicationStatus() {
    console.info(`sendRequestGetApplicationStatus for ids ${this.Apps.map(v => v.applicationId).join(",")}`);

    const ids = this.Apps.map(v => ({ value: v.applicationId }));
    const bytes = fb.RequestStatus.encode({ requestId: 0, ids });
    this.appManagement.SendFrame(fb.NAMESPACE_ID, bytes, 3000);
  }


  private onBtnOpenCloseClicked(e: MouseEvent) {
    this.panelOpen = !this.panelOpen;
    console.info(`in onBtnOpenCloseClicked this.panelOpen=${this.panelOpen}`)
    if (this.panelOpen) {
      this.divPanel.value!.style.display = "block";
      this.btnOpenClose.value!.classList.add("active");
      this.spanArrowContainer.value!.textContent = "▼";
      //invalidate the current state of the application
      this.Apps.forEach((v, _k) => {
        v.NoDataFromServerAvailable();
      });
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

  public abstract UpdateState(state: Uint16Array):void;

  constructor(public readonly applicationId: fb.ApplicationId, public readonly ApplicationDescription: string, public readonly ctx: ISensactContext) { }


  protected abstract CoreAppHtmlTemplate: () => TemplateResult<1>;

  public OverallTemplate = () => html`
  <tr class="app">
      <td>${this.ApplicationDescription}</td>
      <td>${fb.ApplicationId[this.applicationId]}${this.syncState == SyncState.SYNCHRONIZED ? "(sync)" : "(no sync)"}</td>
      <td style="display:flex;align-items:center">${this.CoreAppHtmlTemplate()}</td>
  </tr>
  `

  public NoDataFromServerAvailable() {
    this.syncState = SyncState.NODATA;
  }

  protected ConfirmSuccessfulWrite() {
    this.syncState = SyncState.SYNCHRONIZED;
  }
}

export class OnOffApplication extends SensactApplication {
  private inputElement: Ref<HTMLButtonElement> = createRef()
  private on: boolean = false;

  public override NoDataFromServerAvailable() {
    super.NoDataFromServerAvailable();
    this.on = false;
  }

  public UpdateState(state: Uint16Array) {
    this.ConfirmSuccessfulWrite();
    this.on = state[0] != 0;
  }

  private oninput() {
    this.on = !this.on;
    if (this.on) {
      cmd.SendONCommand(this.applicationId, 0, this.ctx);
    } else {
      cmd.SendOFFCommand(this.applicationId, 0, this.ctx);
    }
    console.log(`onoff ${this.applicationId} ${this.on}`);
  }

  protected CoreAppHtmlTemplate = () => html`
  <button ${ref(this.inputElement)} class="withsvg toggle-button sensact-control ${this.on ? 'active' : ''}" @click=${() => this.oninput()}>${unsafeSVG(lightbulb)}<span>On Off</span></button>`

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

  public UpdateState(state: Uint16Array) {
    this.ConfirmSuccessfulWrite();
    this.inputElement.value!.checked = state[0] != 0;
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

enum eCurrentBlindState //copied from c++ code

{
  ENERGY_SAVE,
  STOP,
  PREPARE_UP,
  PREPARE_DOWN,
  UP,
  DOWN,
};

//constexpr s32 FULL_DOWN = 0.25 * INT32_MAX;
//constexpr s32 FULL_UP = 0.75 * INT32_MAX;

//unten=0%
//oben=100%
export class BlindApplication extends SensactApplication {
  private upElement: Ref<HTMLInputElement> = createRef()
  private stopElement: Ref<HTMLInputElement> = createRef()
  private downElement: Ref<HTMLInputElement> = createRef()
  private progressElement: Ref<HTMLProgressElement> = createRef()
  private movement: eCurrentBlindState = eCurrentBlindState.STOP;
  private positionAsPercentage: number = 0;

  public UpdateState(state: Uint16Array) {
    this.ConfirmSuccessfulWrite();
    this.movement = <eCurrentBlindState>state[0];
    this.positionAsPercentage = state[1];
    console.log(`${fb.ApplicationId[this.applicationId]} recvs  ${eCurrentBlindState[state[0]]}, POS%: ${this.positionAsPercentage}%`);
  }

  onStop() {
    cmd.SendSTOPCommand(this.applicationId, this.ctx);
    console.log(`${fb.ApplicationId[this.applicationId]} sends stop! `);
  }

  onUp() {
    cmd.SendUPCommand(this.applicationId, 0, this.ctx);
    console.log(`${fb.ApplicationId[this.applicationId]}} sends up! `);
  }

  onDown() {
    cmd.SendDOWNCommand(this.applicationId, 0, this.ctx);
    console.log(`${fb.ApplicationId[this.applicationId]}} sends down! `);
  }

  protected CoreAppHtmlTemplate = () => html`
  <button ${ref(this.upElement)} @click=${() => this.onUp()} class="withsvg toggle-button sensact-control icon-only ${this.movement == eCurrentBlindState.UP ? 'active' : ''}">▲</button>
  <button ${ref(this.stopElement)} @click=${() => this.onStop()} class="withsvg toggle-button sensact-control icon-only">▮</button>
  <button ${ref(this.downElement)} @click=${() => this.onDown()} class="withsvg toggle-button sensact-control icon-only ${this.movement == eCurrentBlindState.DOWN ? 'active' : ''}">▼</button>
  <span style="margin-left:10px">oben</span><progress style="margin-left:10px" ${ref(this.progressElement)} max="100" value="${100 - this.positionAsPercentage}"></progress><span style="margin-left:10px">unten</span>
  <span style="margin-left:10px">${100 - this.positionAsPercentage}%</span>

  `
}

export class SinglePwmApplication extends SensactApplication {
  private MULTIPLIER = 256;
  private sliderElement: Ref<HTMLInputElement> = createRef()
  private inputElement: Ref<HTMLButtonElement> = createRef()
  private on: boolean = false;
  private level: number = 0;
  private lastUserInteraction: number = 0;

  public override NoDataFromServerAvailable() {
    super.NoDataFromServerAvailable();
    this.on = false;
    this.level = 0;
  }

  private oninput(_e: MouseEvent) {
    //const _b = e.currentTarget as HTMLButtonElement;
    cmd.SendTOGGLECommand(this.applicationId, this.ctx);
    console.log(`${fb.ApplicationId[this.applicationId]} got TOGGLEd`);
  }
  /*
  eAppCallResult cSinglePWM::FillStatus(iSensactContext &ctx, std::array<uint16_t, 4>& buf){
      buf[0]=currentLevel==0?0:1; // 1=ON, 0=OFF
      buf[1]=currentLevel;
      buf[2]=autoDim;
      buf[3]=targetLevel;;
      return eAppCallResult::OK;
    }
  */

  public UpdateState(state: Uint16Array) {
    this.ConfirmSuccessfulWrite();
    this.level = state[1]; //das ist das storedLevel, das repräsentiert die Stellung des Sliders wohl am besten
    this.on = state[0] != 0; //das ist abhängig vom targetLevel
    if (Date.now() - this.lastUserInteraction > 3000 && this.sliderElement.value) {//wenn 3 Sekunden keine User-Interaktion, dann den Slider auf den aktuellen Wert setzen
      this.sliderElement.value!.valueAsNumber = Math.floor(this.level/this.MULTIPLIER);
      //this.sliderElement.value!.disabled=!this.on;
      console.info(`${fb.ApplicationId[this.applicationId]} recvs  ${state[3]} ${state[0] == 0 ? "OFF" : "ON"}(is: ${this.sliderElement.value!.valueAsNumber})`);
    } else {
      console.info(`${fb.ApplicationId[this.applicationId]} blocks ${state[3]} ${state[0] == 0 ? "OFF" : "ON"}(is: ${this.sliderElement.value?.valueAsNumber})`);
    }
  }

  private onslide() {
    this.lastUserInteraction = Date.now();
    console.info(`${fb.ApplicationId[this.applicationId]} sends  ${this.sliderElement.value!.valueAsNumber}*${this.MULTIPLIER}`);
    cmd.SendSET_VERTICAL_TARGETCommand(this.applicationId, this.sliderElement.value!.valueAsNumber*this.MULTIPLIER, this.ctx);
  }
  protected CoreAppHtmlTemplate = () => html`
  <button ${ref(this.inputElement)} class="withsvg toggle-button sensact-control ${this.on ? 'active' : ''}" @click=${(e: MouseEvent) => this.oninput(e)}>${unsafeSVG(lightbulb)}<span>On Off</span></button>
  <input ${ref(this.sliderElement)} @mouseup=${() => this.lastUserInteraction = Date.now()} @touchend=${() => this.lastUserInteraction = Date.now()} @change=${() => this.lastUserInteraction = Date.now()} @input=${() => this.onslide()} type="range" min="0" max="255" style="flex-grow: 1;" step=1 value="${this.level}">
  `
}

export class SoundApplication extends SensactApplication {
  private sliderElement: Ref<HTMLInputElement> = createRef()
  private btnMute: Ref<HTMLButtonElement> = createRef()
  private btnPlay: Ref<HTMLButtonElement> = createRef()
  private soundSelect: Ref<HTMLSelectElement> = createRef()
  private dayVolumeSlider: Ref<HTMLInputElement> = createRef()
  private nightVolumeSlider: Ref<HTMLInputElement> = createRef()
  private dayStartSlider: Ref<HTMLInputElement> = createRef()
  private dayEndSlider: Ref<HTMLInputElement> = createRef()

  private isPlaying: boolean = false;
  private volume: number = -1;
  private muted: boolean = false;

  private lastUserInteraction: number = 0;

  // Index 1..4 -- muss zur Reihenfolge von SOUNDS[]/SONGS_LEN[] in sound.cc passen (kein
  // generierter Mapping-Mechanismus dafuer vorhanden, s. dortigen Kommentar).
  private static readonly SOUND_NAMES = ['Dingdong', 'Sirene', 'Positiv', 'Negativ'];

  private static quarterHourToTimeString(q: number): string {
    const h = Math.floor(q / 4).toString().padStart(2, '0');
    const m = ((q % 4) * 15).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  protected CoreAppHtmlTemplate = () => html`
  <button ${ref(this.btnMute)} class="${this.muted ? '' : 'active'}" @click=${(e: MouseEvent) => this.onBtnMute(e)}>${this.muted ? "🔇" : "🔈"}</button>
  <select ${ref(this.soundSelect)}>${SoundApplication.SOUND_NAMES.map(n => html`<option>${n}</option>`)}</select>
  <button ${ref(this.btnPlay)} class="${this.isPlaying ? 'active' : ''}" @click=${(e: MouseEvent) => this.onBtnPlay(e)}>▶</button>
  <input ${ref(this.sliderElement)} @mouseup=${() => this.lastUserInteraction = Date.now()} @touchend=${() => this.lastUserInteraction = Date.now()} @change=${() => this.lastUserInteraction = Date.now()} @input=${() => this.onInputSlide()} type="range" min="256" max="65535"step="256">
  <label>Tag-Lautstärke <input ${ref(this.dayVolumeSlider)} type="range" min="0" max="65535" step="256" @change=${() => this.onDayVolume()}></label>
  <label>Nacht-Lautstärke <input ${ref(this.nightVolumeSlider)} type="range" min="0" max="65535" step="256" @change=${() => this.onNightVolume()}></label>
  <label>Tag ab ${SoundApplication.quarterHourToTimeString(this.dayStartSlider.value?.valueAsNumber ?? 0)} <input ${ref(this.dayStartSlider)} type="range" min="0" max="95" step="1" @change=${() => this.onDayStart()}></label>
  <label>Tag bis ${SoundApplication.quarterHourToTimeString(this.dayEndSlider.value?.valueAsNumber ?? 0)} <input ${ref(this.dayEndSlider)} type="range" min="0" max="95" step="1" @change=${() => this.onDayEnd()}></label>
  <button @click=${() => this.onSave()}>💾 Speichern</button>
  `
  private onBtnMute(_e: MouseEvent) {
    this.muted = !this.muted;
    console.info(`${fb.ApplicationId[this.applicationId]} sends  mute=${this.muted}`);
    if (this.muted) {
      cmd.SendOFFCommand(this.applicationId, 0, this.ctx);
    } else {
      cmd.SendONCommand(this.applicationId, 0, this.ctx);
    }
  }

  private onBtnPlay(_e: MouseEvent) {
    const idx = (this.soundSelect.value?.selectedIndex ?? 0) + 1;
    console.info(`${fb.ApplicationId[this.applicationId]} sends  play song ${idx}!`);
    cmd.SendSET_SIGNALCommand(this.applicationId, idx, this.ctx);
  }

  private onInputSlide() {
    this.lastUserInteraction = Date.now();
    console.info(`${fb.ApplicationId[this.applicationId]} sends  ${this.sliderElement.value!.valueAsNumber}`);
    cmd.SendSET_VERTICAL_TARGETCommand(this.applicationId, this.sliderElement.value!.valueAsNumber, this.ctx);
  }

  // Tag/Nacht-Einstellungen: kein Live-Echo vom Board (FillStatus nutzt seine 4 Slots bereits
  // fuer isPlaying/sound/currentVolume/muted) -- die Slider sind bewusst "fire and forget",
  // massgeblich ist der im NVS gespeicherte Stand auf dem Board.
  private onDayVolume() {
    cmd.SendSET_PARAMCommand(this.applicationId, 1, this.dayVolumeSlider.value!.valueAsNumber, this.ctx);
  }
  private onNightVolume() {
    cmd.SendSET_PARAMCommand(this.applicationId, 2, this.nightVolumeSlider.value!.valueAsNumber, this.ctx);
  }
  private onDayStart() {
    cmd.SendSET_PARAMCommand(this.applicationId, 3, this.dayStartSlider.value!.valueAsNumber, this.ctx);
  }
  private onDayEnd() {
    cmd.SendSET_PARAMCommand(this.applicationId, 4, this.dayEndSlider.value!.valueAsNumber, this.ctx);
  }
  private onSave() {
    console.info(`${fb.ApplicationId[this.applicationId]} sends  SAVE_PARAM`);
    cmd.SendSAVE_PARAMCommand(this.applicationId, this.ctx);
  }


  /*
  eFillStatusResult cSound::FillStatus(iSensactContext &ctx, std::array<uint16_t, 4>& buf){
    bool isPlayingMP3=false;
    ctx.IsPlayingMP3(isPlayingMP3);
    buf[0]=isPlayingMP3;
    buf[1]=this->sound;
    buf[2]=this->currentVolume;
    buf[3]=this->muted;
    return eFillStatusResult::OK;
  }
  */

  public UpdateState(state: Uint16Array) {
    this.ConfirmSuccessfulWrite();
    this.isPlaying = state[0] == 2;
    this.volume = state[1];
    this.muted = state[3] != 0;
    if (Date.now() - this.lastUserInteraction > 3000 && this.sliderElement.value) {//wenn 3 Sekunden keine User-Interaktion, dann den Slider auf den aktuellen Wert setzen
      this.sliderElement.value!.valueAsNumber = this.volume;
    }
    console.info(`${fb.ApplicationId[this.applicationId]} recvs isPlaying:${this.isPlaying}, volume:${this.volume} muted:${this.muted}`);
  }
}