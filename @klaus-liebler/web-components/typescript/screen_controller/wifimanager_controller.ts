
import { ScreenController } from "./screen_controller";
import { wifimanager } from "@generated/wsprotocol_ts/ws-protocol";
//import icon_lock from '../../assets/icon-lock.svg'
import { TemplateResult, html, render } from "lit-html";
import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { unsafeSVG } from "lit-html/directives/unsafe-svg.js";
import { OkCancelDialog, OkDialog, PasswordDialog, PermanentDialog } from "../dialog_controller";
import { ip4_2_string, Severity } from "@klaus-liebler/commons";



const icon_lock = '<svg width="24" height="24" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill: black;" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"></path></svg>'
export class WifimanagerController extends ScreenController {



    private isConnectedSta = false;
    private ssidSta = "";
    private ipSta = "";
    private netmaskSta = "";
    private gatewaySta = "";
    private rssiSta = -1000;
    private hostname: string = "";
    private ssidAp: string = "";
    private passwordAp: string = "";
    private ipAp: string = "";

    private rssi2color(rssi: number, limit: number) {
        //var rssi=this.r.accesspoints(i)?.rssi()??-1000;
        return rssi >= limit ? 'black' : 'lightgrey';
    }

    private networkTable: Ref<HTMLTableSectionElement> = createRef();
    private networkTableTemplate = () => html`
 <tr>
    <td>Hostname</td>
    <td>${this.hostname}</td>
</tr>
<tr>
    <td>Access Point SSID</td>
    <td>${this.ssidAp}</td>
</tr>
<tr>
    <td>Access Point Password</td>
    <td>${this.passwordAp}</td>
</tr>
<tr>
    <td>Access Point IP</td>
    <td>${this.ipAp}</td>
</tr>
    `
    private wifiTable: Ref<HTMLTableSectionElement> = createRef();
    private wifiTableTemplate = () => html`
<tr>
    <td>Connection State</td>
    <td style="background-color:${this.isConnectedSta ? 'green' : 'red'}">${this.isConnectedSta ? 'Connected' : 'Not connected'}</td>
</tr>
<tr>
    <td>Current SSID</td>
    <td>${this.ssidSta}</td>
</tr>
<tr>
    <td>IP</td>
    <td>${this.ipSta}</td>
</tr>
<tr>
    <td>Netmask</td>
    <td>${this.netmaskSta}</td>
</tr>
<tr>
    <td>Gateway</td>
    <td>${this.gatewaySta}</td>
</tr>
<tr>
    <td>Signal Strength</td>
    <td>${this.rssiSta}dB</td>
</tr>
    `
    private apTable: Ref<HTMLTableSectionElement> = createRef();
    private apTableTemplate = (lock: boolean, rssi: number, ssid: string) => html`
    <tr>
        <td><svg width="24" height="24" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path style="fill:${this.rssi2color(rssi, -67)}" d="M1,9L3,11C7.97,6.03 16.03,6.03 21,11L23,9C16.93,2.93 7.08,2.93 1,9Z" />
            <path style="fill:${this.rssi2color(rssi, -70)}" d="M5,13L7,15C9.76,12.24 14.24,12.24 17,15L19,13C15.14,9.14 8.87,9.14 5,13Z" />
            <path style="fill:${this.rssi2color(rssi, -75)}" d="M9,17L12,20L15,17C13.35,15.34 10.66,15.34 9,17Z" />
            </svg></td>
        <td>${lock ? unsafeSVG(icon_lock) : ""}</td>
        <td>${ssid} [${rssi}dB]</td>
        <td><input type="button" value="Connect" @click=${() => this.onConnectToWifi(ssid)}/></td>
    </tr>
    `
    public Template = () => html`

<h1>Current Wifi-Connection</h1>
<div class="buttons">
    <input type="button" value="Disconnect & Delete" @click=${() => { this.onBtnWifiDisconnect() }} />
    <input type="button" value="Show More Details" />
</div>
<table>
    <tbody ${ref(this.wifiTable)}></tbody>
</table>

<h1>Common Network Configuration</h1>
<table>
    <tbody ${ref(this.networkTable)}></tbody>
</table>

<h1>Select New Connection</h1>
<div class="buttons">
    <input type="button" value="Update Access Point List" @click=${() => this.sendRequestWifiAccesspoints(false)} />
</div>
<table>
    <thead>
        <tr>
            <th style="width: 34px;">RSSI</th>
            <th style="width: 34px;">Security</th>
            <th>SSID</th>
            <th>Connect</th>
        </tr>

    </thead>
    <tbody ${ref(this.apTable)}></tbody>
</table>
    `



