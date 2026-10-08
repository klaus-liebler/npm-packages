import { ConnectorType, FlowchartInputConnector, FlowchartOutputConnector } from "./FlowchartConnector";
import { FlowchartCompiler, HashAndBufAndMaps } from "./FlowchartCompiler";
import { CycleError } from "./TopologicalSorfDFS";
import { FlowchartLink } from "./FlowchartLink";
import { FlowchartOperator, TypeInfo } from "./FlowchartOperator";
import * as operatorimpl from "./FlowchartOperatorImpl";
import { ColorNumColor2ColorDomString, EventCoordinatesInSVG, Html, Svg } from "@klaus-liebler/web-components/typescript/utils/common";
import { SimulationManager } from "./SimulationManager";
import { FlowchartData, OperatorData, LinkData } from "./FlowchartData";
import { FilelistDialog, FilenameDialog, OkCancelDialog, OkDialog } from "@klaus-liebler/web-components/typescript/dialog_controller";
import { FlowchartDebugData, IFlowchartDevice, IFlowchartHost } from "./FlowchartDevice";
import { Menu, MenuItem, MenuManager, MenuSeparator } from "./MenuManager";
import { KeyValueTuple, Severity } from "@klaus-liebler/commons";
import "./style/flowchart.css"

//see devicemanager.hh
const FBDSTORE_BASE_DIRECTORY = "/spiffs/fbdstore/";    
const DEFAULTFBD_FBD_FILEPATH =  "/spiffs/defaultfbd.fbd";
const TEMPFBD_FBD_FILEPATH = "/spiffs/tempfbd.fbd";

export class FlowchartOptions {
    canUserEditLinks: boolean = true;
    canUserMoveOperators: boolean = true;
    distanceFromArrow: number = 3;
    defaultOperatorClass: string = 'flowchart-default-operator';
    defaultLinkColor: string = '#3366ff';
    defaultSelectedLinkColor: string = 'black';
    linkWidth: number = 10;
    grid: number = 10;
    multipleLinksOnOutput: boolean = true;
    multipleLinksOnInput: boolean = false;
    linkVerticalDecal: number = 0;
}

export class FlowchartCallback {
    onOperatorSelect?: (operatorId: string) => boolean;
    onOperatorUnselect?: () => boolean;
    onOperatorMouseOver?: (operatorId: string) => boolean;
    onOperatorMouseOut?: (operatorId: string) => boolean;
    onLinkSelect?: (link: FlowchartLink) => boolean;
    onLinkUnselect?: (link: FlowchartLink) => boolean;
    onOperatorCreate?: (operatorId: string, operatorData: any, fullElement: boolean) => boolean;
    onLinkCreate?: (linkId: string, linkData: any) => boolean;
    onOperatorDelete?: (operatorId: string) => boolean;
    onLinkDelete?: (linkId: string, forced: boolean) => boolean;
    onOperatorMoved?: (operatorId: string, position: number) => void;
    onAfterChange?: (changeType: any) => void;
}

enum FlowchartMode{
    EDIT,
    SIMULATE,
    DEBUG,
}

export class Flowchart {
    get IsSimulating() { return this.mode==FlowchartMode.SIMULATE; }

    UserMayMoveOperators() {
        return this.mode==FlowchartMode.EDIT && this.options.canUserMoveOperators;
    }
    
    TriggerDebug() {
        if(this.mode!=FlowchartMode.DEBUG || !this.device) return;
        this.device.RequestDebugData();
    }

    private mode=FlowchartMode.EDIT;
    private operatorRegistry: operatorimpl.OperatorRegistry;
    private simulationManager?: SimulationManager | null;
    private operators = new Map<number, FlowchartOperator>();
    private links = new Map<number, FlowchartLink>();
    public static readonly DATATYPE2COLOR = new Map([[ConnectorType.BOOLEAN, "RED"], [ConnectorType.FLOAT, "BLUE"], [ConnectorType.INTEGER, "YELLOW"], [ConnectorType.COLOR, "PURPLE"]]);
    //Muss beim Löschen+Erzeugen von Operatoren+Links und bei Speichern von Properties zurückgesetzt werden
    private currentDebugInfo: HashAndBufAndMaps | null = null;
    private lastOutputConnectorClicked: FlowchartOutputConnector | null = null;
    private selectedOperator: FlowchartOperator | null = null;
    private selectedLink: FlowchartLink | null = null;
    get SelectedLink() { return this.selectedLink };
    get Options() { return this.options; }

    private positionRatio: number = 1;
    get PositionRatio() { return this.positionRatio; }

    private flowchartContainerSvgSvg!: SVGSVGElement;
    get Element() { return this.flowchartContainerSvgSvg; }
    private linksLayer!: SVGGElement;
    get LinkLayer() { return this.linksLayer; }
    private operatorsLayer!: SVGGElement;
    get OperatorsLayer() { return this.operatorsLayer; }
    private operatorLibDiv!: HTMLDivElement;
    private drawer!: HTMLDivElement;
    private drawerHandle!: HTMLButtonElement;
    private static instanceCounter = 0;

    private setDrawerOpen(open: boolean) {
        if (!this.drawer) return;
        this.drawer.classList.toggle("open", open);
        this.drawerHandle.setAttribute("aria-expanded", `${open}`);
        this.operatorLibDiv.inert = !open;
    }
    get ToolsLayer() { return this.operatorLibDiv; }
    private tempLayer!: SVGGElement;
    private temporaryLink!: SVGLineElement;
    private temporaryLinkSnapped = false;
    private propertyGridHtmlDiv!: HTMLDivElement;

    private markerArrow: SVGPathElement|null=null;
    private markerCircle: SVGCircleElement|null=null;

