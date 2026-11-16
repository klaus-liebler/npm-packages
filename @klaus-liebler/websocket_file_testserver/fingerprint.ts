import { fingerprint } from "@generated/wsprotocol_ts/ws-protocol";
import { exampleSchedules } from "./scheduler"
import { ISender, NamespaceAndHandler } from "./utils";

const exampleFingers = [
    { name: "Klaus rechts mitte", index: 1, schedule: "OneWeekIn15MinutesA", action: 1 },
    { name: "Steffi links mitte", index: 2, schedule: "PredefinedA", action: 3 },
    { name: "Klara rechts zeige", index: 3, schedule: "SunRandomA", action: 2 },
]

export class FingerprintHandler extends NamespaceAndHandler {
    private newFingerIndex = 42;

    constructor() {
        super(fingerprint.NAMESPACE_ID)
    }

    public Handle(messageTypeId: number, view: DataView, sender: ISender) {
        switch (messageTypeId) {
            case fingerprint.RequestFingers.TYPE_ID: {
                const req = fingerprint.RequestFingers.decode(view, 0);
                sender.respond(fingerprint.ResponseFingers.encode, { scheduleNames: [...exampleSchedules.keys()],
                    fingers: exampleFingers.map(f => ({ classId: fingerprint.Finger.CLASS_ID, name: f.name, index: f.index, scheduleName: f.schedule, actionIndex: f.action } as const)), });
                break;
            }
            case fingerprint.RequestFingerprintSensorInfo.TYPE_ID: {
                const req = fingerprint.RequestFingerprintSensorInfo.decode(view, 0);
                const usedIndices = new Array<number>(32).fill(0);
                usedIndices[0] = 0b10101010;
                usedIndices[1] = 0b01010101;
                sender.respond(fingerprint.ResponseFingerprintSensorInfo.encode, { status: 0,
                    librarySizeMax: 1500,
                    librarySizeUsed: 2,
                    libraryUsedIndices: { v: usedIndices },
                    securityLevel: 3,
                    deviceAddress: 0xffff,
                    dataPacketSizeCode: 2,
                    baudRateTimes9600: 6,
                    algVer: "AlgVer1.1",
                    fwVer: "FwVer1.2", });
                break;
            }
            case fingerprint.RequestRenameFinger.TYPE_ID: {
                const req = fingerprint.RequestRenameFinger.decode(view, 0);
                const f = exampleFingers.find(v => v.name == req.oldName);
                if (f) f.name = req.newName;
                sender.respond(fingerprint.ResponseRenameFinger.encode, { errorcode: f ? 0 : 1 });
                break;
            }
            case fingerprint.RequestCancelInstruction.TYPE_ID: {
                const req = fingerprint.RequestCancelInstruction.decode(view, 0);
                sender.respond(fingerprint.ResponseCancelInstruction.encode, { errorcode: 0 });
                break;
            }
            case fingerprint.RequestDeleteAllFingers.TYPE_ID: {
                const req = fingerprint.RequestDeleteAllFingers.decode(view, 0);
                exampleFingers.length = 0;
                sender.respond(fingerprint.ResponseDeleteAllFingers.encode, { errorcode: 0 });
                break;
            }
            case fingerprint.RequestStoreFingerSchedule.TYPE_ID: {
                const req = fingerprint.RequestStoreFingerSchedule.decode(view, 0);
                const f = exampleFingers.find(v => v.index == req.fingerIndex);
                if (f) f.schedule = req.scheduleName;
                sender.respond(fingerprint.ResponseStoreFingerSchedule.encode, {});
                break;
            }
            case fingerprint.RequestStoreFingerAction.TYPE_ID: {
                const req = fingerprint.RequestStoreFingerAction.decode(view, 0);
                const f = exampleFingers.find(v => v.index == req.fingerIndex);
                if (f) f.action = req.actionIndex;
                sender.respond(fingerprint.ResponseStoreFingerAction.encode, {});
                break;
            }
            case fingerprint.RequestDeleteFinger.TYPE_ID: {
                const req = fingerprint.RequestDeleteFinger.decode(view, 0);
                const i = exampleFingers.findIndex(v => v.name == req.name);
                if (i >= 0) exampleFingers.splice(i, 1);
                sender.respond(fingerprint.ResponseDeleteFinger.encode, { errorcode: i >= 0 ? 0 : 1, name: req.name });
                break;
            }
            case fingerprint.RequestEnrollNewFinger.TYPE_ID: {
                const req = fingerprint.RequestEnrollNewFinger.decode(view, 0);
                console.log(`sendResponseEnrollNewFinger name=${req.name}`)
                sender.respond(fingerprint.ResponseEnrollNewFinger.encode, { errorcode: 0 });
                for (let step = 0; step < 16; step++) {
                    this.sendNotifyEnrollNewFinger(sender, step, this.newFingerIndex, req.name, step * 500 + 2000);
                }
                break;
            }
            case fingerprint.RequestFingerActionManually.TYPE_ID: {
                const req = fingerprint.RequestFingerActionManually.decode(view, 0);
                sender.respond(fingerprint.ResponseFingerActionManually.encode, {});
                break;
            }
        }
    }

    private sendNotifyEnrollNewFinger(sender: ISender, step: number, index: number, name: string, delay_ms: number) {
        setTimeout(() => {
            console.log(`sendNotifyEnrollNewFinger step=${step}, index=${index}, name=${name}`)
            sender.send(fingerprint.NotifyEnrollNewFinger.encode({ name, index, step, errorcode: 0 }));
            if (step == 15) {
                exampleFingers.push({ name: name, index: this.newFingerIndex, schedule: exampleSchedules.keys().next().value ?? "", action: 0 })
                this.newFingerIndex++;
            }
        }, delay_ms);
    }
}
