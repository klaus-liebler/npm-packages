import { TemplateResult, html } from "lit-html";
import { IAppManagement, IMessageListener } from "../utils/interfaces";

export enum ControllerState {
    CREATED,
    STARTED,
    PAUSED,
}

export abstract class ScreenController implements IMessageListener {
    private state=ControllerState.CREATED
    public get State(): ControllerState {
        return this.state; 
    }
    constructor(protected appManagement: IAppManagement) {}
    
    public OnStartPublic(){
        switch (this.state) {
            case ControllerState.CREATED:
                this.OnFirstStart();
                this.state=ControllerState.STARTED;
                break;
            case ControllerState.STARTED:
                break;
            case ControllerState.PAUSED:
                this.OnRestart();
                this.state=ControllerState.STARTED;
                break;
            default:
                break;
        }
    }
    public OnPausePublic(){
        switch (this.state) {
            case ControllerState.CREATED:
                break;
            case ControllerState.STARTED:
                this.OnPause();
                this.state=ControllerState.PAUSED;
                break;
            case ControllerState.PAUSED:
                break;
            default:
                break;
        }
    }
    public abstract OnCreate(): void;
    protected abstract OnFirstStart(): void;
    protected abstract OnRestart(): void;
    abstract OnPause(): void;
    abstract OnMessage(namespaceId: number, messageTypeId: number, view: DataView): void;
    abstract Template():TemplateResult<1>
    SetParameter(_params:RegExpMatchArray):void{}
}

export class DefaultScreenController extends ScreenController {
    
    public Template = () => html`<span>DefaultScreenController</span>`
   
    OnMessage(_namespaceId: number, _messageTypeId: number, _view: DataView): void {

    }

    OnCreate(): void {

    }
    OnFirstStart(): void {

    }
    OnRestart(): void {

    }
    OnPause(): void {

    }
}