    // Vom Device aufzurufen, sobald eine ResponseDebugData eintrifft.
    public OnDebugData(d: FlowchartDebugData) {
        console.info(`Received debug data`);
        if(this.mode!=FlowchartMode.DEBUG){
            console.warn(`this.mode!=FlowchartMode.DEBUG, is ${FlowchartMode[this.mode]}`)
            return;
        }
        if (this.currentDebugInfo == null){
            console.warn(`this.currentDebugInfo == null`)
            return;
        }
        if (d.debugInfoHash != this.currentDebugInfo.hash) {
            console.error(`${d.debugInfoHash} != ${this.currentDebugInfo.hash}`);
            this.currentDebugInfo = null;
            return;
        }
        this.applyDebugValues(ConnectorType.BOOLEAN, d.bools, (l, v) => { l.SetColor(v ? "red" : "grey"); l.SetCaption("" + v); });
        this.applyDebugValues(ConnectorType.INTEGER, d.integers, (l, v) => l.SetCaption(`${v}`));
        this.applyDebugValues(ConnectorType.FLOAT, d.floats, (l, v) => l.SetCaption(v.toFixed(2)));
        this.applyDebugValues(ConnectorType.COLOR, d.colors, (l, v) => { l.SetCaption("" + v); l.SetColor(ColorNumColor2ColorDomString(v)); });
    }

    private applyDebugValues<T>(connectorType: ConnectorType, values: T[], apply: (link: FlowchartLink, value: T) => void) {
        let map = this.currentDebugInfo!.typeIndex2adressOffset2ListOfLinks.get(connectorType)!;
        //Adressen 0 und 1 sind fuer unbeschaltete Outputs/Inputs reserviert
        for (let adressOffset = 2; adressOffset < values.length; adressOffset++) {
            let value = values[adressOffset];
            let linksToChange = map.get(adressOffset);
            if (linksToChange === undefined) {
                console.error(`linksToColorize===undefined for connectorType ${connectorType} addressOffset ${adressOffset} and value ${value}`);
                continue;
            }
            linksToChange.forEach((e) => apply(e, value));
        }
    }

    public _notifyGlobalMousemoveWithLink(e: MouseEvent) {
        if(this.mode!=FlowchartMode.EDIT) return;
        if (this.lastOutputConnectorClicked != null && !this.temporaryLinkSnapped) {
            let end = EventCoordinatesInSVG(e, this.flowchartContainerSvgSvg, this.positionRatio);
            this.temporaryLink.setAttribute('x2', "" + end.x);
            this.temporaryLink.setAttribute('y2', "" + end.y);
        }
    }

    public _notifyGlobalMouseupWithLink(_e: MouseEvent) {
        if(this.mode!=FlowchartMode.EDIT) return;
        this.unsetTemporaryLink();
    }

    public _notifyOutputConnectorMousedown(c: FlowchartOutputConnector, e: MouseEvent) {
        if(this.mode!=FlowchartMode.EDIT) return;
        this.temporaryLinkSnapped = false;
        let start = c.GetLinkpoint();
        let end = EventCoordinatesInSVG(e, this.flowchartContainerSvgSvg, this.positionRatio);
        this.temporaryLink.setAttribute('x1', "" + start.x);
        this.temporaryLink.setAttribute('y1', "" + start.y);
        this.temporaryLink.setAttribute('x2', "" + end.x);
        this.temporaryLink.setAttribute('y2', "" + end.y);
        this.setTemporaryLink(c);
        document.onmouseup = (e) => {
            document.onmouseup = null;
            document.onmousemove = null;
            this._notifyGlobalMouseupWithLink(e);
        };
        document.onmousemove = (e) => {
            this._notifyGlobalMousemoveWithLink(e);
        };
    }

    public _notifyInputConnectorMouseup(c: FlowchartInputConnector, _e: MouseEvent) {
        if(this.mode!=FlowchartMode.EDIT) return;
        if (this.lastOutputConnectorClicked == null) return;
        if (!this.options.multipleLinksOnInput && c.LinksLength > 0) return;
        if (this.lastOutputConnectorClicked.Type == c.Type) {
            this.createLink(null, this.lastOutputConnectorClicked, c);
        }
        this.unsetTemporaryLink();

    }

    public _notifyOperatorClicked(o: FlowchartOperator, _e: MouseEvent) {
        if(this.mode!=FlowchartMode.EDIT) return;
        this.SelectOperator(o);
    }

    public _notifyLinkClicked(link: FlowchartLink, _e: MouseEvent) {
        if(this.mode!=FlowchartMode.EDIT) return;
        this.selectLink(link);
    }

    public _notifyInputConnectorMouseenter(c: FlowchartInputConnector, _e: MouseEvent) {
        if(this.mode!=FlowchartMode.EDIT) return;
        if (this.lastOutputConnectorClicked == null || this.lastOutputConnectorClicked.Type != c.Type) return;
        if (!this.options.multipleLinksOnInput && c.LinksLength > 0) return;

        this.temporaryLinkSnapped = true;
        let end = c.GetLinkpoint();
        this.temporaryLink.setAttribute("marker-end", "url(#marker-circle)");
        this.temporaryLink.setAttribute('x2', "" + end.x);
        this.temporaryLink.setAttribute('y2', "" + end.y);
    }

    public _notifyInputConnectorMouseleave(_c: FlowchartInputConnector, _e: MouseEvent) {
        if(this.mode!=FlowchartMode.EDIT) return;
        this.temporaryLinkSnapped = false;
        this.temporaryLink.setAttribute("marker-end", "url(#marker-arrow)");
    }

