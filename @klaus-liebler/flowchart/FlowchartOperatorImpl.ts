import {FlowchartOperator, TypeInfo, PositionType, SingletonType} from "./FlowchartOperator";
import {Flowchart} from "./Flowchart";
import {FlowchartInputConnector, FlowchartOutputConnector, ConnectorType} from "./FlowchartConnector";
import { SerializeContextAndAdressMap } from "./FlowchartCompiler";
import {ColorDomString2ColorNum, Html, Svg, InputColor, InputFloatNumber, InputIntegerNumber, InputSelect} from "@klaus-liebler/web-components/typescript/utils/common";
import { zzfx } from "@klaus-liebler/web-components/typescript/zzfx";
import * as Song from "./Songs";
import { SimulationContext } from "./SimulationContext";
import { KeyValueTuple, StringNumberTuple } from "@klaus-liebler/commons";

//Referenz fuer Semantik und Binaerformat aller Bausteine: labathome_firmware/main/functionblocks.hh
//(Klassen FB_*) und devicemanager.cc (ParseFBD: pro Baustein Typ, Instanz-Index, Input-Adressen,
//Output-Adressen, dann SerializeFurtherProperties -- Anzahl und Reihenfolge muessen exakt passen).

const Basic="Basic";
const Arithmetic="Arithmetic";
const Input="Input";
const Sensor = "Sensor";
const Output="Output";
const Converter="Converter";
const Sound = "Sound";
const Control = "Control";
//nur im Simulator (keine Firmware-Entsprechung), Typ-Indizes ab 100
const Simulation = "Simulation";
//@ts-ignore
const Custom ="Custom";

const OPERATOR_DESCRIPTIONS: Record<number, string> = {
    1: "C is TRUE if both A and B are TRUE.",
    2: "C is TRUE if A or B (or both) is TRUE.",
    3: "C is TRUE if exactly one of A and B is TRUE.",
    4: "OUT is the negation of IN.",
    5: "Flip-flop, reset dominant: S sets the output, R resets it. If both are TRUE, R wins.",
    6: "Flip-flop, set dominant: S sets the output, R resets it. If both are TRUE, S wins.",
    7: "Constant TRUE.",
    8: "Constant FALSE.",
    9: "Up counter: counts rising edges at CU up to PV. OUT is TRUE when CV ≥ PV. Reset sets CV to 0.",
    10: "Accumulates the time in ms during which CU is TRUE. OUT is TRUE when CV_ms ≥ PV_ms. Reset sets CV_ms to 0.",
    11: "On-delay (IEC 61131-3): OUT becomes TRUE PT_MS milliseconds after TRIGGER became TRUE. ET_MS shows the elapsed time.",
    12: "Off-delay (IEC 61131-3): OUT follows TRIGGER to TRUE immediately and falls back PT_MS milliseconds after TRIGGER became FALSE.",
    13: "C = A + B",
    14: "C = A − B",
    15: "C = A × B",
    16: "C = A ÷ B (division by 0 yields ±Infinity).",
    17: "C is the larger of A and B.",
    18: "C is the smaller of A and B.",
    19: "C is TRUE if A > B.",
    20: "C is TRUE if A < B.",
    21: "Constant floating point value.",
    22: "Constant integer value.",
    23: "Output = Input, clamped to the range [Minimum, Maximum].",
    24: "Limit monitor with hysteresis: ULE is TRUE above Maximum (released at Maximum − Hysterese), LLE is TRUE below Minimum (released at Minimum + Hysterese).",
    25: "Outputs one of two configurable colors depending on IN.",
    26: "Outputs one of two configurable integers depending on IN.",
    27: "Outputs one of two configurable floating point values depending on IN.",
    28: "OUT is TRUE if IN ≥ Limit for TRUE.",
    29: "Converts an integer into a floating point value.",
    30: "Converts a floating point value into an integer (the fractional part is truncated).",
    31: "Green push button. Simulation: click to toggle.",
    32: "Push button of the rotary encoder. Simulation: click to toggle.",
    33: "Position of the rotary encoder (0…100). Simulation: click or use the mouse wheel.",
    34: "Red push button. Simulation: click to toggle.",
    35: "Voltage at analog input 0. Simulation: click or use the mouse wheel.",
    36: "Voltage at analog input 1. Simulation: click or use the mouse wheel.",
    37: "Voltage at analog input 2. Simulation: click or use the mouse wheel.",
    38: "Voltage at analog input 3. Simulation: click or use the mouse wheel.",
    39: "Motion sensor. Simulation: click to toggle.",
    40: "Air temperature in °C. Simulation: click or use the mouse wheel.",
    41: "Relative air humidity in %. Simulation: click or use the mouse wheel.",
    42: "Air pressure in Pa. Simulation: click or use the mouse wheel.",
    43: "CO₂ concentration in ppm. Simulation: click or use the mouse wheel.",
    44: "Air quality in %. Simulation: click or use the mouse wheel.",
    45: "Ambient brightness in lux. Simulation: click or use the mouse wheel.",
    46: "Temperature of the heater in °C. Simulation: click or use the mouse wheel.",
    49: "Switches the relay.",
    50: "Red LED.",
    51: "Yellow LED.",
    52: "Green LED.",
    53: "RGB LED showing the color at its input.",
    54: "Fan power in % (0…100).",
    56: "Brightness of the white power LED in % (0…100).",
    57: "Voltage at analog output 0.",
    58: "Plays the selected melody on a rising edge at Trigger.",
    59: "PID-T1 controller with a cycle time of 1 s. Set Kp, Tn, Tv, the output limits and the control direction.",
    100: "Simulation only. Dead time: Out follows In delayed by the configured time in seconds (0 before that). Closes feedback loops.",
    101: "Simulation only. First-order lag (PT1): Out approaches In with the configured time constant in seconds. Closes feedback loops.",
    102: "Simulation only. Out = Gain × In.",
    103: "Simulation only. Changeover switch: Out is A or B. Simulation: click to switch.",
    104: "Simulation only. Digital meter showing the value at its input.",
    105: "Simulation only. Chart recorder: plots its three inputs over the last seconds (time span configurable).",
};

export const OPERATOR_GROUP_ICONS: Record<string, string> = {
    [Basic]: "⚙",
    [Arithmetic]: "∑",
    [Input]: "⏻",
    [Sensor]: "🌡",
    [Output]: "💡",
    [Converter]: "⇄",
    [Sound]: "♪",
    [Control]: "⟲",
    [Simulation]: "📈",
};

const CONSTANT = "Constant";
const SONG_INDEX = "Song Index";

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

//valueAsNumber ist NaN bei leerem Eingabefeld -- dann den bisherigen Wert behalten
function numberOr(value: number, fallback: number): number {
    return Number.isFinite(value) ? value : fallback;
}

function formatNumber(v: number): string {
    return Number.isInteger(v) ? `${v}` : v.toFixed(2);
}

export class OperatorRegistry{
    IsIndexKnown(globalTypeIndex: number) {
        return this.index2Info.has(globalTypeIndex);
    }

    private index2Info = new Map<number, TypeInfo>();
    private groupName2operatorName2Info = new Map<string, Map<string, TypeInfo>>();

    private Register(globalTypeIndex:number, groupName:string, operatorName:string, position:PositionType, singleton:SingletonType, builder:(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null)=>FlowchartOperator)
    {
        let ti:TypeInfo=new TypeInfo(globalTypeIndex, groupName, operatorName, position, singleton, builder, OPERATOR_DESCRIPTIONS[globalTypeIndex] ?? "", groupName == Simulation)
        if(this.index2Info.has(globalTypeIndex)) throw new Error(`this.index2Info.has(globalTypeIndex) for ${groupName}::${operatorName}`);
        this.index2Info.set(globalTypeIndex, ti);
        if(!this.groupName2operatorName2Info.has(groupName)) this.groupName2operatorName2Info.set(groupName, new Map<string, TypeInfo>());
        let operatorName2Info = this.groupName2operatorName2Info.get(groupName)!;
        if(operatorName2Info.has(operatorName)) throw new Error(`operatorName2Info.has(operatorName) for ${groupName}::${operatorName}`);
        operatorName2Info.set(operatorName, ti);
    }

    public CreateByIndex(index:number, parent: Flowchart, caption: string, configurationData:KeyValueTuple[]|null):FlowchartOperator|null
    {
        let ti=this.index2Info.get(index);
        if(ti===undefined) return null;
        return ti.Builder(parent, caption, ti, configurationData);
    }

    public GetTypeInfo(index:number):TypeInfo|null
    {
        let ti=this.index2Info.get(index);
        if(ti===undefined) return null;
        return ti;
    }

    //Baumansicht der Bausteinbibliothek: eine aufklappbare Gruppe je groupName (anfangs alle offen),
    //dazu "Öffne alle"/"Schließe alle". Ein Baustein wird per Maustaste-runter auf die Arbeitsflaeche gezogen.
    public populateOperatorLib(parent: HTMLDivElement, onmousedownHandler: (e:MouseEvent, ti:TypeInfo)=>any) {
        const header = Html(parent, "div", [], ["oplib-header"]);
        Html(header, "span", [], ["oplib-title"], "Function Blocks");
        const buttons = Html(header, "div", [], ["oplib-buttons"]);
        const openAll = <HTMLButtonElement>Html(buttons, "button", ["type", "button", "title", "Alle Gruppen aufklappen"], ["oplib-button"], "Öffne alle");
        const closeAll = <HTMLButtonElement>Html(buttons, "button", ["type", "button", "title", "Alle Gruppen zuklappen"], ["oplib-button"], "Schließe alle");
        const tree = Html(parent, "div", ["role", "tree"], ["oplib-tree"]);
        const groups: HTMLDetailsElement[] = [];
        for (const [groupName, operatorName2Info] of this.groupName2operatorName2Info.entries()) {
            const group = <HTMLDetailsElement>Html(tree, "details", ["open", ""], ["oplib-group"]);
            groups.push(group);
            const summary = Html(group, "summary", [], ["oplib-group-summary"]);
            Html(summary, "span", ["aria-hidden", "true"], ["oplib-group-icon"], OPERATOR_GROUP_ICONS[groupName] ?? "▪");
            Html(summary, "span", [], ["oplib-group-name"], groupName);
            Html(summary, "span", [], ["oplib-group-count"], `${operatorName2Info.size}`);
            const ul = Html(group, "ul", ["role", "group"], ["oplib-items"]);
            for (const info of operatorName2Info.values()) {
                const li = Html(ul, "li", ["role", "treeitem", "title", `${info.Description}\n\nDrag onto the workspace to add.`], ["oplib-item"], info.OperatorName);
                li.onmousedown = (e) => onmousedownHandler(e, info);
            }
        }
        openAll.onclick = () => groups.forEach(g => g.open = true);
        closeAll.onclick = () => groups.forEach(g => g.open = false);
    }