    public onConnectToWifi(ssid: string): void {
        if (!ssid) return;
        this.appManagement.ShowDialog(new PasswordDialog(`Enter password for '${ssid}'`, (ok: boolean, password: string) => {
            if (ok) this.sendRequestWifiConnect(ssid, password)
        }))
    }

    // requestId wird bewusst konstant 0 gesendet -- der Client haelt zu jedem Zeitpunkt hoechstens
    // eine Anfrage in Flight (s. lockingNamespaceId in AppController), braucht also kein eigenes
    // Multiplexing ueber requestId. Server-seitig wird die requestId trotzdem korrekt durchgereicht
    // (wichtig fuer die asynchron aus den Wifi-Events heraus verschickten ResponseWifiConnect-
    // Nachrichten, s. webmanager.hh).
    private sendRequestWifiAccesspoints(forceNewSearch: boolean) {
        const bytes = wifimanager.RequestNetworkInformation.encode({ requestId: 0, forceNewSearch });
        this.appManagement.SendFrame(wifimanager.NAMESPACE_ID, bytes, 30000);
    }

    private sendRequestWifiConnect(ssid: string, password: string) {
        console.log(`sendRequestWifiConnect for ${ssid} with password ${password}`);
        const bytes = wifimanager.RequestWifiConnect.encode({ requestId: 0, ssid, password });
        this.appManagement.SendFrame(wifimanager.NAMESPACE_ID, bytes, 30000);
    }

    private onBtnWifiDisconnect() {
        this.appManagement.ShowDialog(new OkCancelDialog(Severity.WARN, "Möchten Sie wirklich die bestehende Verbindung trennen und damit auch vom ESP32 löschen?", (ok) => { if (ok) this.sendRequestWifiDisconnect(); }))
    }

    private sendRequestWifiDisconnect() {
        const bytes = wifimanager.RequestWifiDisconnect.encode({ requestId: 0 });
        this.appManagement.SendFrame(wifimanager.NAMESPACE_ID, bytes, 30000);
    }

    OnCreate(): void {
        this.appManagement.RegisterNamespace(this, wifimanager.NAMESPACE_ID);
    }

    OnFirstStart(): void {
        this.sendRequestWifiAccesspoints(false);
    }
    OnRestart(): void {

    }
    OnPause(): void {

    }

