import { SortedOperatorsAndMaps } from "./FlowchartCompiler";
import { ConnectorType, FlowchartInputConnector, FlowchartOutputConnector } from "./FlowchartConnector";
import { SimulationContext } from "./SimulationContext";

//Speicheraufteilung wie auf dem Geraet (FlowchartCompiler.createLookupMaps): unbeschaltete Outputs
//schreiben auf Adresse 0, unbeschaltete Inputs lesen von Adresse 1 (false, 0, 0.0, schwarz),
//beschaltete Outputs belegen fortlaufend ab Adresse 2.
const UNCONNECTED_INPUT_ADDRESS = 1;
const DEFAULT_COLOR = "#000000";

export class SimulationManager implements SimulationContext{
    private booleans!: boolean[];
    private integers!:number[];
    private floats!:number[];
    private colors!:string[];
    private millisSince1970!:number;
    private running:boolean=false;

    constructor(private sortedOperatorsAndMaps: SortedOperatorsAndMaps){
        this.resetDatastructures();
    }

    private resetDatastructures(){
        const size = (t: ConnectorType) => this.sortedOperatorsAndMaps.typeIndex2maxOffset.get(t)!;
        this.booleans = new Array(size(ConnectorType.BOOLEAN)).fill(false);
        this.integers = new Array(size(ConnectorType.INTEGER)).fill(0);
        this.floats = new Array(size(ConnectorType.FLOAT)).fill(0);
        this.colors = new Array(size(ConnectorType.COLOR)).fill(DEFAULT_COLOR);
        this.millisSince1970=Date.now();
    }

    private outputAddress(outConn: FlowchartOutputConnector): number {
        return this.sortedOperatorsAndMaps.typeIndex2globalConnectorIndex2adressOffset.get(outConn.Type)!.get(outConn.GlobalConnectorIndex)!;
    }

    private inputAddress(inConn: FlowchartInputConnector): number {
        const source = inConn.GetGlobalConnectorIndexOfSignalSource();
        if (source < 0) return UNCONNECTED_INPUT_ADDRESS;
        return this.sortedOperatorsAndMaps.typeIndex2globalConnectorIndex2adressOffset.get(inConn.Type)!.get(source) ?? UNCONNECTED_INPUT_ADDRESS;
    }

    SetBoolean(outConn: FlowchartOutputConnector, value: boolean): void {
        this.booleans[this.outputAddress(outConn)]=value;
    }
    SetInteger(outConn: FlowchartOutputConnector, value: number): void {
        //int32-Semantik wie auf dem Geraet
        this.integers[this.outputAddress(outConn)]=value|0;
    }
    SetFloat(outConn: FlowchartOutputConnector, value: number): void {
        this.floats[this.outputAddress(outConn)]=Math.fround(value);
    }
    SetColor(outConn: FlowchartOutputConnector, value: string): void {
        this.colors[this.outputAddress(outConn)]=value;
    }
    GetBoolean(inConn: FlowchartInputConnector): boolean {
        return this.booleans[this.inputAddress(inConn)];
    }
    GetInteger(inConn: FlowchartInputConnector): number {
        return this.integers[this.inputAddress(inConn)];
    }
    GetFloat(inConn: FlowchartInputConnector): number {
        return this.floats[this.inputAddress(inConn)];
    }
    GetColor(inConn: FlowchartInputConnector): string {
        return this.colors[this.inputAddress(inConn)];
    }

    public Start(warmstart:boolean=false){
        if(!warmstart) this.resetDatastructures();
        this.running=true;
        for(let o of this.sortedOperatorsAndMaps.sortedOperators){
            o.OnSimulationStart(this);
        }
        window.requestAnimationFrame(()=>this.Step());
    }

    public Stop(){
        if(!this.running) return;
        this.running=false;
        for(let o of this.sortedOperatorsAndMaps.sortedOperators){
            o.OnSimulationStop(this);
        }
    }

    private forEachConnectedAddress<T>(type: ConnectorType, values: T[], apply: (link: import("./FlowchartLink").FlowchartLink, value: T) => void) {
        for (const [adressOffset, links] of this.sortedOperatorsAndMaps.typeIndex2adressOffset2ListOfLinks.get(type)!.entries()) {
            if (adressOffset < 2) continue;
            const value = values[adressOffset];
            links.forEach((l) => apply(l, value));
        }
    }

    Step():void{
        if(!this.running) return;
        this.millisSince1970= Date.now();
        for(let o of this.sortedOperatorsAndMaps.sortedOperators){
            o.OnSimulationStep(this);
        }
        this.forEachConnectedAddress(ConnectorType.BOOLEAN, this.booleans, (l, v) => { l.SetColor(v ? "red" : "grey"); l.SetCaption("" + v); });
        this.forEachConnectedAddress(ConnectorType.INTEGER, this.integers, (l, v) => l.SetCaption("" + v));
        this.forEachConnectedAddress(ConnectorType.FLOAT, this.floats, (l, v) => l.SetCaption(Number.isInteger(v) ? `${v}` : v.toFixed(2)));
        this.forEachConnectedAddress(ConnectorType.COLOR, this.colors, (l, v) => { l.SetCaption(v); l.SetColor(v); });
        window.requestAnimationFrame(()=>this.Step());
    }

    GetMillis(): number {
        return this.millisSince1970;
    }

}