    public static Build():OperatorRegistry{
        let r:OperatorRegistry = new OperatorRegistry();
        r.Register(1, Basic, "AND", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Basic_ANDOperator(p, ca, ti, co));
        r.Register(2, Basic, "OR", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Basic_OROperator(p, ca, ti, co));
        r.Register(3, Basic, "XOR", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Basic_XOROperator(p, ca, ti, co));
        r.Register(4, Basic, "NOT", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Basic_NotOperator(p, ca, ti, co));
        r.Register(5, Basic, "RS", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Basic_RSOperator(p, ca, ti, co));
        r.Register(6, Basic, "SR", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Basic_SROperator(p, ca, ti, co));
        r.Register(7, Basic,"ConstTRUE", PositionType.Input, SingletonType.Default, (p, ca, ti, co)=>new Basic_ConstTRUEOperator(p, ca, ti, co));
        r.Register(8, Basic,"ConstFALSE", PositionType.Input, SingletonType.Default, (p, ca, ti, co)=>new Basic_ConstFALSEOperator(p, ca, ti, co));
        r.Register(9, Basic, "CNT", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Basic_CNTOperator(p, ca, ti, co));
        r.Register(10, Basic, "Timekeeper", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Basic_TimekeeperOperator(p, ca, ti, co));
        r.Register(11, Basic,"TON", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Basic_TONOperator(p, ca, ti, co));
        r.Register(12, Basic,"TOF", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Basic_TOFOperator(p, ca, ti, co));

        r.Register(13, Arithmetic, "ADD", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Arithmetic_ADDOperator(p, ca, ti, co));
        r.Register(14, Arithmetic, "SUB", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Arithmetic_SUBOperator(p, ca, ti, co));
        r.Register(15, Arithmetic, "MULTIPLY", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Arithmetic_MULTIPLYOperator(p, ca, ti, co));
        r.Register(16, Arithmetic, "DIVIDE", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Arithmetic_DIVIDEOperator(p, ca, ti, co));
        r.Register(17, Arithmetic, "MAX", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Arithmetic_MAXOperator(p, ca, ti, co));
        r.Register(18, Arithmetic, "MIN", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Arithmetic_MINOperator(p, ca, ti, co));
        r.Register(19, Arithmetic,"GreaterThan", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Arithmetic_GreaterThanOperator(p, ca, ti, co));
        r.Register(20, Arithmetic,"LessThan", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Arithmetic_LessThanOperator(p, ca, ti, co));
        r.Register(21, Arithmetic, "ConstFLOAT", PositionType.Input, SingletonType.Default, (p, ca, ti, co)=>new Arithmetic_ConstFLOATOperator(p, ca, ti, co));
        r.Register(22, Arithmetic, "ConstINTEGER", PositionType.Input, SingletonType.Default, (p, ca, ti, co)=>new Arithmetic_ConstINTEGEROperator(p, ca, ti, co));

        r.Register(23, Arithmetic, "LIMIT", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Arithmetic_LIMITOperator(p, ca, ti, co));
        r.Register(24, Arithmetic, "LIMITMONITOR", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Arithmetic_LIMITMONITOROperator(p, ca, ti, co));

        r.Register(25, Converter, "Bool2Color", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Bool2ColorConvert(p, ca, ti, co));
        r.Register(26, Converter, "Bool2Int", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Bool2IntConvert(p, ca, ti, co));
        r.Register(27, Converter, "Bool2Float", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Bool2FloatConvert(p, ca, ti, co));
        r.Register(28, Converter, "Int2Bool", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Int2BoolConvert(p, ca, ti, co));
        r.Register(29, Converter, "Int2Float", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Int2FloatConvert(p, ca, ti, co));
        r.Register(30, Converter, "Float2Int", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Float2IntConvert(p, ca, ti, co));

        r.Register(31, Input, "GreenButton", PositionType.Input, SingletonType.Singleton, (p, ca, ti, co)=>new Input_GreenButtonOperator(p, ca, ti, co));
        r.Register(32, Input, "EncoderButton", PositionType.Input, SingletonType.Singleton, (p, ca, ti, co)=>new Input_EncoderButtonOperator(p, ca, ti, co));
        r.Register(33, Input, "EncoderDetents", PositionType.Input, SingletonType.Singleton, (p, ca, ti, co)=>new Input_EncoderDetentsOperator(p, ca, ti, co));
        r.Register(34, Input, "RedButton", PositionType.Input, SingletonType.Singleton, (p, ca, ti, co)=>new Input_RedButtonOperator(p, ca, ti, co));
        r.Register(35, Input, "AnalogInput0", PositionType.Input, SingletonType.Singleton, (p, ca, ti, co)=>new Input_AnalogInput0Operator(p, ca, ti, co));
        r.Register(36, Input, "AnalogInput1", PositionType.Input, SingletonType.Singleton, (p, ca, ti, co)=>new Input_AnalogInput1Operator(p, ca, ti, co));
        r.Register(37, Input, "AnalogInput2", PositionType.Input, SingletonType.Singleton, (p, ca, ti, co)=>new Input_AnalogInput2Operator(p, ca, ti, co));
        r.Register(38, Input, "AnalogInput3", PositionType.Input, SingletonType.Singleton, (p, ca, ti, co)=>new Input_AnalogInput3Operator(p, ca, ti, co));

        r.Register(39, Sensor, "Movement", PositionType.Input, SingletonType.Singleton, (p, ca, ti, co)=>new Sensor_MovementOperator(p, ca, ti, co));
        r.Register(40, Sensor, "AirTemperature", PositionType.Input, SingletonType.Singleton, (p, ca, ti, co)=>new Sensor_AirTemperatureOperator(p, ca, ti, co));
        r.Register(41, Sensor, "AirHumidity", PositionType.Input, SingletonType.Singleton, (p, ca, ti, co)=>new Sensor_AirHumidityOperator(p, ca, ti, co));
        r.Register(42, Sensor, "AirPressure", PositionType.Input, SingletonType.Singleton, (p, ca, ti, co)=>new Sensor_AirPressureOperator(p, ca, ti, co));
        r.Register(43, Sensor, "AirCO2", PositionType.Input, SingletonType.Singleton, (p, ca, ti, co)=>new Sensor_AirCO2Operator(p, ca, ti, co));
        r.Register(44, Sensor, "AirQuality", PositionType.Input, SingletonType.Singleton, (p, ca, ti, co)=>new Sensor_AirQualityOperator(p, ca, ti, co));
        r.Register(45, Sensor, "AmbientBrightness", PositionType.Input, SingletonType.Singleton, (p, ca, ti, co)=>new Sensor_AmbientBrightnessOperator(p, ca, ti, co));
        r.Register(46, Sensor, "HeaterTemperature", PositionType.Input, SingletonType.Singleton, (p, ca, ti, co)=>new Sensor_HeaterTemperatureOperator(p, ca, ti, co));
        //47 AmbientNoise und 48 ExternalPressure: keine Firmware-Implementierung (devicemanager.cc) -> nicht registriert

        r.Register(49, Output, "Relay", PositionType.Output, SingletonType.Singleton, (p, ca, ti, co)=>new Output_RelayOperator(p, ca, ti, co));
        r.Register(50, Output, "RedLed", PositionType.Output, SingletonType.Singleton, (p, ca, ti, co)=>new Output_RedLedOperator(p, ca, ti, co));
        r.Register(51, Output, "YellowLed", PositionType.Output, SingletonType.Singleton, (p, ca, ti, co)=>new Output_YellowLedOperator(p, ca, ti, co));
        r.Register(52, Output, "GreenLed", PositionType.Output, SingletonType.Singleton, (p, ca, ti, co)=>new Output_GreenLedOperator(p, ca, ti, co));
        r.Register(53, Output, "LED3", PositionType.Output, SingletonType.Singleton, (p, ca, ti, co)=>new Output_Led3Operator(p, ca, ti, co));
        r.Register(54, Output, "Fan", PositionType.Output, SingletonType.Singleton, (p, ca, ti, co)=>new Output_FanOperator(p, ca, ti, co));
        //55 Fan2: keine Firmware-Implementierung -> nicht registriert
        r.Register(56, Output, "PowerLed", PositionType.Output, SingletonType.Singleton, (p, ca, ti, co)=>new Output_PowerLedOperator(p, ca, ti, co));
        r.Register(57, Output, "AnalogOutput0", PositionType.Output, SingletonType.Singleton, (p, ca, ti, co)=>new Output_AnalogOutput0Operator(p, ca, ti, co));

        r.Register(58, Sound, "Sound", PositionType.Output, SingletonType.Singleton, (p, ca, ti, co)=>new Sound_Sound(p, ca, ti, co));

        r.Register(59, Control, "PID", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Control_PID(p, ca, ti, co));

        //Anzeigen (Meter, Plotter) sind PositionType.Output, sonst wuerden sie nicht simuliert (FlowchartCompiler.sortOperators)
        r.Register(100, Simulation, "DeadTime", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Simulation_DeadTimeOperator(p, ca, ti, co));
        r.Register(101, Simulation, "PT1", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Simulation_PT1Operator(p, ca, ti, co));
        r.Register(102, Simulation, "Gain", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Simulation_GainOperator(p, ca, ti, co));
        r.Register(103, Simulation, "Switch", PositionType.Default, SingletonType.Default, (p, ca, ti, co)=>new Simulation_SwitchOperator(p, ca, ti, co));
        r.Register(104, Simulation, "Meter", PositionType.Output, SingletonType.Default, (p, ca, ti, co)=>new Simulation_MeterOperator(p, ca, ti, co));
        r.Register(105, Simulation, "Plotter", PositionType.Output, SingletonType.Default, (p, ca, ti, co)=>new Simulation_PlotterOperator(p, ca, ti, co));
        return r;
    }
}

//#region Simulierte Eingaenge (Taster, Sensoren, Analogeingaenge, Encoder)

//Eingang, dessen Wert in der Simulation per Maus gesetzt wird:
//Klick schaltet zwischen min und max um, das Mausrad aendert den Wert in Schritten von step.
//Der aktuelle Wert steht in der Debug-Zeile des Bausteins.
abstract class SimulatedValueInputOperator extends FlowchartOperator {
    protected O:FlowchartOutputConnector;
    protected value:number;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null, nameOfOutput:string, type:ConnectorType, protected readonly unit:string, protected readonly minOutput:number, protected readonly maxOutput:number, protected readonly step:number, protected readonly initialValue:number=minOutput) {
        super(parent, caption, ti, configurationData);
        this.value = initialValue;
        this.O = new FlowchartOutputConnector(this, nameOfOutput, 0, type);
        this.AppendConnectors([], [this.O]);
        this.ElementSvgG.addEventListener("click", () => {
            if (!parent.IsSimulating) return;
            this.value = this.value == this.maxOutput ? this.minOutput : this.maxOutput;
            this.showValue();
        });
        this.ElementSvgG.addEventListener("wheel", (e: WheelEvent) => {
            if (!parent.IsSimulating) return;
            e.preventDefault();
            const v = this.value + (e.deltaY < 0 ? this.step : -this.step);
            //Rundung auf die Nachkommastellen von step, damit keine 0.30000000000000004 entstehen
            const digits = (`${this.step}`.split(".")[1] ?? "").length;
            this.value = Math.min(this.maxOutput, Math.max(this.minOutput, Number(v.toFixed(digits))));
            this.showValue();
        }, { passive: false });
    }

    protected showValue() {
        this.SetDebugInfoText(`${formatNumber(this.value)}${this.unit} (click / mouse wheel)`);
    }

    OnSimulationStart(_ctx:SimulationContext){
        this.value = this.initialValue;
        this.showValue();
    }

    OnSimulationStep(ctx:SimulationContext){
        switch (this.O.Type) {
            case ConnectorType.INTEGER: ctx.SetInteger(this.O, Math.trunc(this.value)); break;
            default: ctx.SetFloat(this.O, this.value); break;
        }
    }
}

