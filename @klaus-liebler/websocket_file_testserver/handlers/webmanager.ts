import * as flatbuffers from "flatbuffers"
import { wifimanager } from "@klaus-liebler/flatbuffer-object-definitions"

import { ISender, NamespaceAndHandler } from "..";

const AP_GOOD = "Connect to AP -50dB Auth=2";
const AP_BAD = "Connect to AP -100dB Auth=2";

export class WebmanagerHandler extends NamespaceAndHandler {
    constructor() {
        super(wifimanager.Namespace.Value)
    }
    public Handle(buffer: flatbuffers.ByteBuffer, sender: ISender) {
        var rw = wifimanager.RequestWrapper.getRootAsRequestWrapper(buffer)
        switch (rw.requestType()) {
            case wifimanager.Requests.RequestWifiConnect: {
                const rwc = <wifimanager.RequestWifiConnect>rw.request(new wifimanager.RequestWifiConnect());
                let b = new flatbuffers.Builder(1024);
                if (rwc.ssid() == AP_GOOD) {
                    let r = wifimanager.ResponseWifiConnect.createResponseWifiConnect(b, true, b.createString(AP_GOOD), 0xFF101001, 0x10101002, 0xFF101003, -62);
                    b.finish(wifimanager.ResponseWrapper.createResponseWrapper(b, wifimanager.Responses.ResponseWifiConnect, r));
                } else {
                    let r = wifimanager.ResponseWifiConnect.createResponseWifiConnect(b, false, b.createString(AP_BAD), 0, 0, 0, -62);
                    b.finish(wifimanager.ResponseWrapper.createResponseWrapper(b, wifimanager.Responses.ResponseWifiConnect, r));
                }
                sender.send(wifimanager.Namespace.Value, b);
            }
                break;
            case wifimanager.Requests.RequestWifiDisconnect: {
                let b = new flatbuffers.Builder(1024);
                b.finish(wifimanager.ResponseWrapper.createResponseWrapper(b, wifimanager.Responses.ResponseWifiDisconnect, wifimanager.ResponseWifiDisconnect.createResponseWifiDisconnect(b)));
                sender.send(wifimanager.Namespace.Value, b);
            }
                break;
            case wifimanager.Requests.RequestNetworkInformation: {
                let b = new flatbuffers.Builder(1024);

                let accesspointsOffset = wifimanager.ResponseNetworkInformation.createAccesspointsVector(b, [
                    wifimanager.AccessPoint.createAccessPoint(b, b.createString(AP_BAD), 11, -66, 2),
                    wifimanager.AccessPoint.createAccessPoint(b, b.createString(AP_GOOD), 11, -50, 2),
                    wifimanager.AccessPoint.createAccessPoint(b, b.createString("AP -76dB Auth=0"), 11, -76, 0),
                    wifimanager.AccessPoint.createAccessPoint(b, b.createString("AP -74dB Auth=0"), 11, -74, 0),
                    wifimanager.AccessPoint.createAccessPoint(b, b.createString("AP -66dB Auth=0"), 11, -66, 0),
                    wifimanager.AccessPoint.createAccessPoint(b, b.createString("AP -59dB Auth=0"), 11, -50, 0)
                ]);
                let r = wifimanager.ResponseNetworkInformation.createResponseNetworkInformation(b,
                    b.createString("MyHostnameKL"),
                    b.createString("MySsidApKL"), b.createString("Password"), 32, true, b.createString("ssidSta"), 32, 43, 23, 23, accesspointsOffset);
                b.finish(wifimanager.ResponseWrapper.createResponseWrapper(b, wifimanager.Responses.ResponseNetworkInformation, r));
                sender.send(wifimanager.Namespace.Value, b);
            }
                break
        }
    }
}