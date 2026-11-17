// Rahmen der Weboberflaeche: die Anwendungs-Shell aus @klaus-liebler/ui-shell (Titelleiste mit
// Verbindung, Benutzer, Hell/Dunkel, Vollbild; Arbeitsbereich-Umschalter mit Ribbon; Statusleiste),
// gemeinsam mit factory_in_a_box. Jeder ScreenController wird ein Arbeitsbereich: ein eigenes
// <screen-workspace>-Element, das die Shell beim Wechsel zeigt/versteckt (onShow/onHide ->
// OnStartPublic/OnPausePublic). Die Reihenfolge von AddScreenController ist die im Umschalter, der
// erste Bildschirm ist die Startseite.
import "@klaus-liebler/ui-shell/ui/base.css"
import "@klaus-liebler/ui-shell/ui/components.css"
import "@klaus-liebler/ui-shell/shell/app-shell.ts"
import "../style/app.css"
import type { AppShell, ConnectionState, ShellNotifications } from "@klaus-liebler/ui-shell/shell/app-shell.ts"
import type { WorkspaceApp } from "@klaus-liebler/ui-shell/shell/workspace-app.ts"
import type { IconName } from "@klaus-liebler/ui-shell/shell/icons.ts"
import { currentPath } from "@klaus-liebler/ui-shell/shell/router.ts"
import { TemplateResult, html, render } from "lit-html";
import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { IChatbot, ScreenWorkspaceOptions } from "./utils/interfaces";
import { DialogController, OkDialog } from "./dialog_controller";
import { ScreenController } from "./screen_controller/screen_controller";
import { Html} from "./utils/common";
import { MyFavouriteDateTimeFormat, Severity, severity2class, severity2symbol} from "@klaus-liebler/commons";
import { IAppManagement, IScreenControllerHost, IMessageListener } from "./utils/interfaces";
import {ArrayBufferToHexString} from "@klaus-liebler/commons"
import * as cfg from "@generated/runtimeconfig_ts"
import { decodeError, FLAG_ERROR, HEADER_SIZE, readHeader } from "@generated/wsprotocol_ts/ws-protocol"
import { WEBUI_VERSION_URL } from "./utils/constants"
import { FirmwareLog, isWarningOrError } from "./utils/firmware_log"
import { TerminalScreenController, type TerminalCommand } from "./screen_controller/terminal_controller"

/** Ein Bildschirm als Arbeitsbereich der Shell. */
export interface ScreenWorkspace {
  path: string;
  title: string;
  icon: IconName;
  group: string;
  description: string;
  urlPattern: RegExp;
  controller: ScreenController;
}

// Haelt einen ScreenController in der Shell. Bei jedem Zeigen wird sein Template frisch gerendert
// (wie frueher beim Wechsel im gemeinsamen <main>), dann OnStartPublic und SetParameter mit dem
// Treffer des URL-Musters.
export class ScreenWorkspaceElement extends HTMLElement implements WorkspaceApp {
  controller!: ScreenController;
  urlPattern!: RegExp;

  onShow(): void {
    this.controller.WorkspaceElement = this;
    delete (this as unknown as { _$litPart$?: unknown })._$litPart$;
    this.replaceChildren();
    render(this.controller.Template(), this);
    this.controller.OnStartPublic();
    const match = currentPath().match(this.urlPattern);
    if (match) this.controller.SetParameter(match);
  }

  onHide(): void {
    this.controller.OnPausePublic();
  }
}
if (!customElements.get("screen-workspace")) customElements.define("screen-workspace", ScreenWorkspaceElement);