class Sensor_CommonSensorOperator extends SimulatedValueInputOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null, nameOfOutput:string, unit:string, minOutput:number, maxOutput:number, step:number) {
        super(parent, caption, ti, configurationData, nameOfOutput, ConnectorType.FLOAT, unit, minOutput, maxOutput, step);
    }
}

export class Sensor_HeaterTemperatureOperator extends Sensor_CommonSensorOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "DegreesCelsius", "°C", 25, 65, 1);
    }
}

export class Sensor_AirTemperatureOperator extends Sensor_CommonSensorOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "Temperature", "°C", 18, 25, 0.5);
    }
}

export class Sensor_AirHumidityOperator extends Sensor_CommonSensorOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "RelHumid%", "%", 40, 60, 1);
    }
}

export class Sensor_AirPressureOperator extends Sensor_CommonSensorOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "Pa", "Pa", 95000, 105000, 100);
    }
}

export class Sensor_AirCO2Operator extends Sensor_CommonSensorOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "CO2ppm", "ppm", 400, 1500, 50);
    }
}

export class Sensor_AirQualityOperator extends Sensor_CommonSensorOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "Quality%", "%", 20, 80, 5);
    }
}

export class Sensor_AmbientBrightnessOperator extends Sensor_CommonSensorOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "Lux", "lx", 200, 700, 10);
    }
}

class Input_CommonAnalogInputOperator extends SimulatedValueInputOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "Voltage", ConnectorType.FLOAT, "V", 0, 3.3, 0.1);
    }
}

export class Input_AnalogInput0Operator extends Input_CommonAnalogInputOperator {}
export class Input_AnalogInput1Operator extends Input_CommonAnalogInputOperator {}
export class Input_AnalogInput2Operator extends Input_CommonAnalogInputOperator {}
export class Input_AnalogInput3Operator extends Input_CommonAnalogInputOperator {}

//Firmware: Zaehler 0..100, Start bei 0
export class Input_EncoderDetentsOperator extends SimulatedValueInputOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "Detents", ConnectorType.INTEGER, "", 0, 100, 1);
    }
}

//Boolescher Eingang: Klick schaltet um (Taster, Bewegungsmelder)
class Input_CommonButtonOperator extends FlowchartOperator {
    private state:boolean=false;
    private O:FlowchartOutputConnector;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null, nameOfOutput:string="IsPressed") {
        super(parent, caption, ti, configurationData);
        this.O = new FlowchartOutputConnector(this, nameOfOutput, 0, ConnectorType.BOOLEAN);
        this.AppendConnectors([], [this.O]);
        this.ElementSvgG.addEventListener("click", () => {
            if (!parent.IsSimulating) return;
            this.state=!this.state;
            this.showState(this.state);
        });
    }

    //Anzeige des Zustands; null = Simulation beendet
    protected showState(state:boolean|null){
        this.box.classList.remove("False", "True");
        if (state !== null) this.box.classList.add(state?"True":"False");
    }

    OnSimulationStart(_ctx:SimulationContext){
        this.state=false;
        this.SetDebugInfoText("click to toggle");
    }

    OnSimulationStep(ctx:SimulationContext){
        this.showState(this.state);
        ctx.SetBoolean(this.O, this.state);
    }

    OnSimulationStop(_ctx:SimulationContext){
        this.showState(null);
    }
}

//Taster auf dem Board, dargestellt als Umschalter (Schiebeschalter mit farbigem Knopf, Knopf rechts = TRUE),
//im Editor und in der Simulation gleich. Aussehen in style/flowchart.css (.pushbutton).
class Input_PushButtonOperator extends Input_CommonButtonOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null, capColor:string) {
        super(parent, caption, ti, configurationData);
        this.ElementSvgG.classList.add("pushbutton");
        this.ElementSvgG.style.setProperty("--cap-color", capColor);
        //in die Drag-Gruppe des Rahmens, damit man den Baustein auch am Symbol verschieben kann
        const sw = <SVGGElement>Svg(<SVGGElement>this.box.parentNode, "g", ["transform", "translate(12 34)"], ["pushbutton-switch"]);
        Svg(sw, "rect", ["x", "0", "y", "8", "width", "56", "height", "24", "rx", "12"], ["pushbutton-track"]);
        Svg(sw, "text", ["x", "15", "y", "24"], ["pushbutton-label", "on-label"]).textContent = "I";
        Svg(sw, "text", ["x", "41", "y", "24"], ["pushbutton-label", "off-label"]).textContent = "O";
        const knob = Svg(sw, "g", [], ["pushbutton-knob"]);
        Svg(knob, "circle", ["cx", "12", "cy", "20", "r", "10"], ["pushbutton-cap"]);
        Svg(knob, "circle", ["cx", "9", "cy", "17", "r", "3"], ["pushbutton-shine"]);
    }

    protected showState(state:boolean|null){
        this.ElementSvgG.classList.toggle("on", state === true);
    }
}

export class Input_GreenButtonOperator extends Input_PushButtonOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "#16a34a");
    }
}
export class Input_EncoderButtonOperator extends Input_PushButtonOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "#facc15");
    }
}
export class Input_RedButtonOperator extends Input_PushButtonOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "#dc2626");
    }
}

export class Sensor_MovementOperator extends Input_CommonButtonOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "Movement");
    }
}
//#endregion

//#region Basic (boolesche Logik, Zaehler, Zeitglieder)

abstract class TwoInputOneOutputOperator extends FlowchartOperator {
    protected A:FlowchartInputConnector;
    protected B:FlowchartInputConnector;
    protected C:FlowchartOutputConnector;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null, inputType:ConnectorType, outputType:ConnectorType) {
        super(parent, caption, ti, configurationData);
        this.A = new FlowchartInputConnector(this, "A", 0, inputType);
        this.B = new FlowchartInputConnector(this, "B", 1, inputType);
        this.C = new FlowchartOutputConnector(this, "C", 0, outputType);
        this.AppendConnectors([this.A, this.B], [this.C]);
    }
}

abstract class BooleanLogicOperator extends TwoInputOneOutputOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, ConnectorType.BOOLEAN, ConnectorType.BOOLEAN);
    }
    protected abstract calc(a:boolean, b:boolean):boolean;
    OnSimulationStep(ctx:SimulationContext){
        ctx.SetBoolean(this.C, this.calc(ctx.GetBoolean(this.A), ctx.GetBoolean(this.B)));
    }
}

export class Basic_ANDOperator extends BooleanLogicOperator {
    protected calc(a:boolean, b:boolean) { return a && b; }
}

export class Basic_OROperator extends BooleanLogicOperator {
    protected calc(a:boolean, b:boolean) { return a || b; }
}

export class Basic_XOROperator extends BooleanLogicOperator {
    protected calc(a:boolean, b:boolean) { return a != b; }
}

export class Basic_NotOperator extends FlowchartOperator {
    private IN:FlowchartInputConnector;
    private OUT:FlowchartOutputConnector;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.IN = new FlowchartInputConnector(this, "IN", 0, ConnectorType.BOOLEAN);
        this.OUT = new FlowchartOutputConnector(this, "OUT", 0, ConnectorType.BOOLEAN);
        this.AppendConnectors([this.IN], [this.OUT]);
    }

    OnSimulationStep(ctx:SimulationContext){
        ctx.SetBoolean(this.OUT, !ctx.GetBoolean(this.IN));
    }
}

//RS: Ruecksetzen dominant, SR: Setzen dominant
abstract class FlipFlopOperator extends FlowchartOperator {
    protected R:FlowchartInputConnector;
    protected S:FlowchartInputConnector;
    protected C:FlowchartOutputConnector;
    protected state:boolean=false;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.R = new FlowchartInputConnector(this, "R", 0, ConnectorType.BOOLEAN);
        this.S = new FlowchartInputConnector(this, "S", 1, ConnectorType.BOOLEAN);
        this.C = new FlowchartOutputConnector(this, "C", 0, ConnectorType.BOOLEAN);
        this.AppendConnectors([this.R, this.S], [this.C]);
    }
    OnSimulationStart(_ctx:SimulationContext){
        this.state=false;
    }
}

export class Basic_RSOperator extends FlipFlopOperator {
    OnSimulationStep(ctx:SimulationContext){
        if(ctx.GetBoolean(this.R)) this.state=false;
        else if(ctx.GetBoolean(this.S)) this.state = true;
        ctx.SetBoolean(this.C, this.state);
    }
}

export class Basic_SROperator extends FlipFlopOperator {
    OnSimulationStep(ctx:SimulationContext){
        if(ctx.GetBoolean(this.S)) this.state = true;
        else if(ctx.GetBoolean(this.R)) this.state=false;
        ctx.SetBoolean(this.C, this.state);
    }
}

export class Basic_ConstTRUEOperator extends FlowchartOperator {
    protected O:FlowchartOutputConnector;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.O = new FlowchartOutputConnector(this, "TRUE", 0, ConnectorType.BOOLEAN);
        this.AppendConnectors([], [this.O]);
    }

    OnSimulationStep(ctx:SimulationContext){
        ctx.SetBoolean(this.O, true);
    }
}

export class Basic_ConstFALSEOperator extends FlowchartOperator {
    protected O:FlowchartOutputConnector;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.O = new FlowchartOutputConnector(this, "FALSE", 0, ConnectorType.BOOLEAN);
        this.AppendConnectors([], [this.O]);
    }

    OnSimulationStep(ctx:SimulationContext){
        ctx.SetBoolean(this.O, false);
    }
}

//Aufwaertszaehler: zaehlt steigende Flanken an CU bis PV, OUT=CV>=PV, Reset setzt CV=0
export class Basic_CNTOperator extends FlowchartOperator {
    private CountUp:FlowchartInputConnector;
    private Reset:FlowchartInputConnector;
    private PresetValue:FlowchartInputConnector;
    private OUT:FlowchartOutputConnector;
    private CurrentValue:FlowchartOutputConnector;
    private _CurrentValue:number=0;
    private lastInputValue:boolean=false;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.CountUp = new FlowchartInputConnector(this, "CU", 0, ConnectorType.BOOLEAN);
        this.Reset = new FlowchartInputConnector(this, "Reset", 1, ConnectorType.BOOLEAN);
        this.PresetValue = new FlowchartInputConnector(this, "PV", 2, ConnectorType.INTEGER);
        this.OUT = new FlowchartOutputConnector(this, "OUT", 0, ConnectorType.BOOLEAN);
        this.CurrentValue = new FlowchartOutputConnector(this, "CV", 1, ConnectorType.INTEGER);
        this.AppendConnectors([this.CountUp, this.Reset, this.PresetValue], [this.OUT, this.CurrentValue]);
    }
    OnSimulationStart(_ctx:SimulationContext){
        this._CurrentValue=0;
        this.lastInputValue=false;
    }

    OnSimulationStep(ctx:SimulationContext){
        let currentInputValue = ctx.GetBoolean(this.CountUp);
        let PV=ctx.GetInteger(this.PresetValue);
        if(ctx.GetBoolean(this.Reset)){
            this._CurrentValue=0;
        }else if(this.lastInputValue==false && currentInputValue==true && this._CurrentValue<PV){
            this._CurrentValue++;
        }
        ctx.SetBoolean(this.OUT, this._CurrentValue>=PV);//kann auch durch Veränderung des PV passieren, deshalb nicht im if
        ctx.SetInteger(this.CurrentValue, this._CurrentValue);
        this.lastInputValue=currentInputValue
    }
}

