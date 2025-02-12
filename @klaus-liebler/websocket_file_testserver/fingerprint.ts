import * as flatbuffers from "flatbuffers"
import {Finger, Namespace, NotifyEnrollNewFinger, RequestDeleteFinger, RequestEnrollNewFinger, RequestFingerActionManually, RequestRenameFinger, Requests, RequestStoreFingerAction, RequestStoreFingerSchedule, RequestWrapper, ResponseCancelInstruction, ResponseDeleteAllFingers, ResponseDeleteFinger, ResponseEnrollNewFinger, ResponseFingerActionManually, ResponseFingerprintSensorInfo, ResponseFingers, ResponseRenameFinger, Responses, ResponseStoreFingerAction, ResponseStoreFingerSchedule, ResponseWrapper, Uint8x32} from "@generated/flatbuffers_ts/fingerprint";
import { exampleSchedules} from "./scheduler"
import { ISender, NamespaceAndHandler } from "./utils";

const exampleFingers=[
    {name:"Klaus rechts mitte", index:1, schedule:"OneWeekIn15MinutesA", action:1},
    {name:"Steffi links mitte", index:2, schedule:"PredefinedA", action:3},
    {name:"Klara rechts zeige", index:3, schedule:"SunRandomA", action:2},
]



export class FingerprintHandler extends NamespaceAndHandler {
    constructor(){
        super(Namespace.Value)
    }

    private processRequestStoreFingerAction(req: RequestStoreFingerAction, sender: ISender){
        let b = new flatbuffers.Builder(1024);
        exampleFingers.find(v=>v.index==req.fingerIndex())!.action=req.actionIndex()
        b.finish(ResponseWrapper.createResponseWrapper(b, Responses.ResponseStoreFingerAction,
            ResponseStoreFingerAction.createResponseStoreFingerAction(b)
            ));
        sender.send(Namespace.Value, b)
    }
    
    private processRequestStoreFingerSchedule(req: RequestStoreFingerSchedule, sender: ISender){

        let b = new flatbuffers.Builder(1024);
        exampleFingers.find(v=>v.index==req.fingerIndex())!.schedule=req.scheduleName()!
        b.finish(ResponseWrapper.createResponseWrapper(b, Responses.ResponseStoreFingerSchedule,
            ResponseStoreFingerSchedule.createResponseStoreFingerSchedule(b)
            ));
        sender.send(Namespace.Value, b)
    }
    
    private sendResponseFingerprintSensorInfo(sender: ISender) {
        let b = new flatbuffers.Builder(1024);
        var usedIndices =new Array(32).fill(0);
        usedIndices[0]=0b10101010;
        usedIndices[1]=0b01010101;
        
        var alg=b.createString("AlgVer1.1")
        var fw=b.createString("FwVer1.2")
        ResponseFingerprintSensorInfo.startResponseFingerprintSensorInfo(b);
        ResponseFingerprintSensorInfo.addAlgVer(b, alg);
        ResponseFingerprintSensorInfo.addFwVer(b, fw);
        ResponseFingerprintSensorInfo.addBaudRateTimes9600(b, 6);
        ResponseFingerprintSensorInfo.addDataPacketSizeCode(b, 2);
        ResponseFingerprintSensorInfo.addDeviceAddress(b, 0xffff);
        ResponseFingerprintSensorInfo.addLibrarySizeMax(b, 1500);
        ResponseFingerprintSensorInfo.addLibrarySizeUsed(b, 2);
        ResponseFingerprintSensorInfo.addLibraryUsedIndices(b, Uint8x32.createUint8x32(b, usedIndices));
        ResponseFingerprintSensorInfo.addSecurityLevel(b, 3)
        ResponseFingerprintSensorInfo.addStatus(b, 0);
        b.finish(ResponseWrapper.createResponseWrapper(b, Responses.ResponseFingerprintSensorInfo, ResponseFingerprintSensorInfo.endResponseFingerprintSensorInfo(b)));
        sender.send(Namespace.Value, b)
    }
    
    
    private sendResponseFingers(sender: ISender) {
        let b = new flatbuffers.Builder(1024);
        var fingers:number[]=[];
        exampleFingers.forEach(f=>{
            fingers.push(Finger.createFinger(b, b.createString(f.name), f.index, b.createString(f.schedule), f.action))
        })
      
        var scheduleNames: number[]=[];
        exampleSchedules.forEach((v,k) => {
            scheduleNames.push(b.createString(k))
        });
    
        b.finish(ResponseWrapper.createResponseWrapper(b, Responses.ResponseFingers,
            ResponseFingers.createResponseFingers(b, ResponseFingers.createScheduleNamesVector(b, scheduleNames),  ResponseFingers.createFingersVector(b, fingers))
            ));
        sender.send(Namespace.Value, b)
    }
    private newFingerIndex=42;
    
