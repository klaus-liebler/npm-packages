import { heaterexperiment } from "@generated/wsprotocol_ts/ws-protocol";
import { ISender, NamespaceAndHandler } from "./utils";
import { randomInt } from "crypto";

export class HeaterExperimentHandler extends NamespaceAndHandler {
    constructor(){
        super(heaterexperiment.NAMESPACE_ID)
    }
    public Handle(messageTypeId: number, view: DataView, sender: ISender) {
        if (messageTypeId != heaterexperiment.RequestHeater.TYPE_ID) return;
        const req = heaterexperiment.RequestHeater.decode(view, 0);
        sender.send(heaterexperiment.ResponseHeater.encode({
            requestId: req.requestId,
            setpointTemperatureDegrees: randomInt(40, 60),
            actualTemperatureDegrees: randomInt(40, 60),
            heaterPowerPercent: randomInt(1, 20),
            fanSpeedPercent: 25,
        }));
    }
}