//Betriebsstundenzaehler: summiert die Zeit, waehrend der CU TRUE ist, OUT=CV_ms>=PV_ms
export class Basic_TimekeeperOperator extends FlowchartOperator {
    private CountUp:FlowchartInputConnector;
    private Reset:FlowchartInputConnector;
    private PresetValue:FlowchartInputConnector;
    private OUT:FlowchartOutputConnector;
    private CurrentValue:FlowchartOutputConnector;
    private currentValueMs:number=0;
    private lastInputValue:boolean=false;
    private lastMillis:number=0;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.CountUp = new FlowchartInputConnector(this, "CU", 0, ConnectorType.BOOLEAN);
        this.Reset = new FlowchartInputConnector(this, "Reset", 1, ConnectorType.BOOLEAN);
        this.PresetValue = new FlowchartInputConnector(this, "PV_ms", 2, ConnectorType.INTEGER);
        this.OUT = new FlowchartOutputConnector(this, "OUT", 0, ConnectorType.BOOLEAN);
        this.CurrentValue = new FlowchartOutputConnector(this, "CV_ms", 1, ConnectorType.INTEGER);
        this.AppendConnectors([this.CountUp, this.Reset, this.PresetValue], [this.OUT, this.CurrentValue]);
    }
    OnSimulationStart(_ctx:SimulationContext){
        this.currentValueMs=0;
        this.lastInputValue=false;
    }

    OnSimulationStep(ctx:SimulationContext){
        if(ctx.GetBoolean(this.Reset)){
            this.currentValueMs=0;
            this.lastInputValue=false;
        } else {
            let currentInputValue = ctx.GetBoolean(this.CountUp);
            let now = ctx.GetMillis();
            if(currentInputValue && this.lastInputValue){
                this.currentValueMs+=now-this.lastMillis;
            }
            this.lastMillis=now;
            this.lastInputValue=currentInputValue;
        }
        ctx.SetBoolean(this.OUT, this.currentValueMs>=ctx.GetInteger(this.PresetValue));
        ctx.SetInteger(this.CurrentValue, Math.trunc(this.currentValueMs));
    }
}

//Einschaltverzoegerung (IEC 61131-3): OUT wird PT_MS nach steigender Flanke TRUE, ET_MS laeuft bis PT_MS
export class Basic_TONOperator extends FlowchartOperator {
    private inputTRIGGER:FlowchartInputConnector;
    private inputPresetTime_msecs:FlowchartInputConnector;
    private output:FlowchartOutputConnector;
    private outputElapsedTime_msecs:FlowchartOutputConnector;
    private lastInputValue:boolean=false;
    private inputPositiveEdge:number = 0;

    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.inputTRIGGER = new FlowchartInputConnector(this, "TRIGGER", 0, ConnectorType.BOOLEAN);
        this.inputPresetTime_msecs = new FlowchartInputConnector(this, "PT_MS", 1, ConnectorType.INTEGER);
        this.output = new FlowchartOutputConnector(this, "OUT", 0, ConnectorType.BOOLEAN);
        this.outputElapsedTime_msecs = new FlowchartOutputConnector(this, "ET_MS", 1, ConnectorType.INTEGER);
        this.AppendConnectors([this.inputTRIGGER, this.inputPresetTime_msecs], [this.output,this.outputElapsedTime_msecs]);
    }

    public OnSimulationStart(_ctx:SimulationContext){
        this.lastInputValue=false;
    }

    public OnSimulationStep(ctx:SimulationContext){
        let currentInputValue = ctx.GetBoolean(this.inputTRIGGER);
        let presetTime_msecs = ctx.GetInteger(this.inputPresetTime_msecs);
        let now = ctx.GetMillis();
        if(!this.lastInputValue && currentInputValue){
            this.inputPositiveEdge=now;
        }
        this.lastInputValue=currentInputValue;
        let elapsed = currentInputValue ? Math.min(now-this.inputPositiveEdge, presetTime_msecs) : 0;
        ctx.SetBoolean(this.output, currentInputValue && elapsed>=presetTime_msecs);
        ctx.SetInteger(this.outputElapsedTime_msecs, Math.trunc(elapsed));
    }
}

//Ausschaltverzoegerung (IEC 61131-3): OUT folgt TRIGGER sofort auf TRUE und faellt PT_MS nach der fallenden Flanke ab
export class Basic_TOFOperator extends FlowchartOperator {
    private inputTRIGGER:FlowchartInputConnector;
    private inputPresetTime_msecs:FlowchartInputConnector;
    private output:FlowchartOutputConnector;
    private outputElapsedTime_msecs:FlowchartOutputConnector;
    private lastInputValue:boolean=false;
    private running:boolean=false;
    private inputNegativeEdge:number = 0;
    private elapsed:number = 0;

    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.inputTRIGGER = new FlowchartInputConnector(this, "TRIGGER", 0, ConnectorType.BOOLEAN);
        this.inputPresetTime_msecs = new FlowchartInputConnector(this, "PT_MS", 1, ConnectorType.INTEGER);
        this.output = new FlowchartOutputConnector(this, "OUT", 0, ConnectorType.BOOLEAN);
        this.outputElapsedTime_msecs = new FlowchartOutputConnector(this, "ET_MS", 1, ConnectorType.INTEGER);
        this.AppendConnectors([this.inputTRIGGER, this.inputPresetTime_msecs], [this.output,this.outputElapsedTime_msecs]);
    }

    public OnSimulationStart(_ctx:SimulationContext){
        this.lastInputValue=false;
        this.running=false;
        this.elapsed=0;
    }

    public OnSimulationStep(ctx:SimulationContext){
        let currentInputValue = ctx.GetBoolean(this.inputTRIGGER);
        let presetTime_msecs = ctx.GetInteger(this.inputPresetTime_msecs);
        let now = ctx.GetMillis();
        if(currentInputValue){
            this.running=false;
            this.elapsed=0;
        }else{
            if(this.lastInputValue){
                this.running=true;
                this.inputNegativeEdge=now;
            }
            if(this.running){
                this.elapsed=Math.min(now-this.inputNegativeEdge, presetTime_msecs);
                if(this.elapsed>=presetTime_msecs) this.running=false;
            }
        }
        this.lastInputValue=currentInputValue;
        ctx.SetBoolean(this.output, currentInputValue || this.running);
        ctx.SetInteger(this.outputElapsedTime_msecs, Math.trunc(this.elapsed));
    }
}
//#endregion

//#region Arithmetic

abstract class FloatArithmeticOperator extends TwoInputOneOutputOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, ConnectorType.FLOAT, ConnectorType.FLOAT);
    }
    protected abstract calc(a:number, b:number):number;
    OnSimulationStep(ctx:SimulationContext){
        ctx.SetFloat(this.C, this.calc(ctx.GetFloat(this.A), ctx.GetFloat(this.B)));
    }
}

export class Arithmetic_ADDOperator extends FloatArithmeticOperator {
    protected calc(a:number, b:number) { return a + b; }
}

export class Arithmetic_SUBOperator extends FloatArithmeticOperator {
    protected calc(a:number, b:number) { return a - b; }
}

export class Arithmetic_MULTIPLYOperator extends FloatArithmeticOperator {
    protected calc(a:number, b:number) { return a * b; }
}

//Division durch 0 ergibt wie auf dem Geraet (IEEE-754-float) +/-Infinity bzw. NaN
export class Arithmetic_DIVIDEOperator extends FloatArithmeticOperator {
    protected calc(a:number, b:number) { return a / b; }
}

export class Arithmetic_MAXOperator extends FloatArithmeticOperator {
    protected calc(a:number, b:number) { return Math.max(a, b); }
}

export class Arithmetic_MINOperator extends FloatArithmeticOperator {
    protected calc(a:number, b:number) { return Math.min(a, b); }
}

abstract class FloatComparisonOperator extends TwoInputOneOutputOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, ConnectorType.FLOAT, ConnectorType.BOOLEAN);
    }
    protected abstract calc(a:number, b:number):boolean;
    OnSimulationStep(ctx:SimulationContext){
        ctx.SetBoolean(this.C, this.calc(ctx.GetFloat(this.A), ctx.GetFloat(this.B)));
    }
}

export class Arithmetic_GreaterThanOperator extends FloatComparisonOperator {
    protected calc(a:number, b:number) { return a > b; }
}

export class Arithmetic_LessThanOperator extends FloatComparisonOperator {
    protected calc(a:number, b:number) { return a < b; }
}

export class Arithmetic_ConstFLOATOperator extends FlowchartOperator {
    private O:FlowchartOutputConnector;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.O = new FlowchartOutputConnector(this, "Out", 0, ConnectorType.FLOAT);
        this.AppendConnectors([], [this.O]);
        this.cfg_setDefault(CONSTANT, 0);
    }

    private constantHTMLInput:HTMLInputElement|null=null;
    public PopulateProperyGrid(tbody:HTMLTableSectionElement):boolean
    {
        this.constantHTMLInput=InputFloatNumber(tbody, CONSTANT, this.configurationData);
        return true;
    }

    public SavePropertyGrid(_tbody:HTMLTableSectionElement){
        if(this.constantHTMLInput==null) return;
        this.cfg_setValue(CONSTANT, numberOr(this.constantHTMLInput.valueAsNumber, this.cfg_getValue(CONSTANT, 0)));
    }

    protected SerializeFurtherProperties(ctx:SerializeContextAndAdressMap):void{
        ctx.ctx.writeF32(this.cfg_getValue(CONSTANT, 0));
    }

    public OnSimulationStep(ctx:SimulationContext){
        ctx.SetFloat(this.O, this.cfg_getValue(CONSTANT, 0));
    }
}

export class Arithmetic_ConstINTEGEROperator extends FlowchartOperator {
    private O:FlowchartOutputConnector;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.O = new FlowchartOutputConnector(this, "Out", 0, ConnectorType.INTEGER);
        this.AppendConnectors([], [this.O]);
        this.cfg_setDefault(CONSTANT, 0);
    }

    private constantHTMLInput:HTMLInputElement|null=null;
    public PopulateProperyGrid(tbody:HTMLTableSectionElement):boolean
    {
        this.constantHTMLInput=InputIntegerNumber(tbody, INT32_MIN, INT32_MAX, CONSTANT, this.configurationData);
        return true;
    }

    public SavePropertyGrid(_tbody:HTMLTableSectionElement){
        if(this.constantHTMLInput==null) return;
        this.cfg_setValue(CONSTANT, Math.trunc(numberOr(this.constantHTMLInput.valueAsNumber, this.cfg_getValue(CONSTANT, 0))));
    }

    //Firmware liest ReadS32 (devicemanager.cc, case 22) -- frueher faelschlich als float geschrieben
    protected SerializeFurtherProperties(ctx:SerializeContextAndAdressMap):void{
        ctx.ctx.writeS32(this.cfg_getValue(CONSTANT, 0));
    }

    public OnSimulationStep(ctx:SimulationContext){
        ctx.SetInteger(this.O, this.cfg_getValue(CONSTANT, 0));
    }
}

