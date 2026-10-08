import { wifimanager } from "@generated/wsprotocol_ts/ws-protocol";
import { ISender, NamespaceAndHandler } from "./utils";

const AP_GOOD = "Connect to AP -50dB Auth=2";
const AP_BAD = "Connect to AP -100dB Auth=2";

function ap(ssid: string, rssi: number, authMode: number) {
    return { classId: wifimanager.AccessPoint.CLASS_ID, ssid, primaryChannel: 11, rssi, authMode } as const;
}

export class WebmanagerHandler extends NamespaceAndHandler {
    constructor() {
        super(wifimanager.NAMESPACE_ID)
    }
    public Handle(messageTypeId: number, view: DataView, sender: ISender) {
        switch (messageTypeId) {
            case wifimanager.RequestWifiConnect.TYPE_ID: {
                const req = wifimanager.RequestWifiConnect.decode(view, 0);
                const good = req.ssid == AP_GOOD;
                sender.send(wifimanager.ResponseWifiConnect.encode({
                    requestId: req.requestId,
                    success: good,
                    ssid: good ? AP_GOOD : AP_BAD,
                    ip: good ? 0xFF101001 : 0,
                    netmask: good ? 0x10101002 : 0,
                    gateway: good ? 0xFF101003 : 0,
                    rssi: -62,
                }));
                break;
            }
            case wifimanager.RequestWifiDisconnect.TYPE_ID: {
                const req = wifimanager.RequestWifiDisconnect.decode(view, 0);
                sender.send(wifimanager.ResponseWifiDisconnect.encode({ requestId: req.requestId }));
                break;
            }
            case wifimanager.RequestNetworkInformation.TYPE_ID: {
                const req = wifimanager.RequestNetworkInformation.decode(view, 0);
                sender.send(wifimanager.ResponseNetworkInformation.encode({
                    requestId: req.requestId,
                    hostname: "MyHostnameKL",
                    ssidAp: "MySsidApKL",
                    passwordAp: "Password",
                    ipAp: 32,
                    isConnectedSta: true,
                    ssidSta: "ssidSta",
                    ipSta: 32,
                    netmaskSta: 43,
                    gatewaySta: 23,
                    rssiSta: 23,
                    accesspoints: [
                        ap(AP_BAD, -66, 2),
                        ap(AP_GOOD, -50, 2),
                        ap("AP -76dB Auth=0", -76, 0),
                        ap("AP -74dB Auth=0", -74, 0),
                        ap("AP -66dB Auth=0", -66, 0),
                        ap("AP -59dB Auth=0", -50, 0),
                    ],
                }));
                break;
            }
        }
    }
}
