
import * as flatbuffers from "flatbuffers"
import { OneWeekIn15Minutes, eSchedule, Namespace, RequestWrapper, Requests, ResponseSchedulerListItem, ResponseSchedulerList, ResponseWrapper, Responses, RequestSchedulerSave, uSchedule, SunRandom, ResponseSchedulerSave, RequestSchedulerOpen, ResponseSchedulerOpen, Schedule, OneWeekIn15MinutesData } from "@generated/flatbuffers_ts/scheduler"
import { ISender, NamespaceAndHandler } from "./utils";


export var exampleSchedules: Map<string, any> = new Map<string, any>()

exampleSchedules.set("OneWeekIn15MinutesA", { type: eSchedule.OneWeekIn15Minutes, data: new Array<number>(84).fill(0x55) })
exampleSchedules.set("OneWeekIn15MinutesB", { type: eSchedule.OneWeekIn15Minutes, data: new Array<number>(84).fill(0xAA) })
exampleSchedules.set("PredefinedA", { type: eSchedule.Predefined })
exampleSchedules.set("PredefinedB", { type: eSchedule.Predefined })
exampleSchedules.set("SunRandomA", { type: eSchedule.SunRandom, offsetMinutes: 15, randomMinutes: 15 })
exampleSchedules.set("SunRandomB", { type: eSchedule.SunRandom, offsetMinutes: 30, randomMinutes: 30 })


export class SchedulerHandler extends NamespaceAndHandler {
    constructor() {
        super(Namespace.Value)
    }
    private numberArray2HexString(d: Array<number>) {
        var s = "";
        for (let index = 0; index < d.length; index++) {
            var xx = d[index].toString(16);
            if (xx.length == 1) s += "0" + xx;
            else s += xx;
        }
        return s;
    }

    public Handle(bb: flatbuffers.ByteBuffer, sender: ISender) {
        var rw = RequestWrapper.getRootAsRequestWrapper(bb)
        let b = new flatbuffers.Builder(1024);
        switch (rw.requestType()) {
            case Requests.NONE: return;
            case Requests.RequestSchedulerList: {
                console.info(`processScheduler_RequestScheduler->uRequestScheduler.RequestSchedulerList`);

                var data: number[] = [];
                exampleSchedules.forEach((v, k) => {
                    data.push(ResponseSchedulerListItem.createResponseSchedulerListItem(b, b.createString(k), v.type))
                });
                let itemsOffset = ResponseSchedulerList.createItemsVector(b, data);

                b.finish(
                    ResponseWrapper.createResponseWrapper(b,
                        Responses.ResponseSchedulerList,
                        ResponseSchedulerList.createResponseSchedulerList(b, itemsOffset)
                    )
                );
                sender.send(Namespace.Value, b);
                break;
            }
            case Requests.RequestSchedulerOpen: {
                let mo = <RequestSchedulerOpen>rw.request(new RequestSchedulerOpen());
                var s = exampleSchedules.get(mo.name()!)
                if (s === undefined) return;
                switch (mo.type()) {
                    case eSchedule.OneWeekIn15Minutes: {
                        console.log(`Send OneWeekIn15Minutes "${mo.name()}". Data bytes are ${this.numberArray2HexString(s.data)}`)
                        b.finish(
                            ResponseWrapper.createResponseWrapper(b, Responses.ResponseSchedulerOpen,

                                ResponseSchedulerOpen.createResponseSchedulerOpen(b,
                                    Schedule.createSchedule(b,
                                        b.createString(mo.name()),
                                        uSchedule.OneWeekIn15Minutes,
                                        OneWeekIn15Minutes.createOneWeekIn15Minutes(b,
                                            OneWeekIn15MinutesData.createOneWeekIn15MinutesData(b, s.data)
                                        )
                                    )
                                )

                            )
                        );
                        sender.send(Namespace.Value, b);
                        break
                    }
                    case eSchedule.SunRandom: {
                        b.finish(
                            ResponseWrapper.createResponseWrapper(b, Responses.ResponseSchedulerOpen,
                                ResponseSchedulerOpen.createResponseSchedulerOpen(b,
                                    Schedule.createSchedule(b,
                                        b.createString(mo.name()),
                                        uSchedule.SunRandom,
                                        SunRandom.createSunRandom(b, s.offsetMinutes, s.randomMinutes)
                                    )
                                )

                            )
                        );
                        sender.send(Namespace.Value, b);
                        break
                    }
                }

                break;
            }
            case Requests.RequestSchedulerSave: {

                let ms = <RequestSchedulerSave>rw.request(new RequestSchedulerSave())
                var p = ms.payload()!;
                switch (p.scheduleType()) {
                    case uSchedule.OneWeekIn15Minutes:
                        var ow = <OneWeekIn15Minutes>p.schedule(new OneWeekIn15Minutes())
                        var d = new Array<number>()
                        for (var i = 0; i < 84; i++)d.push(ow.data()!.v(i)!)
                        console.log(`Got OneWeekIn15Minutes "${p.name()}". Data bytes are ${this.numberArray2HexString(d)}`)
                        exampleSchedules.set(p.name()!, { type: eSchedule.OneWeekIn15Minutes, data: d })
                        break;
                    case uSchedule.SunRandom:
                        var sr = <SunRandom>p.schedule(new SunRandom())
                        exampleSchedules.set(p.name()!, { type: eSchedule.OneWeekIn15Minutes, offsetMinutes: sr.offsetMinutes(), randomMinutes: sr.randomMinutes() })
                        break;
                }
                b.finish(
                    ResponseWrapper.createResponseWrapper(b, Responses.ResponseSchedulerSave,

                        ResponseSchedulerSave.createResponseSchedulerSave(b, b.createString(p.name()))

                    )
                );
                sender.send(Namespace.Value, b);
                break;
            }
            case Requests.RequestSchedulerRename:
                {

                }
            case Requests.RequestSchedulerDelete:
        }
    }
}