//Begrenzer: Output = Input, begrenzt auf [Minimum, Maximum]
export class Arithmetic_LIMITOperator extends FlowchartOperator {
    protected Minimum:FlowchartInputConnector;
    protected Input:FlowchartInputConnector;
    protected Maximum:FlowchartInputConnector;
    protected Output:FlowchartOutputConnector;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.Minimum = new FlowchartInputConnector(this, "Minimum", 0, ConnectorType.FLOAT);
        this.Input = new FlowchartInputConnector(this, "Input", 1, ConnectorType.FLOAT);
        this.Maximum = new FlowchartInputConnector(this, "Maximum", 2, ConnectorType.FLOAT);
        this.Output = new FlowchartOutputConnector(this, "Output", 0, ConnectorType.FLOAT);
        this.AppendConnectors([this.Minimum, this.Input, this.Maximum], [this.Output]);
    }

    public OnSimulationStep(ctx: SimulationContext): void {
        let i = ctx.GetFloat(this.Input);
        let min = ctx.GetFloat(this.Minimum);
        let max = ctx.GetFloat(this.Maximum);
        ctx.SetFloat(this.Output, i>max?max:i<min?min:i);
    }
}

//Grenzwertmelder mit Hysterese: ULE=TRUE bei Input>Maximum (zurueck bei <=Maximum-Hysterese),
//LLE=TRUE bei Input<Minimum (zurueck bei >=Minimum+Hysterese)
export class Arithmetic_LIMITMONITOROperator extends FlowchartOperator {
    protected Minimum:FlowchartInputConnector;
    protected Input:FlowchartInputConnector;
    protected Maximum:FlowchartInputConnector;
    protected Hysterese:FlowchartInputConnector;
    protected LLE:FlowchartOutputConnector;
    protected ULE:FlowchartOutputConnector;
    private lle=false;
    private ule=false;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.Minimum = new FlowchartInputConnector(this, "Minimum", 0, ConnectorType.FLOAT);
        this.Input = new FlowchartInputConnector(this, "Input", 1, ConnectorType.FLOAT);
        this.Maximum = new FlowchartInputConnector(this, "Maximum", 2, ConnectorType.FLOAT);
        this.Hysterese = new FlowchartInputConnector(this, "Hysterese", 3, ConnectorType.FLOAT);
        this.LLE = new FlowchartOutputConnector(this, "LLE", 0, ConnectorType.BOOLEAN);
        this.ULE = new FlowchartOutputConnector(this, "ULE", 1, ConnectorType.BOOLEAN);
        //Firmware erwartet 4 Input-Adressen (devicemanager.cc, case 24) -- Hysterese fehlte hier frueher
        this.AppendConnectors([this.Minimum, this.Input, this.Maximum, this.Hysterese], [this.LLE, this.ULE]);
    }

    public OnSimulationStart(_ctx: SimulationContext): void {
        this.lle=false;
        this.ule=false;
    }

    public OnSimulationStep(ctx: SimulationContext): void {
        let i = ctx.GetFloat(this.Input);
        let min = ctx.GetFloat(this.Minimum);
        let max = ctx.GetFloat(this.Maximum);
        let h = ctx.GetFloat(this.Hysterese);
        if(i>max) this.ule=true;
        else if(i<=max-h) this.ule=false;
        if(i<min) this.lle=true;
        else if(i>=min+h) this.lle=false;
        ctx.SetBoolean(this.ULE, this.ule);
        ctx.SetBoolean(this.LLE, this.lle);
    }
}
//#endregion

//#region Converter

const COLOR_TRUE="Color for TRUE";
const COLOR_FALSE="Color for FALSE";

export class Bool2ColorConvert extends FlowchartOperator {
    private IN:FlowchartInputConnector;
    private OUT:FlowchartOutputConnector;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.IN = new FlowchartInputConnector(this, "IN", 0, ConnectorType.BOOLEAN);
        this.OUT = new FlowchartOutputConnector(this, "OUT", 0, ConnectorType.COLOR);
        this.AppendConnectors([this.IN], [this.OUT]);
        this.cfg_setDefault(COLOR_TRUE, "#ff0000");
        this.cfg_setDefault(COLOR_FALSE, "#000000");
    }

    private colorTRUEHTMLInput:HTMLInputElement|null=null;
    private colorFALSEHTMLInput:HTMLInputElement|null=null;

    public PopulateProperyGrid(tbody:HTMLTableSectionElement):boolean
    {
        this.colorTRUEHTMLInput=InputColor(tbody, COLOR_TRUE, this.configurationData);
        this.colorFALSEHTMLInput=InputColor(tbody, COLOR_FALSE, this.configurationData);
        return true;
    }

    public SavePropertyGrid(_tbody:HTMLTableSectionElement){
        if(this.colorTRUEHTMLInput==null || this.colorFALSEHTMLInput==null) return;
        this.cfg_setValue(COLOR_TRUE, this.colorTRUEHTMLInput.value);
        this.cfg_setValue(COLOR_FALSE, this.colorFALSEHTMLInput.value);
    }

    protected SerializeFurtherProperties(ctx:SerializeContextAndAdressMap):void{
        ctx.ctx.writeU32(ColorDomString2ColorNum(this.cfg_getValue(COLOR_TRUE, "#ff0000")));
        ctx.ctx.writeU32(ColorDomString2ColorNum(this.cfg_getValue(COLOR_FALSE, "#000000")));
    }

    public OnSimulationStep(ctx:SimulationContext){
        let currentInputValue = ctx.GetBoolean(this.IN);
        ctx.SetColor(this.OUT, currentInputValue?this.cfg_getValue(COLOR_TRUE, "#ff0000"):this.cfg_getValue(COLOR_FALSE, "#000000"));
    }
}

const NUMBER_TRUE="Number for TRUE";
const NUMBER_FALSE="Number for FALSE";

export class Bool2IntConvert extends FlowchartOperator {
    private IN:FlowchartInputConnector;
    private OUT:FlowchartOutputConnector;
    private numberTRUEHTMLInput:HTMLInputElement|null=null;
    private numberFALSEHTMLInput:HTMLInputElement|null=null;

    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.IN = new FlowchartInputConnector(this, "IN", 0, ConnectorType.BOOLEAN);
        this.OUT = new FlowchartOutputConnector(this, "OUT", 0, ConnectorType.INTEGER);
        this.AppendConnectors([this.IN], [this.OUT]);
        this.cfg_setDefault(NUMBER_TRUE, 1);
        this.cfg_setDefault(NUMBER_FALSE, 0);
    }

    public PopulateProperyGrid(tbody:HTMLTableSectionElement):boolean
    {
        //frueher Number.MIN_VALUE (=5e-324, also >0!) als Untergrenze -> negative Werte waren nicht eingebbar
        this.numberTRUEHTMLInput=InputIntegerNumber(tbody, INT32_MIN, INT32_MAX, NUMBER_TRUE, this.configurationData);
        this.numberFALSEHTMLInput=InputIntegerNumber(tbody, INT32_MIN, INT32_MAX, NUMBER_FALSE, this.configurationData);
        return true;
    }

    public SavePropertyGrid(_tbody:HTMLTableSectionElement){
        if(this.numberFALSEHTMLInput==null || this.numberTRUEHTMLInput==null) return;
        this.cfg_setValue(NUMBER_TRUE, Math.trunc(numberOr(this.numberTRUEHTMLInput.valueAsNumber, this.cfg_getValue(NUMBER_TRUE, 1))));
        this.cfg_setValue(NUMBER_FALSE, Math.trunc(numberOr(this.numberFALSEHTMLInput.valueAsNumber, this.cfg_getValue(NUMBER_FALSE, 0))));
    }

    protected SerializeFurtherProperties(ctx:SerializeContextAndAdressMap):void{
        ctx.ctx.writeS32(this.cfg_getValue(NUMBER_TRUE, 1));
        ctx.ctx.writeS32(this.cfg_getValue(NUMBER_FALSE, 0));
    }

    public OnSimulationStep(ctx:SimulationContext){
        let i = ctx.GetBoolean(this.IN);
        ctx.SetInteger(this.OUT, i?this.cfg_getValue(NUMBER_TRUE, 1):this.cfg_getValue(NUMBER_FALSE, 0));
    }
}

export class Bool2FloatConvert extends FlowchartOperator {
    private IN:FlowchartInputConnector;
    private OUT:FlowchartOutputConnector;
    private numberTRUEHTMLInput:HTMLInputElement|null=null;
    private numberFALSEHTMLInput:HTMLInputElement|null=null;

    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.IN = new FlowchartInputConnector(this, "IN", 0, ConnectorType.BOOLEAN);
        this.OUT = new FlowchartOutputConnector(this, "OUT", 0, ConnectorType.FLOAT);
        this.AppendConnectors([this.IN], [this.OUT]);
        this.cfg_setDefault(NUMBER_TRUE, 1);
        this.cfg_setDefault(NUMBER_FALSE, 0);
    }

    public PopulateProperyGrid(tbody:HTMLTableSectionElement):boolean
    {
        this.numberTRUEHTMLInput=InputFloatNumber(tbody, NUMBER_TRUE, this.configurationData);
        this.numberFALSEHTMLInput=InputFloatNumber(tbody, NUMBER_FALSE, this.configurationData);
        return true;
    }

    public SavePropertyGrid(_tbody:HTMLTableSectionElement){
        if(this.numberFALSEHTMLInput==null || this.numberTRUEHTMLInput==null) return;
        this.cfg_setValue(NUMBER_TRUE, numberOr(this.numberTRUEHTMLInput.valueAsNumber, this.cfg_getValue(NUMBER_TRUE, 1)));
        this.cfg_setValue(NUMBER_FALSE, numberOr(this.numberFALSEHTMLInput.valueAsNumber, this.cfg_getValue(NUMBER_FALSE, 0)));
    }

    protected SerializeFurtherProperties(ctx:SerializeContextAndAdressMap):void{
        ctx.ctx.writeF32(this.cfg_getValue(NUMBER_TRUE, 1));
        ctx.ctx.writeF32(this.cfg_getValue(NUMBER_FALSE, 0));
    }

    public OnSimulationStep(ctx:SimulationContext){
        let i = ctx.GetBoolean(this.IN);
        ctx.SetFloat(this.OUT, i?this.cfg_getValue(NUMBER_TRUE, 1):this.cfg_getValue(NUMBER_FALSE, 0));
    }
}

const LIMIT_FOR_TRUE = "Limit for TRUE";

//OUT = IN >= Limit (Firmware FB_Int2BoolConverter)
export class Int2BoolConvert extends FlowchartOperator {
    private IN:FlowchartInputConnector;
    private OUT:FlowchartOutputConnector;
    private limitHTMLInput:HTMLInputElement|null=null;

    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.IN = new FlowchartInputConnector(this, "IN", 0, ConnectorType.INTEGER);
        this.OUT = new FlowchartOutputConnector(this, "OUT", 0, ConnectorType.BOOLEAN);
        this.AppendConnectors([this.IN], [this.OUT]);
        this.cfg_setDefault(LIMIT_FOR_TRUE, 1);
    }

    public PopulateProperyGrid(tbody:HTMLTableSectionElement):boolean
    {
        this.limitHTMLInput=InputIntegerNumber(tbody, INT32_MIN, INT32_MAX, LIMIT_FOR_TRUE, this.configurationData);
        return true;
    }

    public SavePropertyGrid(_tbody:HTMLTableSectionElement){
        if(this.limitHTMLInput==null) return;
        this.cfg_setValue(LIMIT_FOR_TRUE, Math.trunc(numberOr(this.limitHTMLInput.valueAsNumber, this.cfg_getValue(LIMIT_FOR_TRUE, 1))));
    }

    //Firmware liest hier einen weiteren S32 (devicemanager.cc, case 28) -- fehlte frueher und verschob
    //dadurch das Parsen aller folgenden Bausteine
    protected SerializeFurtherProperties(ctx:SerializeContextAndAdressMap):void{
        ctx.ctx.writeS32(this.cfg_getValue(LIMIT_FOR_TRUE, 1));
    }

    public OnSimulationStep(ctx:SimulationContext){
        ctx.SetBoolean(this.OUT, ctx.GetInteger(this.IN) >= this.cfg_getValue(LIMIT_FOR_TRUE, 1));
    }
}