    onResponseNetworkInformation(r: wifimanager.ResponseNetworkInformation.Payload) {
        console.log("onResponseNetworkInformation");
        this.hostname = r.hostname;
        this.ssidAp = r.ssidAp;
        this.passwordAp = r.passwordAp;
        this.ipAp = ip4_2_string(r.ipAp);
        this.isConnectedSta = r.isConnectedSta;
        this.ssidSta = r.ssidSta;
        this.ipSta = ip4_2_string(r.ipSta);
        this.netmaskSta = ip4_2_string(r.netmaskSta);
        this.gatewaySta = ip4_2_string(r.gatewaySta);
        this.rssiSta = r.rssiSta;
        let ssid2index = new Map<string, number>();

        for (let i = 0; i < r.accesspoints.length; i++) {
            const ssid = r.accesspoints[i].ssid;
            const auth = r.accesspoints[i].authMode;
            let key = ssid + "_" + auth;
            let ap_exist = ssid2index.get(key);
            if (ap_exist === undefined) {
                ssid2index.set(key, i);
            }
        }

        let access_points_list = [...ssid2index.values()];
        access_points_list.sort((a, b) => {
            //sort according to rssi
            var x = r.accesspoints[a].rssi;
            var y = r.accesspoints[b].rssi;
            return x < y ? 1 : x > y ? -1 : 0;
        });
        var templates: Array<TemplateResult<1>> = []
        for (let i of access_points_list) {
            templates.push(this.apTableTemplate(r.accesspoints[i].authMode != 0, r.accesspoints[i].rssi, r.accesspoints[i].ssid))
        }
        render(templates, this.apTable.value!);

        render(this.networkTableTemplate(), this.networkTable.value!)

        render(this.wifiTableTemplate(), this.wifiTable.value!)

    }

    onResponseWifiConnect(r: wifimanager.ResponseWifiConnect.Payload) {
        this.isConnectedSta = r.success;
        this.ssidSta = r.ssid;
        this.ipSta = ip4_2_string(r.ip);
        this.netmaskSta = ip4_2_string(r.netmask);
        this.gatewaySta = ip4_2_string(r.gateway);
        this.rssiSta = r.rssi;
        render(this.wifiTableTemplate(), this.wifiTable.value!)
        if (!r.success) {
            console.info("Connection attempt failed!");
            this.appManagement.ShowDialog(new OkDialog(Severity.ERROR, "Connection attempt failed! "));
        }else{
            console.info(`Got connection! to ${this.ssidSta} with ip ${this.ipSta} netmask ${this.netmaskSta} gateway ${this.gatewaySta}`);
            // Das Board trennt seinen eigenen Access Point kurz nach einer erfolgreichen
            // STA-Verbindung (s. webmanager.hh) -- die aktuelle, AP-basierte Websocket-Verbindung
            // wird dadurch gleich ohnehin ungueltig. Ein OK-Button waere irrefuehrend (es gibt
            // nichts mehr sinnvoll fortzusetzen, ein Klick fuehrt nur zu einem toten Spinner) --
            // deshalb PermanentDialog (nicht schliessbar) statt OkDialog, und die Websocket-
            // Verbindung wird sofort bewusst geschlossen (Code 1000, wird von
            // AppController.onclose stillschweigend ignoriert statt als Fehler behandelt).
            this.appManagement.ShowDialog(new PermanentDialog(Severity.SUCCESS, "Erfolg", `Verbindung zu "${r.ssid}" war erfolgreich. Bitte verbinden Sie sich jetzt mit dem WLAN-Netz "${r.ssid}" und rufen Sie dieses Geraet unter dem Hostnamen "${this.hostname}" auf.`));
            this.appManagement.CloseConnection();
        }
    }

    OnMessage(namespaceId: number, messageTypeId: number, view: DataView): void {
        if(namespaceId!=wifimanager.NAMESPACE_ID){
            console.error(`wifimanager controller namespace problem: ${namespaceId}!=${wifimanager.NAMESPACE_ID}`)
            return;
        }
        switch (messageTypeId) {
            case wifimanager.ResponseNetworkInformation.TYPE_ID:
                this.onResponseNetworkInformation(wifimanager.ResponseNetworkInformation.decode(view, 0));
                break;
            case wifimanager.ResponseWifiConnect.TYPE_ID:
                this.onResponseWifiConnect(wifimanager.ResponseWifiConnect.decode(view, 0));
                break;
            case wifimanager.ResponseWifiDisconnect.TYPE_ID:
                console.log("Manual disconnection was successful.");
                this.appManagement.ShowDialog(new OkDialog(Severity.INFO, "Manual disconnection was successful. "));
                break;
            default:
                console.error(`Unknown messageTypeId: ${messageTypeId}`)
        }
    }
}