    public unselectLink() {
        if(this.mode!=FlowchartMode.EDIT) return;
        if (this.selectedLink != null) {
            if (this.flowchartCallbacks.onLinkUnselect && !this.flowchartCallbacks.onLinkUnselect(this.selectedLink)) {
                return;
            }
            this.selectedLink.UnsetColor();
            this.selectedLink = null;
        }
    }

    public selectLink(link: FlowchartLink) {
        if(this.mode!=FlowchartMode.EDIT) return;
        this.unselectLink();
        if (this.flowchartCallbacks.onLinkSelect && !this.flowchartCallbacks.onLinkSelect(link)) {
            return;
        }
        this.unselectOperator();
        this.selectedLink = link;
        link.SetColor(this.options.defaultSelectedLinkColor);
    }

    private deleteSelectedThing(): void {
        if(this.mode!=FlowchartMode.EDIT) return;
        if (this.selectedOperator) {
            this.DeleteOperator(this.selectedOperator.GlobalOperatorIndex);
        }
        else if (this.selectedLink) {
            this.DeleteLink(this.selectedLink.GlobalLinkIndex);
        }
    }

    private createFlowchartDataJSONString(): string {
        let operators: OperatorData[] = [];
        let links: LinkData[] = [];
        for (const op of this.operators.values()) {
            operators.push({ globalTypeIndex: op.TypeInfo.GlobalTypeIndex, caption: op.Caption, index: op.GlobalOperatorIndex, posX: op.Xpos, posY: op.Ypos, configurationData: op.Config_Copy });
        }
        for (const link of this.links.values()) {
            links.push({
                fromOperatorIndex: link.From.Parent.GlobalOperatorIndex,
                fromOutput: link.From.LocalConnectorIndex,
                toOperatorIndex: link.To.Parent.GlobalOperatorIndex,
                toInput: link.To.LocalConnectorIndex,
            });
        }
        return JSON.stringify({ operators: operators, links: links });
    }

    private createFbdFile(){
        //Die Datei besteht aus
        //4 Bytes mit der Länge des Binärteils
        //Dem Binärteil
        //Dem JSON-Teil, der die grafische Darstellung enthält
        //Ohne Device wird nicht kompiliert: der Binärteil hat dann die Länge 0. Solche Dateien lassen
        //sich überall wieder öffnen (parseFbdFile liest nur den JSON-Teil) und erhalten ihren
        //Binärteil beim nächsten Speichern auf ein Gerät.
        //Diagramme mit reinen Simulationsbausteinen haben keinen Binaerteil (Firmware kennt sie nicht).
        let binary = new ArrayBuffer(0);
        if (this.device && this.simulationOnlyOperatorNames().length == 0) {
            var guidAndBufAndMap = new FlowchartCompiler(this.operators).Compile();
            this.currentDebugInfo = guidAndBufAndMap;
            binary = guidAndBufAndMap.buf;
        }
        var viewByteLength = new DataView(new ArrayBuffer(4));
        viewByteLength.setUint32(0, binary.byteLength, true); //ESP32 is little-endian: true für little-endian, false für big-endian
        var stringBuffer = new TextEncoder().encode(this.createFlowchartDataJSONString()).buffer;
        var combinedBuffer = new Uint8Array(viewByteLength.byteLength + binary.byteLength + stringBuffer.byteLength);
        combinedBuffer.set(new Uint8Array(viewByteLength.buffer), 0);
        combinedBuffer.set(new Uint8Array(binary), 4);
        combinedBuffer.set(new Uint8Array(stringBuffer), 4 + binary.byteLength);
        return combinedBuffer
    }

    private parseFbdFile(arrayBuffer:ArrayBuffer):FlowchartData {
        const dataView = new DataView(arrayBuffer);
        // Lesen Sie die Länge des Binärteils (erste 4 Bytes)
        const binaryLength = dataView.getUint32(0, true);
        // Extrahieren Sie den Binär- und den JSON-Teil
        //const _binaryPart = new Uint8Array(arrayBuffer, 4, binaryLength);
        const jsonPart = new TextDecoder().decode(arrayBuffer.slice(4 + binaryLength));
        return JSON.parse(jsonPart);
    }

    private saveFbdToLocalFile() {
        let blob = new Blob([this.createFbdFile()], { type: "octet/stream" });
        let url = window.URL.createObjectURL(blob);
        let filename = "functionBlockDiagram.fbd";
        var element = document.createElement('a');
        element.style.display = 'none';
        element.href = url;
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        window.URL.revokeObjectURL(url);
    }

    private openFbdFromLocalFile(files: FileList | null) {
        if (files == null || files.length != 1) return;
        const file = files[0];
        const reader = new FileReader();
        reader.onloadend = (e) => {
            let buf: ArrayBuffer = <ArrayBuffer>e.target!.result;
            try {
                this.setData(this.parseFbdFile(buf));
            } catch (error) {
                console.error(`Error parsing ${file.name}:`, error);
                this.host.ShowDialog(new OkDialog(Severity.ERROR, `${file.name} is not a valid function block diagram`));
            }
        }
        reader.readAsArrayBuffer(file);
    }

    // Vom Device aufzurufen, sobald eine ResponseFbdRun eintrifft.
    public OnFbdRunConfirmed(){
        this.host.ShowSnackbar(Severity.SUCCESS,`File now runs on ${this.device?.Name}`);
    }

    //Namen der Bausteine, die es nur im Simulator gibt (Gruppe "Simulation")
    private simulationOnlyOperatorNames(): string[] {
        const names = new Set<string>();
        this.operators.forEach(o => { if (o.TypeInfo.SimulationOnly) names.add(o.TypeInfo.OperatorName); });
        return [...names];
    }