export class Int2FloatConvert extends FlowchartOperator {
    private IN:FlowchartInputConnector;
    private OUT:FlowchartOutputConnector;

    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.IN = new FlowchartInputConnector(this, "IN", 0, ConnectorType.INTEGER);
        this.OUT = new FlowchartOutputConnector(this, "OUT", 0, ConnectorType.FLOAT);
        this.AppendConnectors([this.IN], [this.OUT]);
    }

    public OnSimulationStep(ctx:SimulationContext){
        ctx.SetFloat(this.OUT, ctx.GetInteger(this.IN));
    }
}

//float->int32 schneidet wie in C die Nachkommastellen ab
export class Float2IntConvert extends FlowchartOperator {
    private IN:FlowchartInputConnector;
    private OUT:FlowchartOutputConnector;

    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.IN = new FlowchartInputConnector(this, "IN", 0, ConnectorType.FLOAT);
        this.OUT = new FlowchartOutputConnector(this, "OUT", 0, ConnectorType.INTEGER);
        this.AppendConnectors([this.IN], [this.OUT]);
    }

    public OnSimulationStep(ctx:SimulationContext){
        const f = ctx.GetFloat(this.IN);
        ctx.SetInteger(this.OUT, Number.isFinite(f) ? Math.trunc(f) : 0);
    }
}
//#endregion

//#region Output

export class Output_RelayOperator extends FlowchartOperator {
    private I:FlowchartInputConnector;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.I=new FlowchartInputConnector(this, "Relay", 0, ConnectorType.BOOLEAN);
        this.AppendConnectors([this.I], []);
    }

    OnSimulationStep(ctx:SimulationContext){
        let state = ctx.GetBoolean(this.I);
        this.box.classList.remove(state?"False":"True");
        this.box.classList.add(state?"True":"False");
        this.SetDebugInfoText(state ? "ON" : "OFF");
    }

    OnSimulationStop(_ctx:SimulationContext){
        this.box.classList.remove("False", "True");
    }
}

//Analoge Ausgaenge: der Wert steht in der Debug-Zeile (frueher box.innerHTML -- auf einem SVG-rect unsichtbar)
abstract class Output_CommonAnalogOperator extends FlowchartOperator {
    private I:FlowchartInputConnector;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null, nameOfInput:string, private readonly unit:string) {
        super(parent, caption, ti, configurationData);
        this.I=new FlowchartInputConnector(this, nameOfInput, 0, ConnectorType.FLOAT);
        this.AppendConnectors([this.I], []);
    }

    OnSimulationStep(ctx:SimulationContext){
        this.SetDebugInfoText(`${formatNumber(ctx.GetFloat(this.I))}${this.unit}`);
    }
}

export class Output_FanOperator extends Output_CommonAnalogOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "Power%", "%");
    }
}

export class Output_PowerLedOperator extends Output_CommonAnalogOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "Power%", "%");
    }
}

export class Output_AnalogOutput0Operator extends Output_CommonAnalogOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "OutVolt", "V");
    }
}

class Output_CommonLedOperator extends FlowchartOperator {
    protected  I:FlowchartInputConnector;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null, protected colorOnTRUE:string, protected colorOnFALSE:string) {
        super(parent, caption, ti, configurationData);
        this.I = new FlowchartInputConnector(this, "LED", 0, ConnectorType.BOOLEAN);
        this.AppendConnectors([this.I], []);
    }

    OnSimulationStep(ctx:SimulationContext){
        let state = ctx.GetBoolean(this.I);
        this.box.style.fill=state?this.colorOnTRUE:this.colorOnFALSE;
    }

    OnSimulationStop(_ctx:SimulationContext){
        this.box.style.removeProperty("fill");
    }
}

export class Output_RedLedOperator extends Output_CommonLedOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "red", "grey");
    }
}

export class Output_YellowLedOperator extends Output_CommonLedOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "yellow", "grey");
    }
}

export class Output_GreenLedOperator extends Output_CommonLedOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, "green", "grey");
    }
}

export class Output_Led3Operator extends FlowchartOperator {
    protected LED:FlowchartInputConnector;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.LED = new FlowchartInputConnector(this, "LED", 0, ConnectorType.COLOR);
        this.AppendConnectors([this.LED], []);
    }

    OnSimulationStep(ctx:SimulationContext){
        this.box.style.fill=ctx.GetColor(this.LED);
    }

    OnSimulationStop(_ctx:SimulationContext){
        this.box.style.removeProperty("fill");
    }
}

//Spielt bei steigender Flanke an Trigger die gewaehlte Melodie (Firmware FB_Sound). Die Sounddateien
//liegen nur auf dem Geraet -- die Simulation zeigt den Namen und spielt einen kurzen Signalton.
export class Sound_Sound extends FlowchartOperator {
    private Trigger:FlowchartInputConnector;
    private lastInputValue=false;

    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.Trigger = new FlowchartInputConnector(this, "Trigger", 0, ConnectorType.BOOLEAN);
        this.AppendConnectors([this.Trigger], []);
        this.cfg_setDefault(SONG_INDEX, 0);
    }

    private songIndexHTMLSelect:HTMLSelectElement|null=null;
    public PopulateProperyGrid(tbody:HTMLTableSectionElement):boolean
    {
        this.songIndexHTMLSelect=InputSelect(tbody, Song.default(), SONG_INDEX, this.configurationData);
        return true;
    }

    public SavePropertyGrid(_tbody:HTMLTableSectionElement){
        if(this.songIndexHTMLSelect==null) return;
        this.cfg_setValue(SONG_INDEX, parseInt(this.songIndexHTMLSelect.value));
    }

    protected SerializeFurtherProperties(ctx:SerializeContextAndAdressMap):void{
        ctx.ctx.writeS32(this.cfg_getValue(SONG_INDEX, 0));
    }

    public OnSimulationStart(_ctx:SimulationContext){
        this.lastInputValue=false;
    }

    public OnSimulationStep(ctx:SimulationContext){
        const current = ctx.GetBoolean(this.Trigger);
        if(!this.lastInputValue && current){
            const songIndex:number = this.cfg_getValue(SONG_INDEX, 0);
            const song = Song.default().find(s => s.n == songIndex);
            this.SetDebugInfoText(`♪ ${song ? song.s : songIndex}`);
            if(songIndex != 0){
                try { zzfx(...[,,925,.04,.3,.6,1,.3,,6.27,-184,.09,.17]); } catch (e) { console.warn("Sound playback failed", e); }
            }
        }
        this.lastInputValue=current;
    }
}
//#endregion

//#region Control

const KP="Kp";
const Tn="Tn(msecs)";
const Tv="Tv(msecs)";
const MIN_OUTPUT="Min Output";
const MAX_OUTPUT="Max Output";
const DIRECTION  = "Direction";
//Abtastzeit des Reglers auf dem Geraet (FB_PIDSimple::initPhase1)
const PID_CYCLE_TIME_MS = 1000;

//PID-T1-Regler, Nachbildung von PID_T1::Controller (espidf-components/pidcontroller) mit
//AntiWindup::ON_SWICH_OFF_INTEGRATOR und T1=0.2*Tv wie in FB_PIDSimple.
//Direction "Inverse" kehrt die Regeldifferenz um (e = Feedback - Setpoint).
export class Control_PID extends FlowchartOperator {
    private inputSetpoint:FlowchartInputConnector;
    private inputFeedback:FlowchartInputConnector;
    private output:FlowchartOutputConnector;

    private kpHTMLInput:HTMLInputElement|null=null;
    private tnHTMLInput:HTMLInputElement|null=null;
    private tvHTMLInput:HTMLInputElement|null=null;
    private minOutputHTMLInput:HTMLInputElement|null=null;
    private maxOutputHTMLInput:HTMLInputElement|null=null;
    private directionHTMLSelect:HTMLSelectElement|null=null;

    //Simulationszustand
    private a1=0; private a2=0; private b0=0; private b1=0; private b2=0;
    private b0w=0; private b1w=0; private b2w=0;
    private y1=0; private y2=0; private e1=0; private e2=0;
    private y0=0;
    private lastTimeMs=0;

    public PopulateProperyGrid(tbody:HTMLTableSectionElement):boolean
    {
        this.kpHTMLInput=InputFloatNumber(tbody, KP, this.configurationData);
        //Firmware lehnt Tn<=0 ab (PID_T1::Controller::SetKpTnTv)
        this.tnHTMLInput=InputIntegerNumber(tbody, 1, 100000000, Tn, this.configurationData);
        this.tvHTMLInput=InputIntegerNumber(tbody, 0, 100000000, Tv, this.configurationData);
        this.minOutputHTMLInput=InputFloatNumber(tbody, MIN_OUTPUT, this.configurationData);
        this.maxOutputHTMLInput=InputFloatNumber(tbody, MAX_OUTPUT, this.configurationData);
        this.directionHTMLSelect=InputSelect(tbody, [new StringNumberTuple("Direct", 0), new StringNumberTuple("Inverse", 1)], DIRECTION, this.configurationData);
        return true;
    }

    public SavePropertyGrid(_tbody:HTMLTableSectionElement){
        if(this.directionHTMLSelect==null) return;
        this.cfg_setValue(KP, Math.max(0, numberOr(this.kpHTMLInput!.valueAsNumber, this.cfg_getValue(KP, 1))));
        this.cfg_setValue(Tn, Math.max(1, Math.trunc(numberOr(this.tnHTMLInput!.valueAsNumber, this.cfg_getValue(Tn, 10000)))));
        this.cfg_setValue(Tv, Math.max(0, Math.trunc(numberOr(this.tvHTMLInput!.valueAsNumber, this.cfg_getValue(Tv, 0)))));
        this.cfg_setValue(MIN_OUTPUT, numberOr(this.minOutputHTMLInput!.valueAsNumber, this.cfg_getValue(MIN_OUTPUT, 0)));
        this.cfg_setValue(MAX_OUTPUT, numberOr(this.maxOutputHTMLInput!.valueAsNumber, this.cfg_getValue(MAX_OUTPUT, 100)));
        this.cfg_setValue(DIRECTION, parseInt(this.directionHTMLSelect.value));
    }