    private sendNotifyEnrollNewFinger(sender: ISender, step:number, index:number, name:string, delay_ms:number){
        
        setTimeout(() => {
            console.log(`sendNotifyEnrollNewFinger step=${step}, index=${index}, name=${name}`)
            let b = new flatbuffers.Builder(1024);
            b.finish(ResponseWrapper.createResponseWrapper(b, Responses.NotifyEnrollNewFinger, NotifyEnrollNewFinger.createNotifyEnrollNewFinger(b, b.createString(name), index, step, 0)));
            sender.send(Namespace.Value, b)
            if(step==15){
                exampleFingers.push({name:name, index:this.newFingerIndex, schedule:exampleSchedules[0].name, action:0})
                this.newFingerIndex++;
            }
        }, delay_ms);
    
    }
    
    private sendResponseEnrollNewFinger(sender: ISender, req:RequestEnrollNewFinger){
        var fpName= req.name()!;
        console.log(`sendResponseEnrollNewFinger name=${fpName}`)
        let b = new flatbuffers.Builder(1024);
        b.finish(ResponseWrapper.createResponseWrapper(b, Responses.ResponseEnrollNewFinger, ResponseEnrollNewFinger.createResponseEnrollNewFinger(b, 0)));
        sender.send(Namespace.Value, b)
        for(var step=0; step<16;step++){
            this.sendNotifyEnrollNewFinger(sender, step, this.newFingerIndex, fpName, step*500+2000);
        }
    }
    public Handle(bb: flatbuffers.ByteBuffer, sender: ISender) {
        var rw=RequestWrapper.getRootAsRequestWrapper(bb)
        switch(rw.requestType()){
            case Requests.NONE:return
            case Requests.RequestFingers:this.sendResponseFingers(sender); break;
            case Requests.RequestFingerprintSensorInfo:this.sendResponseFingerprintSensorInfo(sender); break;
            case Requests.RequestRenameFinger:this.processRenameFinger(sender, rw.request(new RequestRenameFinger())); break;
            case Requests.RequestCancelInstruction:this.processCancelInstruction(sender); break;
            case Requests.RequestDeleteAllFingers:this.processDeleteAllFingers(sender); break;
            case Requests.RequestStoreFingerSchedule:this.processRequestStoreFingerSchedule(rw.request(new RequestStoreFingerSchedule()), sender); break;
            case Requests.RequestStoreFingerAction:this.processRequestStoreFingerAction(rw.request(new RequestStoreFingerAction()), sender); break;
            case Requests.RequestDeleteFinger:this.processDeleteFinger(rw.request(new RequestDeleteFinger()), sender); break;
            case Requests.RequestEnrollNewFinger:this.sendResponseEnrollNewFinger(sender, rw.request(new RequestEnrollNewFinger())); break;
            case Requests.RequestFingerActionManually:this.processFingerActionManually(sender, rw.request(new RequestFingerActionManually())); break;
        }   
    }
    processFingerActionManually(sender: ISender, arg1: any) {
        let b = new flatbuffers.Builder(1024);
        b.finish(ResponseWrapper.createResponseWrapper(b, Responses.ResponseFingerActionManually, ResponseFingerActionManually.createResponseFingerActionManually(b)));
        sender.send(Namespace.Value, b)
    }
    processDeleteFinger(r: RequestDeleteFinger, sender: ISender) {
        exampleFingers.filter(v=>v.name==r.name())
        let b = new flatbuffers.Builder(1024);
        b.finish(ResponseWrapper.createResponseWrapper(b, Responses.ResponseDeleteFinger, ResponseDeleteFinger.createResponseDeleteFinger(b, 0, b.createString(r.name()))));
        sender.send(Namespace.Value, b)
    }
    processDeleteAllFingers(sender: ISender) {
        let b = new flatbuffers.Builder(1024);
        b.finish(ResponseWrapper.createResponseWrapper(b, Responses.ResponseDeleteAllFingers, ResponseDeleteAllFingers.createResponseDeleteAllFingers(b, 0)));
        sender.send(Namespace.Value, b)
    }
    processCancelInstruction(sender: ISender) {
        let b = new flatbuffers.Builder(1024);
        b.finish(ResponseWrapper.createResponseWrapper(b, Responses.ResponseCancelInstruction, ResponseCancelInstruction.createResponseCancelInstruction(b, 0)));
        sender.send(Namespace.Value, b)
    }
    processRenameFinger(sender: ISender, r: RequestRenameFinger) {
        exampleFingers.find(v=>v.name==r.oldName())!.name=r.newName()!
        let b = new flatbuffers.Builder(1024);
        b.finish(ResponseWrapper.createResponseWrapper(b, Responses.ResponseRenameFinger, ResponseRenameFinger.createResponseRenameFinger(b, 0)));
        sender.send(Namespace.Value, b)
    }
}