/** Text einer Menue-Beschriftung wie html`<span>🧰</span><span>System Settings</span>`, ohne Tags und Emoji. */
export function captionText(caption: TemplateResult): string {
  const parts: string[] = [];
  caption.strings.forEach((s, i) => {
    parts.push(s);
    const v = caption.values[i];
    if (typeof v === "string" || typeof v === "number") parts.push(String(v));
  });
  return parts.join("")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#?\w+;/g, " ")
    .replace(/[\p{Extended_Pictographic}\u2700-\u27BF\uFE0F]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pfad des Arbeitsbereichs: aus einem festen Muster wie /^\/system$/, sonst "/" + url. */
export function workspacePath(url: string, urlPattern: RegExp): string {
  const source = urlPattern.source.split("\\/").join("/");
  const m = /^\^(\/[\w\-/]*)\$$/.exec(source);
  return m ? m[1] : "/" + url.replace(/^\/+/, "");
}

/** Was die Shell zusaetzlich zeigt. */
export interface AppShellOptions {
  /** Logo als SVG-Markup (Titelleiste). */
  logoSvg?: string;
  /** Neben dem Arbeitsbereich in der Titelleiste, z. B. der Knotenname. */
  hostLabel?: string;
  /** Glocke in der Titelleiste, z. B. Warnungen im Firmware-Log. */
  notifications?: ShellNotifications;
}

// 'data' ist immer ein bereits vollstaendig gerahmter Frame (8-Byte-Kopf inkl.) -- AppController
// haengt selbst keinen Praefix mehr an, s. IAppManagement.SendFrame.
class BufferedMessage {
  constructor(public data: Uint8Array, public namespaceId: number, public maxLockingTimeMs: number) { }
}

export class AppController implements IAppManagement, IScreenControllerHost {

  private namespaceId2listener = new Map<number, Array<IMessageListener>>();
  private lockingNamespaceId:number|null=null;
  private socket: WebSocket | null = null;
  private reconnectTimeoutHandle: number = -1;
  private isCurrentlyDisconnected: boolean = false;
  private reconnectAttempts: number = 0;
  // Version der geladenen Web-UI (Cookie "webui", vom Geraet beim Ausliefern gesetzt): "builtin"
  // oder die Kennung aus dem Stationspaket. null = Geraet kennt keine Stationspakete.
  private readonly loadedWebUiVersion: string | null = AppController.readCookie("webui");

  private static readCookie(name: string): string | null {
    const m = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  // Nach jedem (Wieder-)Verbinden: hat das Geraet inzwischen eine andere Web-UI (neues
  // Stationspaket hochgeladen, oder Paket nach einem Firmware-Update verworfen)? Dann neu laden.
  private async reloadIfWebUiChanged() {
    if (this.loadedWebUiVersion === null) return;
    try {
      const response = await fetch(WEBUI_VERSION_URL, { cache: "no-store" });
      if (!response.ok) return;
      const current = (await response.text()).trim();
      if (current && current !== this.loadedWebUiVersion) {
        console.info(`Web UI on the device changed (${this.loadedWebUiVersion} -> ${current}), reloading.`);
        window.location.reload();
      }
    } catch (e) {
      console.warn(`Web UI version check failed: ${e}`);
    }
  }
  private static readonly RECONNECT_INTERVAL_MS = 1500;
  // Sessions leben nur im RAM des Boards (s. webmanager_base.hh sessions[]) -- ein echter Reboot
  // (z.B. nach einem Neu-Flash) loescht sie komplett. Ein reiner Websocket-Reconnect wuerde dann
  // fuer immer mit dem (serverseitig toten) Session-Cookie scheitern, und die WebSocket-API
  // erlaubt JS keinen Einblick in den echten HTTP-Statuscode eines fehlgeschlagenen Handshakes
  // (401 wegen toter Session vs. "Server noch nicht wieder erreichbar" sind von hier aus nicht
  // unterscheidbar). Nach ein paar erfolglosen reinen WS-Versuchen deshalb ein voller Seiten-Reload
  // -- die GET-/-Route (handle_webmanager_get) prueft die Session ohnehin serverseitig korrekt und
  // zeigt bei Bedarf automatisch das Login-Formular statt der SPA.
  private static readonly RELOAD_AFTER_ATTEMPTS = 4;
  private messageBuffer = new Array<BufferedMessage>();
  private modalSpinner: Ref<HTMLDivElement> = createRef();
  private modalSpinnerTimeoutHandle: number = -1;

  private currentUsername: string = "";

  private readonly workspaces: ScreenWorkspace[] = [];
  private readonly connectionListeners: Array<() => void> = [];
  
  private dialog: Ref<HTMLDivElement> = createRef();
  private snackbarTimeout: number = -1;

  private chatbot: IChatbot|null=null;


  public ShowDialog(d: DialogController) {
    //this.dialog.value!.innerText="";
    render(d.Template(), this.dialog.value!)
    d.Show();
  }

  public RegisterNamespace(listener: IMessageListener, ...namespaceIds: number[]): (() => void){
    namespaceIds.forEach((n) => {
      let arr = this.namespaceId2listener.get(n)
      if (!arr) {
        arr = []
        this.namespaceId2listener.set(n, arr)
      }
      arr.push(listener)
    })
    return () => {this.Unregister(listener)}
  }


  public Unregister(listener: IMessageListener): void{
    console.info('unregister')
    this.namespaceId2listener.forEach((v) => {
      v.filter((l) => {
        l != listener
      })
    })
  }
  // 'bytes' ist bereits ein vollstaendig gerahmter Frame (8-Byte-Kopf namespaceId:u16+
  // messageTypeId:u16 inkl., von <namespace>.<Message>.encode() geschrieben, oder -- fuer noch
  // nicht migrierte Flatbuffers-Consumer -- vom Aufrufer selbst zusammengesetzt) -- AppController
  // haengt selbst keinen weiteren Praefix mehr an.
  public SendFrame(namespaceId: number, bytes: Uint8Array, maxLockingTimeMs: number=0):void{
    var m=new BufferedMessage(bytes, namespaceId, maxLockingTimeMs)
    if (!this.socket || this.socket.readyState != this.socket.OPEN) {
      console.info('sendWebsocketMessage --> not OPEN --> buffering')
      this.messageBuffer.push(m);
      return;
    }
    this.sendMessage(m);
  }

  private sendMessage(m:BufferedMessage){
    console.debug(`Send message of namespaceId ${m.namespaceId} with length ${m.data.byteLength} to server`)

    if(m.maxLockingTimeMs==0){
      this.lockingNamespaceId=null;
    }else{
      this.lockingNamespaceId=m.namespaceId;
      this.setModal(true)
      this.modalSpinnerTimeoutHandle = <number>(<unknown>setTimeout(() => this.modalSpinnerTimeout(), m.maxLockingTimeMs)) //casting to make TypeScript happy
    }

    console.debug(`sendWebsocketMessage for namespaceId ${m.namespaceId} --> OPEN --> send to server`)
    try {
      this.socket!.send(m.data)
    } catch (error: any) {
      this.setModal(false)
      if (this.modalSpinnerTimeoutHandle) {
        clearTimeout(this.modalSpinnerTimeoutHandle)
      }
      this.ShowDialog(new OkDialog(Severity.ERROR, `Error while sending a request to server:${error}`))
    }
  }

  private onWebsocketData(arrayBuffer: ArrayBuffer) {
    if (arrayBuffer.byteLength < HEADER_SIZE) {
      console.warn(`Frame too short for the header: ${arrayBuffer.byteLength} bytes`)
      return;
    }
    const view = new DataView(arrayBuffer);
    const header = readHeader(view);
    const { namespaceId, messageTypeId } = header;
    console.debug(`A message of namespaceId ${namespaceId}/messageTypeId ${messageTypeId} with length ${arrayBuffer.byteLength} has arrived: ${ArrayBufferToHexString(arrayBuffer)} .`)
    if (header.flags & FLAG_ERROR) {
      // an error reply: not a message of that type for the listeners (the requests here carry correlation 0,
      // so the device sends none - logged in case it does)
      const e = decodeError(view);
      console.warn(`Error reply ${e.code} from the device for namespaceId ${namespaceId}/messageTypeId ${messageTypeId}: ${e.message}`)
      return;
    }
    if (this.lockingNamespaceId==namespaceId) {
      clearTimeout(this.modalSpinnerTimeoutHandle)
      this.lockingNamespaceId = null
      this.setModal(false)
    }
    const listeners = this.namespaceId2listener.get(namespaceId);
    if(!listeners ||listeners.length==0){
      console.warn(`No Listeners registered for messages with namespaceId ${namespaceId}`)
      return;
    }
    listeners.forEach((v) => {
      v.OnMessage(namespaceId, messageTypeId, view)
    })
  }


  public ShowSnackbar(severity: Severity, text: string, timeout = 3000) {
    if (this.snackbarTimeout >= 0) {
      clearInterval(this.snackbarTimeout);
    }
    var snackbar = document.getElementById("snackbar")!;
    snackbar.innerText = "";
    Html(snackbar, "span", [], [severity2class(severity)], severity2symbol(severity));
    Html(snackbar, "span", [], [], text);
    snackbar.style.visibility = "visible";
    snackbar.style.animation = "fadein 0.5s, fadeout 0.5s 2.5s";
    this.snackbarTimeout = <any>setTimeout(() => {
      snackbar.style.visibility = "hidden";
      snackbar.style.animation = "";
      this.snackbarTimeout = -1;
    }, timeout);
  }


  /** Die Arbeitsbereiche in der Reihenfolge des Umschalters (z. B. fuer eine Startseite mit Kacheln). */
  public get Workspaces(): readonly ScreenWorkspace[] {
    return this.workspaces;
  }

  public AddScreenController(url: string, urlPattern: RegExp, caption: TemplateResult<1>, controllerObject: ScreenController, workspace: ScreenWorkspaceOptions = {}){
    this.workspaces.push({
      path: workspacePath(url, urlPattern),
      title: workspace.title ?? (captionText(caption) || url),
      icon: workspace.icon ?? "dashboard",
      group: workspace.group ?? "Allgemein",
      description: workspace.description ?? "",
      urlPattern,
      controller: controllerObject,
    });
    controllerObject.OnCreate();
    return controllerObject
  }

  /**
   * Firmware-Log (opt-in, die Firmware braucht das FirmwareLogPlugin des Webmanagers): Arbeitsbereich
   * "Terminal" mit Log und Konsole, dazu die Glocke in der Titelleiste fuer neue Warnungen und Fehler.
   * commands: zusaetzliche Konsolenbefehle des Projekts.
   */
  public AddTerminal(commands: TerminalCommand[] = [], workspace: ScreenWorkspaceOptions = {}): FirmwareLog {
    const log = new FirmwareLog(this);
    const pattern = new RegExp("^/terminal$");
    this.AddScreenController("terminal", pattern, html`<span>Terminal</span>`, new TerminalScreenController(this, log, commands),
      { title: "Terminal", icon: "terminal", group: "Diagnose", description: "Firmware-Log und Befehle", ...workspace });
    this.shellOptions.notifications ??= {
      initial: () => log.Entries.filter(isWarningOrError).length,
      subscribe: (cb) => void log.Subscribe((added) => cb(added.filter(isWarningOrError).length)),
      path: workspacePath("terminal", pattern),
      title: (n) => (n ? `${n} neue Warnungen/Fehler im Firmware-Log` : "Firmware-Log"),
    };
    return log;
  }

  // ---- Verbindungsanzeige der Shell ----
  private connectionState(): ConnectionState {
    if (this.socket?.readyState === WebSocket.OPEN) return "open";
    if (this.socket?.readyState === WebSocket.CONNECTING || this.reconnectTimeoutHandle >= 0) return "connecting";
    return "closed";
  }

  /** Zustand der WebSocket-Verbindung (wie in der Titelleiste). */
  public get ConnectionState(): ConnectionState {
    return this.connectionState();
  }

  /** cb nach jeder Aenderung von ConnectionState, z. B. um nach dem Verbinden etwas anzufordern. */
  public OnConnectionChange(cb: () => void): void {
    this.connectionListeners.push(cb);
  }

  private connectionChanged(): void {
    for (const l of this.connectionListeners) l();
  }

  public CloseConnection(): void {
    if (this.reconnectTimeoutHandle >= 0) {
      clearTimeout(this.reconnectTimeoutHandle);
      this.reconnectTimeoutHandle = -1;
    }
    this.socket?.close(1000, "Client requested close");
  }

  private setModal(state: boolean) {
    this.modalSpinner.value!.style.display = state ? "flex" : "none";
  }

  private modalSpinnerTimeout() {
    this.setModal(false);
    this.ShowDialog(new OkDialog(Severity.ERROR, "Server did not respond"));
  }


  private extractUsernameFromCookie(): string {
    const cookieString = document.cookie;
    const cookies = cookieString.split(';');
    
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith('username=')) {
        return decodeURIComponent(cookie.substring(9));
      }
    }
    
    // Fallback: Versuche aus Cookie oder localStorage zu ermitteln
    const storedUsername = localStorage.getItem('username');
    return storedUsername || '--unknown--';
  }

  private async logout() {
    // Das Session-Cookie ist bewusst HttpOnly (Schutz vor Diebstahl per XSS) -- 'document.cookie'
    // kann es deshalb NICHT loeschen, das war bisher der eigentliche Bug (Session blieb serverseitig
    // gueltig, ein Reload auf '/' zeigte wieder die SPA statt der Login-Maske). Einziger Weg: der
    // Server selbst invalidiert die Session und schickt ein abgelaufenes Set-Cookie (s. POST /logout
    // in webmanager.hh).
    try {
      await fetch('/logout', { method: 'POST' });
    } catch (error) {
      console.error(`Logout request failed: ${error}`);
    }
    localStorage.removeItem('username');
    console.log('User logged out');
    window.location.href = '/';
  }

  public log(text: string) {
    console.log(text)
  }

  private easteregg() {
    if(this.easterEggFn){
      document.body.innerText = "";
      document.body.innerHTML = "<canvas id='c'>"
      const el = <HTMLCanvasElement>document.getElementById("c")!
      this.easterEggFn(el);
    }
  }

  constructor(
    private readonly appTitle:string, 
    private readonly websocketUrl:string, 
    private readonly easterEggFn: ((canvas: HTMLCanvasElement) => void) | null = null, 
    private readonly additionalFooter:string="",
    chatbot: IChatbot | null = null,
    private readonly shellOptions: AppShellOptions = {}) {
    this.chatbot = chatbot;
  }

  
  public Startup() {
    this.currentUsername = this.extractUsernameFromCookie();
    const Template = html`
            <app-shell></app-shell>
            <div ${ref(this.modalSpinner)} class="modal"><span class="loader"></span></div>
            <div id="snackbar"></div>
            <div ${ref(this.dialog)}></div>
            ${this.chatbot ? this.chatbot.Template() : ""}`
    render(Template, document.body);
    const shell = document.body.querySelector("app-shell") as AppShell;
    for (const w of this.workspaces) {
      const el = document.createElement("screen-workspace") as ScreenWorkspaceElement;
      el.controller = w.controller;
      el.urlPattern = w.urlPattern;
      shell.RegisterApp(w.path, w.title, w.icon, el, { group: w.group, description: w.description });
    }
    const created = new Date(1000 * Number(cfg.CREATION_DT)).toLocaleString("de-DE", MyFavouriteDateTimeFormat);
    const extra = this.additionalFooter.replace(/^\s*::\s*/, "").trim();
    shell.Start({
      productName: this.appTitle,
      logoSvg: this.shellOptions.logoSvg,
      hostLabel: this.shellOptions.hostLabel,
      notifications: this.shellOptions.notifications,
      connection: {
        state: () => this.connectionState(),
        onChange: (cb) => { this.connectionListeners.push(cb); },
        title: "WebSocket-Verbindung zum Geraet",
      },
      user: { name: this.currentUsername, logout: () => void this.logout() },
      statusInfo: `${cfg.APP_NAME} ${cfg.APP_VERSION} · Git ${cfg.GIT_SHORT_HASH} · ${created}${extra ? " · " + extra : ""}`,
      onLogoClick: this.easterEggFn ? () => this.easteregg() : undefined,
    });
    this.connectWebsocket();
  }

  // Baut die Websocket-Verbindung auf (initial UND fuer jeden Reconnect-Versuch).
  // Wichtig: Ein voller Board-Reboot (nach Reflash) reisst die TCP-Verbindung abrupt ab --
  // das ist kein sauberer Close-Handshake (Code 1000/1001), sondern typischerweise 'onerror'
  // gefolgt von 'onclose' mit z.B. Code 1006, oder das Verbinden schlaegt schlicht fehl,
  // solange der Server noch nicht wieder erreichbar ist. Deshalb reicht ein reiner
  // 'onerror'-Handler nicht -- der eigentliche Retry wird ausschliesslich in 'onclose'
  // ausgeloest, da 'onclose' garantiert (auch nach einem Verbindungsfehler) feuert, waehrend
  // 'onerror' das nicht immer tut.
  private connectWebsocket() {
    console.log(`Connecting to ${this.websocketUrl}`)
    this.setModal(true);
    const socket = new WebSocket(this.websocketUrl)
    socket.binaryType = 'arraybuffer'
    this.socket = socket
    this.connectionChanged();
    socket.onopen = (_event) => {
      console.log(`Websocket is connected.`)
      this.setModal(false);
      this.connectionChanged();
      void this.reloadIfWebUiChanged();
      this.reconnectAttempts = 0;
      if (this.isCurrentlyDisconnected) {
        this.isCurrentlyDisconnected = false;
        this.ShowSnackbar(Severity.SUCCESS, "Connection restored")
      }
      if (this.messageBuffer.length>0) {
        console.log(`There are ${this.messageBuffer.length} messages in buffer.`)
        for(const m of this.messageBuffer){
          this.sendMessage(m);

        }
      }
      this.messageBuffer=new Array<BufferedMessage>()
    }
    socket.onerror = (event: Event) => {
      // Nur loggen -- der eigentliche Reconnect wird von 'onclose' angestossen, das nach
      // 'onerror' immer folgt. Wuerde man hier bereits ShowSnackbar/reconnect ausloesen,
      // gaebe es doppelte Reconnect-Versuche bzw. doppelte Fehlermeldungen.
      console.error(`Websocket error ${JSON.stringify(event)}`)
    }
    socket.onmessage = (event: MessageEvent<any>) => {
      this.onWebsocketData(event.data)
    }
    socket.onclose = (event) => {
      if (this.socket !== socket) {
        // Veralteter Socket eines frueheren Verbindungsversuchs -- ignorieren.
        return
      }
      if (event.code == 1000) {
        console.info('The Websocket connection has been closed normally.')
        this.connectionChanged();
        return
      }
      console.error(`Websocket has been closed unexpectedly: ${JSON.stringify(event)}`)
      if (!this.isCurrentlyDisconnected) {
        this.isCurrentlyDisconnected = true;
        this.ShowSnackbar(Severity.ERROR, `Connection lost - reconnecting...`)
      }
      this.setModal(true);
      this.scheduleReconnect();
      this.connectionChanged();
    }
  }

  // Fixes, kurzes Retry-Intervall (kein Exponential-Backoff noetig): das Zielgeraet ist ein
  // Board im LAN, auf dessen Neustart nach einem Flash-Vorgang der Nutzer aktiv wartet --
  // ein paar Sekunden Retry-Abstand sind voellig ausreichend und vermeiden gleichzeitig eine
  // Busy-Loop. Der Timeout-Handle wird gegen Mehrfach-Terminierung abgesichert, damit die
  // Retry-Kette nicht durch einen zweiten parallel geplanten Reconnect verloren geht.
  private scheduleReconnect() {
    if (this.reconnectTimeoutHandle >= 0) {
      return
    }
    this.reconnectAttempts++;
    if (this.reconnectAttempts > AppController.RELOAD_AFTER_ATTEMPTS) {
      console.warn(`Websocket reconnect failed ${this.reconnectAttempts} times -- reloading page (server-side session check will show login form if the session died, e.g. after a board reboot).`)
      window.location.reload();
      return
    }
    this.reconnectTimeoutHandle = <number>(<unknown>setTimeout(() => {
      this.reconnectTimeoutHandle = -1;
      this.connectWebsocket();
    }, AppController.RECONNECT_INTERVAL_MS))
  }
}