    protected SerializeFurtherProperties(ctx:SerializeContextAndAdressMap):void{
        ctx.ctx.writeF32(this.cfg_getValue(KP, 1));
        ctx.ctx.writeU32(this.cfg_getValue(Tn, 10000));
        ctx.ctx.writeU32(this.cfg_getValue(Tv, 0));
        ctx.ctx.writeF32(this.cfg_getValue(MIN_OUTPUT, 0));
        ctx.ctx.writeF32(this.cfg_getValue(MAX_OUTPUT, 100));
        ctx.ctx.writeU32(this.cfg_getValue(DIRECTION, 0));
    }

    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        //Reihenfolge = Firmware-Reihenfolge (inputSetpoint, inputFeedback, output); Ausgang ist float (FB_PIDSimple: SetFloat)
        this.inputSetpoint = new FlowchartInputConnector(this, "Setpoint", 0, ConnectorType.FLOAT);
        this.inputFeedback = new FlowchartInputConnector(this, "Feedback", 1, ConnectorType.FLOAT);
        this.output = new FlowchartOutputConnector(this, "Out", 0, ConnectorType.FLOAT);
        this.AppendConnectors([this.inputSetpoint, this.inputFeedback], [this.output]);
        this.cfg_setDefault(KP, 1);
        this.cfg_setDefault(Tn, 10000);
        this.cfg_setDefault(Tv, 0);
        this.cfg_setDefault(MIN_OUTPUT, 0);
        this.cfg_setDefault(MAX_OUTPUT, 100);
        this.cfg_setDefault(DIRECTION, 0);
    }

    public OnSimulationStart(ctx:SimulationContext){
        //Koeffizienten wie PID_T1::Controller::SetKpTnTv
        const kp:number = this.cfg_getValue(KP, 1);
        const Tn_s = Math.max(1, this.cfg_getValue(Tn, 10000)) / 1000;
        const Tv_s = this.cfg_getValue(Tv, 0) / 1000;
        const Tcyc_s = PID_CYCLE_TIME_MS / 1000;
        const T1_s = 0.2 * Tv_s;
        const bf = kp / (1 + T1_s / Tcyc_s);
        const tvt1 = (Tv_s + T1_s) / Tcyc_s;
        const twoTn = 2 * Tn_s;
        this.a1 = -1 - T1_s / (T1_s + Tcyc_s);
        this.a2 = T1_s / (T1_s + Tcyc_s);
        this.b0 = bf * (1 + (Tcyc_s + T1_s) / twoTn + tvt1);
        this.b1 = bf * (-1 + Tcyc_s / twoTn - 2 * tvt1);
        this.b2 = bf * (-T1_s / twoTn + tvt1);
        this.b0w = bf * (1 + tvt1);
        this.b1w = bf * (-1 - 2 * tvt1);
        this.b2w = bf * tvt1;
        this.y1 = this.y2 = this.e1 = this.e2 = 0;
        this.y0 = 0;
        this.lastTimeMs = ctx.GetMillis();
    }

    public OnSimulationStep(ctx:SimulationContext){
        const now = ctx.GetMillis();
        if (now - this.lastTimeMs >= PID_CYCLE_TIME_MS) {
            const min:number = this.cfg_getValue(MIN_OUTPUT, 0);
            const max:number = this.cfg_getValue(MAX_OUTPUT, 100);
            const sp = ctx.GetFloat(this.inputSetpoint);
            const fb = ctx.GetFloat(this.inputFeedback);
            const e0 = this.cfg_getValue(DIRECTION, 0) == 1 ? fb - sp : sp - fb;
            //Anti-Windup: in der Begrenzung wird der I-Anteil abgeschaltet
            const inLimit = this.y1 >= max || this.y1 <= min;
            const raw = inLimit
                ? -this.a1 * this.y1 - this.a2 * this.y2 + this.b0w * e0 + this.b1w * this.e1 + this.b2w * this.e2
                : -this.a1 * this.y1 - this.a2 * this.y2 + this.b0 * e0 + this.b1 * this.e1 + this.b2 * this.e2;
            this.y0 = Math.min(max, Math.max(min, raw));
            this.y2 = this.y1; this.y1 = this.y0;
            this.e2 = this.e1; this.e1 = e0;
            this.lastTimeMs = now;
            this.SetDebugInfoText(`e=${formatNumber(e0)} y=${formatNumber(this.y0)}`);
        }
        ctx.SetFloat(this.output, this.y0);
    }
}
//#endregion

//#region Simulation (nur im Simulator, keine Firmware-Entsprechung; Ein- und Ausgaenge sind float)

const DEAD_TIME_S = "Dead time [s]";
const TIME_CONSTANT_S = "Time constant [s]";
const GAIN = "Gain";
const POSITION = "Position";
const DECIMALS = "Decimals";
const TIME_SPAN_S = "Time span [s]";
const AUTOSCALE = "Autoscale";
const Y_MIN = "Y min";
const Y_MAX = "Y max";

//Ein Eingang, ein Ausgang, ein float-Parameter, der auf dem Baustein angezeigt wird
abstract class SimulationSisoOperator extends FlowchartOperator {
    protected I:FlowchartInputConnector;
    protected O:FlowchartOutputConnector;
    private faceSvgText:SVGTextElement;
    private paramHTMLInput:HTMLInputElement|null=null;

    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null, private readonly paramKey:string, private readonly paramDefault:number, private readonly paramMin:number) {
        super(parent, caption, ti, configurationData);
        this.I = new FlowchartInputConnector(this, "In", 0, ConnectorType.FLOAT);
        this.O = new FlowchartOutputConnector(this, "Out", 0, ConnectorType.FLOAT);
        this.AppendConnectors([this.I], [this.O]);
        this.cfg_setDefault(paramKey, paramDefault);
        this.faceSvgText = <SVGTextElement>Svg(<SVGGElement>this.box.parentNode, "text", ["x", "70", "y", "55"], ["operator-face"]);
        this.updateFace();
    }

    protected get Param():number { return this.cfg_getValue(this.paramKey, this.paramDefault); }
    protected abstract faceLabel(param:number):string;
    private updateFace() { this.faceSvgText.textContent = this.faceLabel(this.Param); }

    public PopulateProperyGrid(tbody:HTMLTableSectionElement):boolean {
        this.paramHTMLInput = InputFloatNumber(tbody, this.paramKey, this.configurationData);
        return true;
    }

    public SavePropertyGrid(_tbody:HTMLTableSectionElement) {
        if (this.paramHTMLInput == null) return;
        this.cfg_setValue(this.paramKey, Math.max(this.paramMin, numberOr(this.paramHTMLInput.valueAsNumber, this.Param)));
        this.updateFace();
    }
}

//Out(t) = In(t - Tt); vor Ablauf der ersten Totzeit 0
export class Simulation_DeadTimeOperator extends SimulationSisoOperator {
    private samples:{t:number, v:number}[] = [];
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, DEAD_TIME_S, 1, 0);
    }
    get HasDirectFeedthrough() { return false; }
    protected faceLabel(p:number) { return `Tt = ${formatNumber(p)} s`; }

    public OnSimulationStart(_ctx:SimulationContext) {
        this.samples = [];
    }

    public OnSimulationStep(ctx:SimulationContext) {
        const now = ctx.GetMillis();
        const until = now - this.Param * 1000;
        this.samples.push({t: now, v: ctx.GetFloat(this.I)});
        //von den Samples, die schon mindestens Tt alt sind, nur das juengste behalten
        while (this.samples.length > 1 && this.samples[1].t <= until) this.samples.shift();
        ctx.SetFloat(this.O, this.samples[0].t <= until ? this.samples[0].v : 0);
    }
}

//T·dOut/dt + Out = In, exakt diskretisiert (stabil fuer jede Schrittweite)
export class Simulation_PT1Operator extends SimulationSisoOperator {
    private out = 0;
    private lastTimeMs = 0;
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, TIME_CONSTANT_S, 1, 0);
    }
    get HasDirectFeedthrough() { return false; }
    protected faceLabel(p:number) { return `T = ${formatNumber(p)} s`; }

    public OnSimulationStart(ctx:SimulationContext) {
        this.out = 0;
        this.lastTimeMs = ctx.GetMillis();
    }

    public OnSimulationStep(ctx:SimulationContext) {
        const now = ctx.GetMillis();
        const dt_s = (now - this.lastTimeMs) / 1000;
        this.lastTimeMs = now;
        const u = ctx.GetFloat(this.I);
        const T = this.Param;
        this.out = T <= 0 ? u : this.out + (1 - Math.exp(-dt_s / T)) * (u - this.out);
        ctx.SetFloat(this.O, this.out);
    }
}

export class Simulation_GainOperator extends SimulationSisoOperator {
    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData, GAIN, 1, -Infinity);
    }
    protected faceLabel(p:number) { return `× ${formatNumber(p)}`; }

    public OnSimulationStep(ctx:SimulationContext) {
        ctx.SetFloat(this.O, this.Param * ctx.GetFloat(this.I));
    }
}

//Umschalter A/B; Grundstellung im Property Grid, in der Simulation per Klick umschaltbar
export class Simulation_SwitchOperator extends FlowchartOperator {
    private A:FlowchartInputConnector;
    private B:FlowchartInputConnector;
    private O:FlowchartOutputConnector;
    private lever:SVGLineElement;
    private positionB = false;
    private positionHTMLSelect:HTMLSelectElement|null=null;

    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.A = new FlowchartInputConnector(this, "A", 0, ConnectorType.FLOAT);
        this.B = new FlowchartInputConnector(this, "B", 1, ConnectorType.FLOAT);
        this.O = new FlowchartOutputConnector(this, "Out", 0, ConnectorType.FLOAT);
        this.AppendConnectors([this.A, this.B], [this.O]);
        this.cfg_setDefault(POSITION, 0);
        this.ElementSvgG.classList.add("sim-switch");

        //Kontakte auf Hoehe der Eingaenge A (y=50) und B (y=70), Drehpunkt auf Hoehe des Ausgangs
        const g = <SVGGElement>Svg(<SVGGElement>this.box.parentNode, "g", [], ["sim-switch-graphic"]);
        Svg(g, "line", ["x1", "22", "y1", "50", "x2", "35", "y2", "50"], ["sim-switch-wire"]);
        Svg(g, "line", ["x1", "22", "y1", "70", "x2", "35", "y2", "70"], ["sim-switch-wire"]);
        Svg(g, "line", ["x1", "96", "y1", "50", "x2", "106", "y2", "50"], ["sim-switch-wire"]);
        Svg(g, "circle", ["cx", "38", "cy", "50", "r", "3"], ["sim-switch-contact"]);
        Svg(g, "circle", ["cx", "38", "cy", "70", "r", "3"], ["sim-switch-contact"]);
        this.lever = <SVGLineElement>Svg(g, "line", ["x1", "96", "y1", "50", "x2", "41", "y2", "50"], ["sim-switch-lever"]);
        Svg(g, "circle", ["cx", "96", "cy", "50", "r", "3.5"], ["sim-switch-pivot"]);