    private async postFbdFile(path:string, onSuccessAction?:(path:string)=>void, onFailAction?:(path:string)=>void){
        if (!this.device) return;
        const simOnly = this.simulationOnlyOperatorNames();
        if (simOnly.length > 0) {
            this.host.ShowDialog(new OkDialog(Severity.ERROR, `These function blocks exist only in the simulator and cannot run on ${this.device.Name}: ${simOnly.join(", ")}`));
            if (onFailAction) onFailAction(path);
            return;
        }
        try {
            const response = await fetch(this.device.HttpServerBasePath + path, {
                method: 'POST',
                body: this.createFbdFile(),
                headers: {
                'Content-Type': 'application/octet-stream'
                }
            });

            if (!response.ok) {
                this.host.ShowDialog(new OkDialog(Severity.ERROR, `HTTP Error ${response.status}`));
                if (onFailAction) onFailAction(path);
                return;
            }

            this.host.ShowSnackbar(Severity.SUCCESS, `Successfully saved`);
            if (onSuccessAction) onSuccessAction(path);

        } catch (error) {
            console.error('There was a problem with the post operation:', error);
            this.host.ShowDialog(new OkDialog(Severity.ERROR, `Generic Error`));
            if (onFailAction) onFailAction(path);
        }
    }

    private async getFbdFile(path: string) {
        if (!this.device) return;
        try {
            const response = await fetch(this.device.HttpServerBasePath + path);
            if (!response.ok) {
                throw new Error(`Failed to load file from path:path:${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            if (arrayBuffer.byteLength === 0) {
                console.error(`Error loading file from ${path}: File has size 0`);
                return;
            }
            this.setData(this.parseFbdFile(arrayBuffer))
        } catch (error) {
            this.host.ShowDialog(new OkDialog(Severity.ERROR, `Failed to load file from ${path}`));
            console.error(`Error loading file from ${path}:`, error);
        }
    }

    private async deleteFdbFile(path: string) {
        if (!this.device) return;
        try {
            const response = await fetch(this.device.HttpServerBasePath + path, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`Failed to delete file, status: ${response.status}`);
            }

            this.host.ShowSnackbar(Severity.SUCCESS, `File ${path} deleted successfully`);
        } catch (error: any) {
            console.error('There was a problem with the delete operation:', error);
            this.host.ShowSnackbar(Severity.ERROR, `Failed to delete file ${path}: ${error.message}`);
        }
    }

    private async getFbdFileList(path_with_slash_at_the_end:string) {
        if (!this.device) return;
        try {
            const response = await fetch(this.device.HttpServerBasePath + path_with_slash_at_the_end);

            if (!response.ok) {
                throw new Error(`Network response was not ok, status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.files || !data.dirs) {
                throw new Error('Response format is incorrect');
            }

            this.host.ShowDialog(new FilelistDialog((<string[]>data.files).filter(v=>v.endsWith(".fbd")),
                (ok, filename) => {
                    if (!ok) return;
                    this.getFbdFile(path_with_slash_at_the_end + filename);
                },
                (ok, filename) => {
                    if (!ok) return;
                    this.deleteFdbFile(path_with_slash_at_the_end + filename);
                }
            ));
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
            // Optionally, provide user feedback about the error
        }
    }

    private enterFilenameAndPostFbd(){
        this.host.ShowDialog(new FilenameDialog("Enter filename (without Extension", (ok:boolean, filename:string)=>{
            if(!ok) return
            this.postFbdFile(FBDSTORE_BASE_DIRECTORY+filename+".fbd")
        }));

    }

    private modeStatus: HTMLElement | null = null;

    private setMode(mode: FlowchartMode) {
        const editing = mode == FlowchartMode.EDIT;
        if (!editing) {
            //vor dem Moduswechsel, da unselectLink nur im Editiermodus wirkt
            this.unselectOperator();
            this.unselectLink();
            this.setDrawerOpen(false);
        }
        if (this.propertyGridHtmlDiv) this.propertyGridHtmlDiv.hidden = !editing;
        if (this.drawer) this.drawer.hidden = !editing;
        this.mode = mode;
        this.flowchartContainerSvgSvg.classList.remove("edit", "simulate", "debug");
        this.flowchartContainerSvgSvg.classList.add(["edit", "simulate", "debug"][mode]);
        if (this.modeStatus) {
            this.modeStatus.dataset.mode = ["edit", "simulate", "debug"][mode];
            this.modeStatus.lastElementChild!.textContent = ["Editing", "Simulation running", `Debugging on ${this.device?.Name}`][mode];
        }
    }

    // Beendet eine laufende Simulation bzw. Debug-Sitzung und kehrt in den Editiermodus zurück.
    private enterEditMode() {
        this.simulationManager?.Stop();
        this.simulationManager = null;
        this.setMode(FlowchartMode.EDIT);
        this.resetColorsAndCaptions();
    }

    private newDiagram() {
        if (this.operators.size == 0) return;
        this.host.ShowDialog(new OkCancelDialog(Severity.WARN, "Discard the current diagram and start with an empty one?", (ok) => {
            if (ok) this.setData({ operators: [], links: [] });
        }));
    }

    private startSimulation() {
        this.enterEditMode();
        let compilerInstance = new FlowchartCompiler(this.operators);
        let compiled;
        try {
            compiled = compilerInstance.CompileForSimulation();
        } catch (error) {
            if (!(error instanceof CycleError)) throw error;
            this.host.ShowDialog(new OkDialog(Severity.ERROR, "The diagram contains a feedback loop without delay. Insert a DeadTime or PT1 block into the loop."));
            return;
        }
        this.simulationManager = new SimulationManager(compiled);
        this.simulationManager.Start(false);
        this.setMode(FlowchartMode.SIMULATE);
    }

    private buildMenu(subcontainer: HTMLDivElement) {
        let fileInput = <HTMLInputElement>Html(subcontainer, "input", ["type", "file", "id", "fileInput", "accept", ".fbd"]);
        fileInput.style.display = "none";
        fileInput.onchange = (_e) => {
            this.openFbdFromLocalFile(fileInput.files);
            fileInput.value = ""; //damit dieselbe Datei erneut geöffnet werden kann
        }
        const editing = () => this.mode == FlowchartMode.EDIT;
        const fileMenu: (MenuItem | MenuSeparator)[] = [
            new MenuItem("New", ()=>this.newDiagram(), { icon: "📄", enabled: () => this.operators.size > 0 }),
            new MenuItem("Open…", ()=>fileInput.click(), { icon: "📂", shortcut: "Ctrl+O" }),
            new MenuItem("Save", ()=>this.saveFbdToLocalFile(), { icon: "💾", shortcut: "Ctrl+S" }),
        ];
        const menus = [new Menu("File", fileMenu)];
        if (this.device) {
            const d = this.device;
            fileMenu.push(
                new MenuSeparator(),
                new MenuItem(`Open from ${d.Name}…`, ()=>this.getFbdFileList(FBDSTORE_BASE_DIRECTORY), { icon: "📥" }),
                new MenuItem(`Open Default from ${d.Name}`, ()=>this.getFbdFile(DEFAULTFBD_FBD_FILEPATH), { icon: "🏠" }),
                new MenuItem(`Save to ${d.Name}…`, ()=>this.enterFilenameAndPostFbd(), { icon: "📤" }),
            );
            menus.push(new Menu("Debug",[
                new MenuItem("Start Debugging", ()=>this.postFbdFile(TEMPFBD_FBD_FILEPATH,
                    (_p:string)=>{
                        d.RequestFbdRun();
                        this.setMode(FlowchartMode.DEBUG);
                    },
                    (p:string)=>{
                       console.error(`As file "${p}" could no be saved on ${d.Name}, the RequestFbdRun will not be sent to ${d.Name}`)
                    }
                ), { icon: "🐞", shortcut: "F6", enabled: () => this.mode != FlowchartMode.DEBUG }),
                new MenuItem("Stop Debugging", ()=>this.enterEditMode(), { icon: "⏹", shortcut: "Shift+F6", enabled: () => this.mode == FlowchartMode.DEBUG }),
                new MenuSeparator(),
                new MenuItem("Set as Startup App", ()=>this.postFbdFile(DEFAULTFBD_FBD_FILEPATH), { icon: "🚀" }),
            ]));
        }
        menus.push(new Menu("Simulation",[
            new MenuItem("Start Simulation", ()=>this.startSimulation(), { icon: "▶", shortcut: "F5", enabled: editing }),
            new MenuItem("Restart Simulation", ()=>this.startSimulation(), { icon: "🔄", shortcut: "Ctrl+Shift+F5", enabled: () => this.mode == FlowchartMode.SIMULATE }),
            new MenuItem("Stop Simulation", ()=>this.enterEditMode(), { icon: "⏹", shortcut: "Shift+F5", enabled: () => this.mode == FlowchartMode.SIMULATE }),
        ]));
        const bar = new MenuManager(menus).Render(subcontainer);
        this.modeStatus = Html(bar, "div", ["role", "status", "aria-live", "polite"], ["fc-mode-status"]);
        this.modeStatus.dataset.mode = "edit";
        Html(this.modeStatus, "span", ["aria-hidden", "true"], ["fc-mode-dot"]);
        Html(this.modeStatus, "span", [], [], "Editing");
    }
    resetColorsAndCaptions() {
        this.operators.forEach(o=>o.ResetColorsAndCaptions());
        this.links.forEach(l=>l.SetCaption(""))
        this.links.forEach(l=>l.UnsetColor())
    }

    public RenderUi(subcontainer: HTMLDivElement) {
        if (!subcontainer) throw new Error("container is null");
        //let subcontainer = <HTMLDivElement>Html(container, "div", [], ["develop-ui"]);
        

        this.buildMenu(subcontainer);

        let workspace = <HTMLDivElement>Html(subcontainer, "div", ["tabindex", "0"], ["develop-workspace"]);//tabindex, damit keypress-Events abgefangen werden können
        this.propertyGridHtmlDiv = <HTMLDivElement>Html(subcontainer, "div", [], ["develop-properties"]);

        this.flowchartContainerSvgSvg = <SVGSVGElement>Svg(workspace, "svg", ["width", "100%", "height", "100%"], ["flowchart-container", "edit"]);

        this.linksLayer = <SVGGElement>Svg(this.flowchartContainerSvgSvg, "g", [], ["flowchart-links-layer"]);
        this.operatorsLayer = <SVGGElement>Svg(this.flowchartContainerSvgSvg, "g", [], ["flowchart-operators-layer", "unselectable"]);
        this.tempLayer = <SVGSVGElement>Svg(this.flowchartContainerSvgSvg, "g", [], ["flowchart-temporary-link-layer"]);
        this.tempLayer.style.visibility = "hidden";//visible
        let defs = Svg(this.tempLayer, "defs", []);
        let markerArrow = Svg(defs, "marker", ["id", "marker-arrow", "markerWidth", "4", "markerHeight", "4", "refX", "1", "refY", "2", "orient", "0"]);
        this.markerArrow = <SVGPathElement>Svg(markerArrow, "path", ["d", "M0,0 L0,4 L2,2 z", "fill", "red", "stroke", "black", "stroke-width", "0.5"]);
        let markerCircle = Svg(defs, "marker", ["id", "marker-circle", "markerWidth", "4", "markerHeight", "4", "refX", "2", "refY", "2", "orient", "0"]);
        this.markerCircle = <SVGCircleElement>Svg(markerCircle, "circle", ["cx", "2", "cy", "2", "r", "2", "fill", "red", "stroke-width", "1px", "stroke", "black"]);
        this.temporaryLink = <SVGLineElement>Svg(this.tempLayer, "line", ["x1", "0", "y1", "0", "x2", "0", "y2", "0", "stroke-dasharray", "6,6", "stroke-width", "4", "stroke", "black", "fill", "none", "marker-end", "url(#marker-arrow)"]);

        //Drawer am linken Rand: sichtbarer Griff, Bibliothek gleitet beim Ueberfahren/Klicken heraus und beim
        //Verlassen wieder hinein. Griff und Bibliothek bilden ein Element, damit der Wechsel dazwischen nicht flackert.
        this.drawer = <HTMLDivElement>Html(workspace, "div", [], ["fc-drawer"]);
        this.operatorLibDiv = <HTMLDivElement>Html(this.drawer, "div", ["id", `fc-oplib-${Flowchart.instanceCounter++}`, "aria-label", "Function block library"], ["flowchart-operatorlibdiv", "unselectable"]);
        this.drawerHandle = <HTMLButtonElement>Html(this.drawer, "button", ["type", "button", "aria-controls", this.operatorLibDiv.id, "aria-expanded", "false", "title", "Function block library"], ["fc-drawer-handle", "hint"]);
        Html(this.drawerHandle, "span", ["aria-hidden", "true"], ["fc-drawer-grip"]);
        Html(this.drawerHandle, "span", [], ["fc-drawer-label"], "Function Blocks");
        Html(this.drawerHandle, "span", ["aria-hidden", "true"], ["fc-drawer-chevron"], "›");
        //Maus: Ueberfahren oeffnet -- der Klick, mit dem man den Griff "anfasst", darf ihn dann nicht gleich wieder schliessen
        let openedByHoverAt = 0;
        this.drawerHandle.onmouseenter = () => {
            if (this.drawer.classList.contains("open")) return;
            this.setDrawerOpen(true);
            openedByHoverAt = Date.now();
        };
        this.drawerHandle.onclick = () => {
            const isOpen = this.drawer.classList.contains("open");
            if (isOpen && Date.now() - openedByHoverAt < 600) return;
            this.setDrawerOpen(!isOpen);
        };
        this.drawerHandle.onanimationend = () => this.drawerHandle.classList.remove("hint");
        this.drawer.onmouseleave = () => this.setDrawerOpen(false);
        this.setDrawerOpen(false);

        this.flowchartContainerSvgSvg.onclick = (e) => {
            if (e.target == this.Element)//if the click is in a "free" area, then the target is the uppermost layer; the linkLayer!
            {
                this.unselectOperator();
                this.unselectLink();
            }
        }

        workspace.onkeyup = (e) => {
            if (e.key == "Escape") {
                this.setDrawerOpen(false);
                this.unselectOperator();
                this.unselectLink();
            }
            else if (e.key == "Delete") {
                console.debug("Flowchart workspace.onkeyup with e.target=" + e.target + " und Delete-Key");
                this.deleteSelectedThing();
            }
            else {
                console.debug("Flowchart workspace.onkeyup with e.target=" + e.target + " und key " + e.key);
            }
        }

        this.operatorRegistry.populateOperatorLib(this.operatorLibDiv, (e: MouseEvent, ti: TypeInfo) => {
            let caption = ti.OperatorName;
            let o = this.createOperatorInternal(ti.GlobalTypeIndex, caption, null);
            let coords = EventCoordinatesInSVG(e, this.Element);
            o.MoveTo(coords.x - 10, coords.y - 10);
            o.RegisterDragging(e);
            this.operators.set(o.GlobalOperatorIndex, o);
        });

        this.recreateFlowchartFromData();
        this.renderPropertyPanel();
        if (this.device) this.getFbdFile(DEFAULTFBD_FBD_FILEPATH);
    }

    // device==null: Standalone-Betrieb ohne Hardware (nur Editor, Simulation, lokaler Import/Export)
    constructor(private host: IFlowchartHost, private flowchartData: FlowchartData, private flowchartCallbacks: FlowchartCallback, private options: FlowchartOptions = new FlowchartOptions(), private device: IFlowchartDevice | null = null) {
        this.operatorRegistry = operatorimpl.OperatorRegistry.Build();
    }


    private createOperatorInternal(globalTypeIndex: number, caption: string, configurationData: KeyValueTuple[] | null): FlowchartOperator {

        if (!this.operatorRegistry.IsIndexKnown(globalTypeIndex)) {
            throw new Error(`Unknown globalTypeIndex ${globalTypeIndex}`);
        }
        if (this.flowchartCallbacks.onOperatorCreate && !this.flowchartCallbacks.onOperatorCreate(caption, null, false)) {
            throw new Error(`Creation of operator of globalTypeIndex ${globalTypeIndex} prevented by onOperatorCreate plugin`);
        }
        let op = this.operatorRegistry.CreateByIndex(globalTypeIndex, this, caption, configurationData)!;

        this.currentDebugInfo = null;
        return op;
    }

    public setData(data: FlowchartData) {
        this.enterEditMode();
        this.flowchartData = data;
        this.recreateFlowchartFromData();

    }

    private recreateFlowchartFromData() {
        this.selectedOperator = null;
        this.selectedLink = null;
        this.renderPropertyPanel();
        this.links.forEach((e) => e.RemoveFromDOM());
        this.links.clear();
        this.operators.forEach((e) => e.RemoveFromDOM());
        this.operators.clear();
        FlowchartOperator.ResetMaxIndex();
        let indexInData2operator = new Map<number, FlowchartOperator>();

        for (const d of this.flowchartData!.operators) {
            let o = this.createOperatorInternal(d.globalTypeIndex, d.caption, d.configurationData);
            o.MoveTo(d.posX, d.posY);
            this.operators.set(o.GlobalOperatorIndex, o);
            indexInData2operator.set(d.index, o);
        }
        for (const d of this.flowchartData!.links) {
            let fromOp = indexInData2operator.get(d.fromOperatorIndex);
            let toOp = indexInData2operator.get(d.toOperatorIndex);
            if (fromOp === undefined || toOp === undefined) continue;
            let fromConn = fromOp.GetOutputConnectorByIndex(d.fromOutput);
            let toConn = toOp.GetInputConnectorByIndex(d.toInput);
            if (fromConn == null || toConn == null) continue;
            this.createLink(d, fromConn, toConn);
        }
    }

    public DeleteLink(globalLinkIndex: number) {
        this.currentDebugInfo = null;
        let l = this.links.get(globalLinkIndex);
        if (l === undefined) {
            throw Error("Link to delete is undefined")
        }
        if (this.selectedLink == l) {
            this.unselectLink();
        }
        l.RemoveFromDOM();
        this.links.delete(globalLinkIndex);
        l.To.RemoveLink(l);
        l.From.RemoveLink(l);
        this.refreshPanelIfAffected(l);
    }

    public DeleteOperator(globalOperatorIndex: number) {
        this.currentDebugInfo = null;
        let o = this.operators.get(globalOperatorIndex);
        if (o === undefined) {
            throw Error("Operator to delete is undefined")
        }
        if (this.selectedOperator == o) {
            this.unselectOperator();
        }
        o.RemoveFromDOM();
        this.operators.delete(o.GlobalOperatorIndex);
        for (const outputKV of o.OutputsKVIt) {
            for (const linkKV of outputKV[1].LinksKVIt) {
                this.DeleteLink(linkKV[1].GlobalLinkIndex);
            }
        }
        for (const inputKV of o.InputsKVIt) {
            for (const linkKV of inputKV[1].LinksKVIt) {
                this.DeleteLink(linkKV[1].GlobalLinkIndex);
            }
        }
    }

    public createLink(data: LinkData | null, from: FlowchartOutputConnector, to: FlowchartInputConnector): FlowchartLink | null {
        if (this.flowchartCallbacks.onLinkCreate && !this.flowchartCallbacks.onLinkCreate(from.Caption, data)) return null;
        if (!this.options.multipleLinksOnOutput && from.LinksLength > 0) return null;
        if (!this.options.multipleLinksOnInput && to.LinksLength > 0) return null;
        this.currentDebugInfo = null;
        let l: FlowchartLink = new FlowchartLink(this, "", this.Options.defaultLinkColor, from, to);
        from.AddLink(l);
        to.AddLink(l);
        this.links.set(l.GlobalLinkIndex, l);
        this.refreshPanelIfAffected(l);
        return l;
    }

    private refreshPanelIfAffected(l: FlowchartLink) {
        const sel = this.selectedOperator;
        if (sel && (l.From.Parent == sel || l.To.Parent == sel)) this.renderPropertyPanel();
    }

    private unsetTemporaryLink() {
        this.lastOutputConnectorClicked = null;
        this.tempLayer.style.visibility = "hidden";
    }

    private setTemporaryLink(c: FlowchartOutputConnector) {
        this.lastOutputConnectorClicked = c;
        let color = Flowchart.DATATYPE2COLOR.get(c.Type)
        if (!color) color = "BLACK";
        this.markerArrow!.style.fill = color;
        this.markerCircle!.style.fill = color;
        this.tempLayer.style.visibility = "visible";
    }

    private unselectOperator() {
        if (this.flowchartCallbacks.onOperatorUnselect && !this.flowchartCallbacks.onOperatorUnselect()) return;
        if (this.selectedOperator != null) this.selectedOperator.ShowAsSelected(false);
        this.selectedOperator = null;
        this.renderPropertyPanel();
    }

    public SelectOperator(operator: FlowchartOperator): void {
        if (this.flowchartCallbacks.onOperatorSelect && !this.flowchartCallbacks.onOperatorSelect(operator.Caption)) return;
        this.unselectLink();
        if (this.selectedOperator != null) this.selectedOperator.ShowAsSelected(false);
        operator.ShowAsSelected(true);
        this.selectedOperator = operator;
        this.renderPropertyPanel();
    }

    //Properties-Panel: Kopf (Gruppe, umbenennbarer Name, Typ, Beschreibung), Parameter (werden sofort
    //uebernommen, ungueltige Eingaben markiert und ignoriert), Verbindungen (Klick springt zur Gegenstelle)
    //und Loeschen. Ausserhalb des Editiermodus schreibgeschuetzt.
    private renderPropertyPanel() {
        const panel = this.propertyGridHtmlDiv;
        if (!panel) return;
        panel.innerText = "";
        const operator = this.selectedOperator;
        if (operator == null) {
            const empty = Html(panel, "div", [], ["fc-props-empty"]);
            Html(empty, "div", ["aria-hidden", "true"], ["fc-props-empty-icon"], "⬚");
            Html(empty, "p", [], ["fc-props-empty-title"], "No block selected");
            Html(empty, "p", [], [], "Click a function block to see and edit its properties.");
            const tips = Html(empty, "ul", [], ["fc-props-tips"]);
            Html(tips, "li", [], [], "Pull out the block library from the tab at the left edge.");
            Html(tips, "li", [], [], "Drag from an output to an input of the same type to connect.");
            Html(tips, "li", [], [], "Del deletes the selected block or link.");
            return;
        }
        const editable = this.mode == FlowchartMode.EDIT;
        const ti = operator.TypeInfo;

        const header = Html(panel, "div", [], ["fc-props-header"]);
        Html(header, "div", [], ["fc-props-group"], `${operatorimpl.OPERATOR_GROUP_ICONS[ti.GroupName] ?? "▪"} ${ti.GroupName} · ${ti.OperatorName}`);
        const name = <HTMLInputElement>Html(header, "input", ["type", "text", "aria-label", "Block name", "spellcheck", "false", "maxlength", "32", "value", operator.Caption], ["fc-props-name"]);
        name.disabled = !editable;
        name.oninput = () => operator.SetCaption(name.value.trim() || ti.OperatorName);
        name.onkeydown = (e) => { if (e.key == "Enter" || e.key == "Escape") name.blur(); e.stopPropagation(); };
        name.onchange = () => { name.value = operator.Caption; };
        if (ti.Description) Html(header, "p", [], ["fc-props-description"], ti.Description);

        //Parameter
        const paramSection = Html(panel, "section", [], ["fc-props-section"]);
        const paramHead = Html(paramSection, "h4", [], ["fc-props-section-title"], "Parameters");
        const applied = Html(paramHead, "span", ["role", "status", "aria-live", "polite"], ["fc-props-applied"]);
        const fieldset = <HTMLFieldSetElement>Html(paramSection, "fieldset", [], ["fc-props-fieldset"]);
        fieldset.disabled = !editable;
        const table = <HTMLTableElement>Html(fieldset, "table", [], ["develop-propertygrid-table"]);
        const tbody = <HTMLTableSectionElement>Html(table, "tbody", [], []);
        if (operator.PopulateProperyGrid(tbody)) {
            let appliedTimer = -1;
            const apply = (e: Event) => {
                const target = <HTMLInputElement>e.target;
                const fields = Array.from(tbody.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select"));
                let allValid = true;
                for (const f of fields) {
                    const valid = f.checkValidity() && !(f instanceof HTMLInputElement && f.type == "number" && f.value.trim() == "");
                    f.classList.toggle("invalid", !valid);
                    f.title = valid ? "" : (f.validationMessage || "Please enter a value");
                    allValid &&= valid;
                }
                if (!allValid || !target) return;
                operator.SavePropertyGrid(tbody);
                this.currentDebugInfo = null;
                applied.textContent = "✓ applied";
                applied.classList.add("visible");
                window.clearTimeout(appliedTimer);
                appliedTimer = window.setTimeout(() => applied.classList.remove("visible"), 1200);
            };
            tbody.addEventListener("input", apply);
            tbody.addEventListener("change", apply);
            //Tastatureingaben im Panel duerfen nicht als "Delete"-Kuerzel der Arbeitsflaeche ankommen
            tbody.addEventListener("keyup", (e) => e.stopPropagation());
        } else {
            fieldset.remove();
            Html(paramSection, "p", [], ["fc-props-none"], "This block has no parameters.");
        }

        //Verbindungen
        const connSection = Html(panel, "section", [], ["fc-props-section"]);
        Html(connSection, "h4", [], ["fc-props-section-title"], "Connections");
        const list = Html(connSection, "dl", [], ["fc-props-connections"]);
        const addRow = (connector: FlowchartInputConnector | FlowchartOutputConnector, direction: "in" | "out") => {
            const dt = Html(list, "dt", [], []);
            Html(dt, "span", ["title", ConnectorType[connector.Type]], ["fc-type-dot", `type-${ConnectorType[connector.Type].toLowerCase()}`]);
            Html(dt, "span", [], [], connector.Caption);
            Html(dt, "span", [], ["fc-conn-dir"], direction == "in" ? "input" : "output");
            const dd = Html(list, "dd", [], []);
            const links = connector.GetLinksCopy();
            if (links.length == 0) {
                Html(dd, "span", [], ["fc-conn-none"], "not connected");
                return;
            }
            for (const l of links) {
                const other = direction == "in" ? l.From : l.To;
                const b = <HTMLButtonElement>Html(dd, "button", ["type", "button", "title", `Select ${other.Parent.Caption}`], ["fc-conn-peer"], `${direction == "in" ? "←" : "→"} ${other.Parent.Caption} · ${other.Caption}`);
                b.onclick = () => this.SelectOperator(other.Parent);
            }
        };
        for (const [, c] of operator.InputsKVIt) addRow(c, "in");
        for (const [, c] of operator.OutputsKVIt) addRow(c, "out");

        //Loeschen
        const actions = Html(panel, "div", [], ["fc-props-actions"]);
        const del = <HTMLButtonElement>Html(actions, "button", ["type", "button"], ["fc-props-delete"]);
        Html(del, "span", ["aria-hidden", "true"], [], "🗑");
        Html(del, "span", [], [], "Delete block");
        Html(del, "kbd", [], [], "Del");
        del.disabled = !editable;
        del.onclick = () => this.DeleteOperator(operator.GlobalOperatorIndex);
    }

    // Found here : http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
    public static _shadeColor(color: string, percent: number) {
        var f = parseInt(color.slice(1), 16), t = percent < 0 ? 0 : 255, p = percent < 0 ? percent * -1 : percent, R = f >> 16, G = f >> 8 & 0x00FF, B = f & 0x0000FF;
        return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
    }
}
