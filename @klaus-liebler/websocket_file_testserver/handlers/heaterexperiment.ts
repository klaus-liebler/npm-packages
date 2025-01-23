import * as flatbuffers from "flatbuffers"
import { heaterexperiment } from "@klaus-liebler/flatbuffer-object-definitions"
import { ISender, NamespaceAndHandler } from "..";
import { randomInt } from "crypto";

export class HeaterExperimentHandler extends NamespaceAndHandler {
    constructor(){
        super(heaterexperiment.Namespace.Value)
    }
    public Handle(buffer: flatbuffers.ByteBuffer, sender: ISender) {
        var req=heaterexperiment.RequestHeater.getRootAsRequestHeater(buffer)

        let b = new flatbuffers.Builder(1024);
        b.finish(heaterexperiment.ResponseHeater.createResponseHeater(b, randomInt(40, 60), randomInt(40,60), randomInt(1, 20), 25 ));
        sender.send(heaterexperiment.Namespace.Value, b);
    }

    
}