        this.ElementSvgG.addEventListener("click", () => {
            if (!parent.IsSimulating) return;
            this.positionB = !this.positionB;
            this.showPosition();
        });
        this.resetPosition();
    }

    private resetPosition() {
        this.positionB = this.cfg_getValue(POSITION, 0) == 1;
        this.showPosition();
    }

    private showPosition() {
        //Hebel endet kurz vor dem gewaehlten Kontakt
        this.lever.setAttribute("y2", this.positionB ? "69" : "50");
    }

    public PopulateProperyGrid(tbody:HTMLTableSectionElement):boolean {
        this.positionHTMLSelect = InputSelect(tbody, [new StringNumberTuple("A", 0), new StringNumberTuple("B", 1)], POSITION, this.configurationData);
        return true;
    }

    public SavePropertyGrid(_tbody:HTMLTableSectionElement) {
        if (this.positionHTMLSelect == null) return;
        this.cfg_setValue(POSITION, parseInt(this.positionHTMLSelect.value));
        this.resetPosition();
    }

    public OnSimulationStart(_ctx:SimulationContext) {
        this.resetPosition();
        this.SetDebugInfoText("click to switch");
    }

    public OnSimulationStep(ctx:SimulationContext) {
        ctx.SetFloat(this.O, ctx.GetFloat(this.positionB ? this.B : this.A));
    }

    public OnSimulationStop(_ctx:SimulationContext) {
        this.resetPosition();
    }
}

//Digitalanzeige des Eingangswerts
export class Simulation_MeterOperator extends FlowchartOperator {
    private I:FlowchartInputConnector;
    private display:SVGTextElement;
    private decimalsHTMLInput:HTMLInputElement|null=null;

    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.I = new FlowchartInputConnector(this, "In", 0, ConnectorType.FLOAT);
        this.AppendConnectors([this.I], []);
        this.cfg_setDefault(DECIMALS, 2);
        const g = <SVGGElement>this.box.parentNode;
        Svg(g, "rect", ["x", "26", "y", "33", "width", "106", "height", "34", "rx", "4"], ["sim-meter-screen"]);
        this.display = <SVGTextElement>Svg(g, "text", ["x", "126", "y", "57"], ["sim-meter-value"]);
        this.showIdle();
    }

    private showIdle() { this.display.textContent = "- - -"; }

    public PopulateProperyGrid(tbody:HTMLTableSectionElement):boolean {
        this.decimalsHTMLInput = InputIntegerNumber(tbody, 0, 6, DECIMALS, this.configurationData);
        return true;
    }

    public SavePropertyGrid(_tbody:HTMLTableSectionElement) {
        if (this.decimalsHTMLInput == null) return;
        const d = Math.trunc(numberOr(this.decimalsHTMLInput.valueAsNumber, this.cfg_getValue(DECIMALS, 2)));
        this.cfg_setValue(DECIMALS, Math.min(6, Math.max(0, d)));
    }

    public OnSimulationStep(ctx:SimulationContext) {
        this.display.textContent = ctx.GetFloat(this.I).toFixed(this.cfg_getValue(DECIMALS, 2));
    }

    public OnSimulationStop(_ctx:SimulationContext) {
        this.showIdle();
    }
}

//Kurvenschreiber: drei Eingaenge, zeigt die letzten "Time span" Sekunden. Nach dem Stoppen bleibt der Verlauf stehen.
const PLOT_COLORS = ["#2563eb", "#dc2626", "#16a34a"];
const PLOT_W = 380, PLOT_H = 220;
const PLOT_X0 = 50, PLOT_X1 = 370, PLOT_Y0 = 34, PLOT_Y1 = 206;
const PLOT_MAX_POINTS = 800;

export class Simulation_PlotterOperator extends FlowchartOperator {
    private inputs:FlowchartInputConnector[];
    private times:number[] = [];
    private values:number[][] = [[], [], []];
    private lines:SVGPolylineElement[] = [];
    private yLabels:SVGTextElement[] = [];
    private tLabel:SVGTextElement;
    private spanHTMLInput:HTMLInputElement|null=null;
    private autoscaleHTMLSelect:HTMLSelectElement|null=null;
    private yMinHTMLInput:HTMLInputElement|null=null;
    private yMaxHTMLInput:HTMLInputElement|null=null;

    constructor(parent: Flowchart, caption: string, ti:TypeInfo, configurationData:KeyValueTuple[]|null) {
        super(parent, caption, ti, configurationData);
        this.inputs = [0, 1, 2].map(i => new FlowchartInputConnector(this, `In${i + 1}`, i, ConnectorType.FLOAT));
        this.AppendConnectors(this.inputs, []);
        this.SetSize(PLOT_W, PLOT_H);
        this.cfg_setDefault(TIME_SPAN_S, 10);
        this.cfg_setDefault(AUTOSCALE, 1);
        this.cfg_setDefault(Y_MIN, 0);
        this.cfg_setDefault(Y_MAX, 100);
        //Beschriftung der Eingaenge in der Farbe ihrer Kurve
        this.InputSvgG.querySelectorAll(".operator-input-caption").forEach((t, i) => (<SVGTextElement>t).style.fill = PLOT_COLORS[i]);

        const g = <SVGGElement>Svg(<SVGGElement>this.box.parentNode, "g", [], ["sim-plot"]);
        const area = ["x", `${PLOT_X0}`, "y", `${PLOT_Y0}`, "width", `${PLOT_X1 - PLOT_X0}`, "height", `${PLOT_Y1 - PLOT_Y0}`];
        const clipId = `sim-plot-clip-${this.GlobalOperatorIndex}`;
        Svg(Svg(Svg(g, "defs", []), "clipPath", ["id", clipId]), "rect", area);
        Svg(g, "rect", area, ["sim-plot-area"]);
        for (let i = 1; i < 4; i++) {
            const y = PLOT_Y0 + i * (PLOT_Y1 - PLOT_Y0) / 4;
            Svg(g, "line", ["x1", `${PLOT_X0}`, "y1", `${y}`, "x2", `${PLOT_X1}`, "y2", `${y}`], ["sim-plot-grid"]);
        }
        for (let i = 1; i < 5; i++) {
            const x = PLOT_X0 + i * (PLOT_X1 - PLOT_X0) / 5;
            Svg(g, "line", ["x1", `${x}`, "y1", `${PLOT_Y0}`, "x2", `${x}`, "y2", `${PLOT_Y1}`], ["sim-plot-grid"]);
        }
        const traces = Svg(g, "g", ["clip-path", `url(#${clipId})`]);
        this.lines = PLOT_COLORS.map(c => {
            const l = <SVGPolylineElement>Svg(traces, "polyline", [], ["sim-plot-line"]);
            l.style.stroke = c;
            return l;
        });
        //y-Achse: oben, Mitte, unten; Zeitspanne unten rechts
        this.yLabels = [PLOT_Y0 + 11, (PLOT_Y0 + PLOT_Y1) / 2 + 4, PLOT_Y1 - 4].map(y => <SVGTextElement>Svg(g, "text", ["x", `${PLOT_X0 + 3}`, "y", `${y}`], ["sim-plot-label"]));
        this.tLabel = <SVGTextElement>Svg(g, "text", ["x", `${PLOT_X1 - 3}`, "y", `${PLOT_Y1 - 4}`], ["sim-plot-label", "end"]);
        this.updateLabels(this.cfg_getValue(Y_MIN, 0), this.cfg_getValue(Y_MAX, 100));
    }

    private get SpanMs():number { return this.cfg_getValue(TIME_SPAN_S, 10) * 1000; }

    private updateLabels(yMin:number, yMax:number) {
        [yMax, (yMin + yMax) / 2, yMin].forEach((v, i) => this.yLabels[i].textContent = formatNumber(Number(v.toPrecision(3))));
        this.tLabel.textContent = `last ${formatNumber(this.cfg_getValue(TIME_SPAN_S, 10))} s`;
    }

    public PopulateProperyGrid(tbody:HTMLTableSectionElement):boolean {
        this.spanHTMLInput = InputFloatNumber(tbody, TIME_SPAN_S, this.configurationData);
        this.autoscaleHTMLSelect = InputSelect(tbody, [new StringNumberTuple("Yes", 1), new StringNumberTuple("No", 0)], AUTOSCALE, this.configurationData);
        this.yMinHTMLInput = InputFloatNumber(tbody, Y_MIN, this.configurationData);
        this.yMaxHTMLInput = InputFloatNumber(tbody, Y_MAX, this.configurationData);
        return true;
    }

    public SavePropertyGrid(_tbody:HTMLTableSectionElement) {
        if (this.autoscaleHTMLSelect == null) return;
        this.cfg_setValue(TIME_SPAN_S, Math.max(0.1, numberOr(this.spanHTMLInput!.valueAsNumber, this.cfg_getValue(TIME_SPAN_S, 10))));
        this.cfg_setValue(AUTOSCALE, parseInt(this.autoscaleHTMLSelect.value));
        this.cfg_setValue(Y_MIN, numberOr(this.yMinHTMLInput!.valueAsNumber, this.cfg_getValue(Y_MIN, 0)));
        this.cfg_setValue(Y_MAX, numberOr(this.yMaxHTMLInput!.valueAsNumber, this.cfg_getValue(Y_MAX, 100)));
        this.updateLabels(this.cfg_getValue(Y_MIN, 0), this.cfg_getValue(Y_MAX, 100));
    }

    public OnSimulationStart(_ctx:SimulationContext) {
        this.times = [];
        this.values = [[], [], []];
    }

    public OnSimulationStep(ctx:SimulationContext) {
        const now = ctx.GetMillis();
        const span = this.SpanMs;
        const current = this.inputs.map(i => ctx.GetFloat(i));
        //hoechstens ca. PLOT_MAX_POINTS Punkte je Kurve: ist der vorletzte Punkt zu jung, wird der letzte ueberschrieben
        const last = this.times.length - 1;
        if (last >= 1 && now - this.times[last - 1] < span / PLOT_MAX_POINTS) {
            this.times[last] = now;
            current.forEach((v, i) => this.values[i][last] = v);
        } else {
            this.times.push(now);
            current.forEach((v, i) => this.values[i].push(v));
        }
        //aeltere Punkte verwerfen; einer links vom Fenster bleibt, damit die Kurve am linken Rand beginnt
        let drop = 0;
        while (drop + 1 < this.times.length && this.times[drop + 1] <= now - span) drop++;
        if (drop > 0) {
            this.times.splice(0, drop);
            this.values.forEach(v => v.splice(0, drop));
        }
        this.redraw(now, span);
        this.SetDebugInfoText(this.inputs.flatMap((inp, i) => inp.LinksLength > 0 ? [`${inp.Caption}=${formatNumber(current[i])}`] : []).join("  "));
    }

    private redraw(now:number, span:number) {
        const connected = this.inputs.map(i => i.LinksLength > 0);
        let yMin:number = this.cfg_getValue(Y_MIN, 0);
        let yMax:number = this.cfg_getValue(Y_MAX, 100);
        if (this.cfg_getValue(AUTOSCALE, 1) == 1) {
            let lo = Infinity, hi = -Infinity;
            this.values.forEach((vs, i) => { if (connected[i]) for (const v of vs) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
            if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
            if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
            const pad = (hi - lo) * 0.05;
            yMin = lo - pad;
            yMax = hi + pad;
        }
        if (yMax <= yMin) yMax = yMin + 1;
        this.updateLabels(yMin, yMax);
        const sx = (PLOT_X1 - PLOT_X0) / span;
        const sy = (PLOT_Y1 - PLOT_Y0) / (yMax - yMin);
        this.lines.forEach((line, i) => {
            if (!connected[i]) { line.setAttribute("points", ""); return; }
            const pts = this.times.map((t, k) => `${(PLOT_X1 - (now - t) * sx).toFixed(1)},${(PLOT_Y1 - (this.values[i][k] - yMin) * sy).toFixed(1)}`);
            line.setAttribute("points", pts.join(" "));
        });
    }
}
//#endregion
