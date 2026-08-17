
import { DialogController } from "../dialog_controller";
import { TemplateResult } from "lit-html";
import { ScreenController } from "../screen_controller/screen_controller";
import { Severity } from "@klaus-liebler/commons";

export interface IChatbot {
  Template(): TemplateResult | string;
}

export interface IDialogController____ {
    ShowDialog(pHandler?: ((ok: boolean, value: string) => any)): void;
};

export interface IDialogBodyRenderer {
    Render(dialogBody: HTMLElement): HTMLInputElement | null;
}

export interface IHtmlRenderer {
    RenderStatic(c: HTMLElement): void;
}

// Einheitlicher, protokoll-agnostischer Nachrichten-Listener -- ersetzt das vormalige
// IWebsocketMessageListener(namespace, flatbuffers.ByteBuffer). 'view' ist der KOMPLETTE Frame
// inkl. 4-Byte-Kopf (kein Slicing mehr durch AppController) -- jeder Consumer interpretiert seine
// eigenen Bytes selbst (ws-protocol-Consumer rufen die generierten <namespace>.<Message>.decode()-
// Funktionen direkt mit offset=0 auf; noch nicht migrierte Flatbuffers-Consumer wrappen sich ihr
// eigenes flatbuffers.ByteBuffer aus view selbst, s. AppController-Kommentar).
export interface IMessageListener {
    OnMessage(namespaceId: number, messageTypeId: number, view: DataView): void;
}
export interface IScreenControllerHost {
   AddScreenController(url: string, urlPattern: RegExp, caption: TemplateResult<1>, controller:ScreenController):void;
}

export interface IAppManagement {
    RegisterNamespace(listener: IMessageListener, namespaceId: number): (() => void);
    Unregister(listener: IMessageListener): void;
    // 'bytes' ist immer ein bereits vollstaendig gerahmter Frame (4-Byte-Kopf inkl.) -- AppController
    // stellt selbst keinen Praefix mehr voran, jeder Aufrufer liefert fertige Bytes.
    SendFrame(namespaceId: number, bytes: Uint8Array, maxLockingTimeMs?: number): void;
    ShowSnackbar(severity: Severity, text: string): void;
    ShowDialog(dialogController: DialogController): void;
    // Schliesst die aktuelle Websocket-Verbindung bewusst (Code 1000) -- z.B. wenn der Server
    // ankuendigt, seinen eigenen Access Point gleich abzuschalten (erfolgreicher WifiConnect):
    // ein "normal closure" wird von AppController.onclose stillschweigend ignoriert (kein
    // Fehler-Snackbar, kein Dauerspinner), im Gegensatz zu einem unerwarteten Verbindungsabbruch.
    CloseConnection(): void;
};