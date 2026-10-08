import { Severity } from "@klaus-liebler/commons";
import { DialogController } from "@klaus-liebler/web-components/typescript/dialog_controller";

// Minimale UI-Dienste, die der Flowchart vom umgebenden Host braucht. IAppManagement
// (AppController) erfuellt das strukturell, ein Standalone-Host ohne Websocket ebenso.
export interface IFlowchartHost {
    ShowSnackbar(severity: Severity, text: string): void;
    ShowDialog(dialogController: DialogController): void;
}

// Optionale Anbindung an ein reales Geraet (z.B. labathome). Ist beim Flowchart KEIN Device
// gesetzt, entfallen alle geraetebezogenen Funktionen: Oeffnen/Speichern auf dem Geraet,
// Debug, "Set as Startup-App", das Laden der Default-FBD beim Start sowie der Binaercompiler
// (lokal exportierte .fbd-Dateien enthalten dann einen leeren Binaerteil, s. Flowchart.createFbdFile).
// Das Protokoll (ws-protocol-Namespace functionblock) kennt nur die Device-Implementierung;
// Antworten reicht sie an Flowchart.OnFbdRunConfirmed()/OnDebugData() weiter.
export interface IFlowchartDevice {
    // Anzeigename in den Menues, z.B. "labathome"
    readonly Name: string;
    // Basis-URL des Datei-Endpunkts auf dem Geraet, z.B. "/files"
    readonly HttpServerBasePath: string;
    RequestFbdRun(): void;
    RequestDebugData(): void;
}

// Pro Datentyp die Werte aller Speicheradressen, wie vom Geraet in ResponseDebugData geliefert.
export interface FlowchartDebugData {
    debugInfoHash: number;
    bools: boolean[];
    integers: number[];
    floats: number[];
    colors: number[];
}
