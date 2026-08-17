import "../style/app.css"
import { TemplateResult, html, render } from "lit-html";
import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { IChatbot } from "./utils/interfaces";
import { DialogController, OkDialog } from "./dialog_controller";
import { DefaultScreenController, ScreenController } from "./screen_controller/screen_controller";
import { Html} from "./utils/common";
import { MyFavouriteDateTimeFormat, Severity, severity2class, severity2symbol} from "@klaus-liebler/commons";
import { IAppManagement, IScreenControllerHost, IMessageListener } from "./utils/interfaces";
import RouterMenu, { IRouteHandler, Route } from "./utils/routermenu";
import {ArrayBufferToHexString} from "@klaus-liebler/commons"
import * as cfg from "@generated/runtimeconfig_ts"


class Router2ContentAdapter implements IRouteHandler {
  constructor(public readonly child: ScreenController, public readonly app: AppController) { }
  handleRoute(params: RegExpMatchArray): void {

    console.log("Router2ContentAdapter->handleRoute")
    this.app.SetMain(this.child, params)
  }
}

// 'data' ist immer ein bereits vollstaendig gerahmter Frame (4-Byte-Kopf inkl.) -- AppController
// haengt selbst keinen Praefix mehr an, s. IAppManagement.SendFrame.
class BufferedMessage {
  constructor(public data: Uint8Array, public namespaceId: number, public maxLockingTimeMs: number) { }
}

export class AppController implements IAppManagement, IScreenControllerHost {
  private routes: Array<Route> = []

  private namespaceId2listener = new Map<number, Array<IMessageListener>>();
  private lockingNamespaceId:number|null=null;
  private socket: WebSocket | null = null;
  private messageBuffer = new Array<BufferedMessage>();
  private modalSpinner: Ref<HTMLDivElement> = createRef();
  private modalSpinnerTimeoutHandle: number = -1;

  private currentUsername: string = "";
  private userMenuRef: Ref<HTMLDivElement> = createRef();

  private menu = new RouterMenu("/", this.routes);
  private mainContent: ScreenController = new DefaultScreenController(this);
  private mainRef: Ref<HTMLInputElement> = createRef();
  
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
  // 'bytes' ist bereits ein vollstaendig gerahmter Frame (4-Byte-Kopf namespaceId:u16+
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
    const view = new DataView(arrayBuffer);
    const namespaceId = view.getUint16(0, true);
    const messageTypeId = view.getUint16(2, true);
    console.debug(`A message of namespaceId ${namespaceId}/messageTypeId ${messageTypeId} with length ${arrayBuffer.byteLength} has arrived: ${ArrayBufferToHexString(arrayBuffer)} .`)
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


  public SetMain(child: ScreenController, params: RegExpMatchArray) {
    this.mainContent.OnPausePublic();
    this.mainContent = child
    //this.mainRef.value!.innerText=""
    render(this.mainContent.Template(), this.mainRef.value!)
    this.mainContent.OnStartPublic();
    child.SetParameter(params)
  }

  public AddScreenController(url: string, urlPattern: RegExp, caption: TemplateResult<1>, controllerObject: ScreenController){ 
    var w = new Route(url, urlPattern, caption, new Router2ContentAdapter(controllerObject, this))
    this.routes.push(w)
    controllerObject.OnCreate();
    return controllerObject
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

  private logout() {
    // Cookies löschen (Session)
    document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; HttpOnly';
    document.cookie = 'username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    localStorage.removeItem('username');
    
    // Zur Login-Seite umleiten
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
    chatbot: IChatbot | null = null) {
    this.chatbot = chatbot;
  }

  
  public Startup() {
    this.currentUsername = this.extractUsernameFromCookie();
    const bg=`<svg viewBox="0 0 1440 360" xmlns="http://www.w3.org/2000/svg"><path fill="#9EAFFD" opacity="0.3" d="M0 432 V216 Q432 43.2 864 216 V432z" /><path fill="#9EAFFD" opacity="0.7" d="M0 432 V172.8 Q432 244.8 792 172.8 T1440 158.4 V432z" /></svg>`
    const svgDataUrl = `data:image/svg+xml;base64,${btoa(bg)}`;
    const Template = html`
            <header style="background-image: url('${svgDataUrl}');">
              <span @click=${() => this.easteregg()}> ${this.appTitle} </span>
              <div class="user-info" ${ref(this.userMenuRef)}>
                <span class="username">👤 ${this.currentUsername}</span>
                <button class="logout-btn" @click=${() => this.logout()} title="Abmelden">Logout</button>
              </div>
            </header>
            <nav>${this.menu.Template()}<a href="javascript:void(0);" @click=${() => this.menu.ToggleHamburgerMenu()}><i>≡</i></a></nav>
            <main ${ref(this.mainRef)}></main>
            <footer>Klaus Liebler, &copy;${new Date(1000*Number(cfg.CREATION_DT)).toLocaleString("de-DE", MyFavouriteDateTimeFormat)} :: GitHash ${cfg.GIT_SHORT_HASH} :: AppName ${cfg.APP_NAME} :: AppVersion ${cfg.APP_VERSION} ${this.additionalFooter}</footer>
            <div ${ref(this.modalSpinner)} class="modal"><span class="loader"></span></div>
            <div id="snackbar">Some text some message..</div>
            <div ${ref(this.dialog)}></div>
            ${this.chatbot ? this.chatbot.Template() : ""}`
    render(Template, document.body);
    window.onresize=()=>{
      this.menu.ShowHamburgerMenuIfLargeScreen()
    };
    console.log(`Connecting to ${this.websocketUrl}`)
    this.setModal(true);
    this.socket = new WebSocket(this.websocketUrl)
    this.socket.binaryType = 'arraybuffer'
    this.socket.onopen = (_event) => {
      console.log(`Websocket is connected.`)
      this.setModal(false);
      if (this.messageBuffer.length>0) {
        console.log(`There are ${this.messageBuffer.length} messages in buffer.`)
        for(const m of this.messageBuffer){
          this.sendMessage(m);

        }
      }
      this.messageBuffer=new Array<BufferedMessage>()
    }
    this.socket.onerror = (event: Event) => {
      console.error(`Websocket error ${JSON.stringify(event)}`)
      this.ShowSnackbar(Severity.ERROR, "Websocket Error")
      this.setModal(true);
    }
    this.socket.onmessage = (event: MessageEvent<any>) => {
      this.onWebsocketData(event.data)
    }
    this.socket.onclose = (event) => {
      if (event.code == 1000) {
        console.info('The Websocket connection has been closed normally. But why????')
        return
      }
      console.error(`Websocket has been closed: ${JSON.stringify(event)}`)
      this.ShowSnackbar(Severity.ERROR, `Websocket has been closed`)
      this.setModal(true);
    }
    this.menu.check();
    //this.chatbot.Setup();

  }
}


