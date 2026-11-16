import { scheduler } from "@generated/wsprotocol_ts/ws-protocol";
import { ISender, NamespaceAndHandler } from "./utils";

type ScheduleUnion = scheduler.Schedule.Payload["schedule"];

export var exampleSchedules: Map<string, ScheduleUnion> = new Map<string, ScheduleUnion>()

exampleSchedules.set("OneWeekIn15MinutesA", { classId: scheduler.OneWeekIn15Minutes.CLASS_ID, data: { v: new Array<number>(84).fill(0x55) } })
exampleSchedules.set("OneWeekIn15MinutesB", { classId: scheduler.OneWeekIn15Minutes.CLASS_ID, data: { v: new Array<number>(84).fill(0xAA) } })
exampleSchedules.set("PredefinedA", { classId: scheduler.Predefined.CLASS_ID })
exampleSchedules.set("PredefinedB", { classId: scheduler.Predefined.CLASS_ID })
exampleSchedules.set("SunRandomA", { classId: scheduler.SunRandom.CLASS_ID, offsetMinutes: 15, randomMinutes: 15 })
exampleSchedules.set("SunRandomB", { classId: scheduler.SunRandom.CLASS_ID, offsetMinutes: 30, randomMinutes: 30 })

function scheduleType(s: ScheduleUnion): scheduler.ScheduleType {
    switch (s.classId) {
        case scheduler.OneWeekIn15Minutes.CLASS_ID: return scheduler.ScheduleType.ONE_WEEK_IN_15_MINUTES;
        case scheduler.SunRandom.CLASS_ID: return scheduler.ScheduleType.SUN_RANDOM;
        default: return scheduler.ScheduleType.PREDEFINED;
    }
}

function numberArray2HexString(d: Array<number>) {
    return d.map(x => x.toString(16).padStart(2, "0")).join("");
}

export class SchedulerHandler extends NamespaceAndHandler {
    constructor() {
        super(scheduler.NAMESPACE_ID)
    }

    public Handle(messageTypeId: number, view: DataView, sender: ISender) {
        switch (messageTypeId) {
            case scheduler.RequestSchedulerList.TYPE_ID: {
                const req = scheduler.RequestSchedulerList.decode(view, 0);
                const items = [...exampleSchedules].map(([name, s]) => ({ classId: scheduler.SchedulerListItem.CLASS_ID, name, type: scheduleType(s) } as const));
                sender.respond(scheduler.ResponseSchedulerList.encode, { items });
                break;
            }
            case scheduler.RequestSchedulerOpen.TYPE_ID: {
                const req = scheduler.RequestSchedulerOpen.decode(view, 0);
                const s = exampleSchedules.get(req.name);
                if (s === undefined) return;
                if (s.classId == scheduler.OneWeekIn15Minutes.CLASS_ID) {
                    console.log(`Send OneWeekIn15Minutes "${req.name}". Data bytes are ${numberArray2HexString(s.data.v)}`)
                }
                sender.respond(scheduler.ResponseSchedulerOpen.encode, { payload: { classId: scheduler.Schedule.CLASS_ID, name: req.name, schedule: s }, });
                break;
            }
            case scheduler.RequestSchedulerSave.TYPE_ID: {
                const req = scheduler.RequestSchedulerSave.decode(view, 0);
                const p = req.payload;
                if (p.schedule.classId == scheduler.OneWeekIn15Minutes.CLASS_ID) {
                    console.log(`Got OneWeekIn15Minutes "${p.name}". Data bytes are ${numberArray2HexString(p.schedule.data.v)}`)
                }
                exampleSchedules.set(p.name, p.schedule);
                sender.respond(scheduler.ResponseSchedulerSave.encode, { name: p.name });
                break;
            }
            case scheduler.RequestSchedulerRename.TYPE_ID: {
                const req = scheduler.RequestSchedulerRename.decode(view, 0);
                const s = exampleSchedules.get(req.oldName);
                if (s === undefined) return;
                exampleSchedules.delete(req.oldName);
                exampleSchedules.set(req.newName, s);
                break;
            }
            case scheduler.RequestSchedulerDelete.TYPE_ID: {
                const req = scheduler.RequestSchedulerDelete.decode(view, 0);
                exampleSchedules.delete(req.name);
                break;
            }
        }
    }
}
