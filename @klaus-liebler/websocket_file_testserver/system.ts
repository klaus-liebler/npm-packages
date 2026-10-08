import { systeminfo } from "@generated/wsprotocol_ts/ws-protocol";
import { ISender, NamespaceAndHandler } from "./utils";

const MAC: systeminfo.Mac6 = { v: [1, 2, 3, 4, 5, 6] };

function partition(label: string, type: number, subtype: number, size: number) {
    return {
        classId: systeminfo.PartitionInfo.CLASS_ID, label, type, subtype, size, otaState: 1, running: true,
        appName: "AppName", appVersion: "AppVersion", appDate: "AppDate", appTime: "AppTime"
    } as const;
}

export class SystemHandler extends NamespaceAndHandler {
    constructor() {
        super(systeminfo.NAMESPACE_ID)
    }
    public Handle(messageTypeId: number, view: DataView, sender: ISender) {
        switch (messageTypeId) {
            case systeminfo.RequestSystemData.TYPE_ID: {
                const req = systeminfo.RequestSystemData.decode(view, 0);
                sender.send(systeminfo.ResponseSystemData.encode({
                    requestId: req.requestId,
                    secondsEpoch: Math.floor(Date.now() / 1000),
                    secondsUptime: 10,
                    freeHeap: 1203,
                    macAddressWifiSta: MAC,
                    macAddressWifiSoftap: MAC,
                    macAddressBt: MAC,
                    macAddressEth: MAC,
                    macAddressIeee802154: MAC,
                    chipModel: 2,
                    chipFeatures: 255,
                    chipRevision: 3,
                    chipCores: 2,
                    chipTemperature: 23.4,
                    partitions: [partition("Label0", 0, 0x10, 3072), partition("Label1", 1, 0x01, 16384)],
                }));
                break;
            }
            case systeminfo.RequestRestart.TYPE_ID:
                console.info("SystemHandler: RequestRestart received (ignored by testserver)");
                break;
        }
    }
}
