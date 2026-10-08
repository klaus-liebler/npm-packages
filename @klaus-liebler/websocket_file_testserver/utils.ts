import http from "node:http"
import https from "node:https"
import * as fs from "node:fs"
import * as weso from "ws"
import * as path from "node:path"
import * as forge from "node-forge";
import { PeerCertificate, TLSSocket } from "node:tls"

// Wire-Format (BestBinaryBuffers, s. @generated/wsprotocol_ts): jeder Frame beginnt mit einem
// 4-Byte-Kopf namespaceId:u16 + messageTypeId:u16 (little endian), gefolgt von der Nutzlast.
// <namespace>.<Message>.encode() liefert bereits den kompletten Frame inkl. Kopf, decode(view, 0)
// erwartet ihn ebenso -- der Server haengt also nichts an und schneidet nichts ab.
//
// Die Handler in diesem Paket importieren "@generated/wsprotocol_ts/ws-protocol". Namespace-/Typ-IDs
// werden pro Projekt vergeben, deshalb muss das jeweilige Projekt seinen eigenen generierten Code
// liefern: den Testserver mit "node --preserve-symlinks --import tsx ..." starten, dann werden
// diese Importe (und "ws") aus den node_modules des Projekts aufgeloest.
export interface ISender{
    send(frame: Uint8Array):void;
 }

export abstract class NamespaceAndHandler{
    constructor(public readonly namespace:number){}
    protected sender?: ISender;
    // 'view' umfasst den kompletten Frame inkl. 4-Byte-Kopf -> direkt an <Message>.decode(view, 0) geben.
    public abstract Handle(messageTypeId: number, view: DataView, sender: ISender):void;
    public SetSender(sender: ISender){
        this.sender = sender;
    }
}

export const FRAME_HEADER_SIZE = 4;

const WEBSERVER_PORT = 3000;
const AUTHSERVER_PORT = 3001;
var websocket_server:weso.WebSocketServer;
var http_server: https.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
var current_ws: weso.WebSocket;
var handlers: Array<NamespaceAndHandler> = new Array<NamespaceAndHandler>();

class Sender implements ISender{
    public send(frame: Uint8Array){
        if(!current_ws || current_ws.readyState!=weso.WebSocket.OPEN){
            console.error("No websocket connection available to send data");
            return;
        }
        current_ws.send(frame);
    }
}

export function OnMessage(buffer: Buffer, ws: weso.WebSocket){
    if(buffer.length < FRAME_HEADER_SIZE){
        console.error(`Received frame with only ${buffer.length} bytes, ignoring it`);
        return;
    }
    const ns = buffer.readUInt16LE(0);
    const messageTypeId = buffer.readUInt16LE(2);
    console.log(`Received frame length ${buffer.byteLength} for namespace ${ns}, messageTypeId ${messageTypeId}`);
    current_ws = ws;
    handlers.forEach(h=>{h.SetSender(sender);});
    const h =handlers.find(h=>h.namespace==ns);
    if(!h){
        console.error(`No handler registered for namespace ${ns}`);
        return;
    }
    try{
        h.Handle(messageTypeId, new DataView(buffer.buffer, buffer.byteOffset, buffer.length), sender);
    }catch(e){
        console.error(`Handler for namespace ${ns} failed on messageTypeId ${messageTypeId}:`, e);
    }
}

export function GetWebSocketServer():weso.WebSocketServer{
    websocket_server = new weso.WebSocketServer({ noServer: true });
    websocket_server.on('connection', (ws: weso.WebSocket) => {
    console.info("Handle connection");
    ws.on('error', console.error);
    ws.on('message', (buffer: Buffer, isBinary: boolean) => {
        OnMessage(buffer, ws);
    });
    });
    return websocket_server;
}

const sender = new Sender();
export function StartServers(sslCertificatesRoot:string, handlers_:Array<NamespaceAndHandler>){
    handlers = handlers_;
    let hostCert = fs.readFileSync(path.join(sslCertificatesRoot, "testserver.pem.crt")).toString();
    let hostPrivateKey = fs.readFileSync(path.join(sslCertificatesRoot, "testserver.pem.key")).toString();
    let rootCaCert = fs.readFileSync(path.join(sslCertificatesRoot, "rootCA.pem.crt")).toString();

    websocket_server = new weso.WebSocketServer({ noServer: true });
    websocket_server.on('connection', (ws: weso.WebSocket) => {
        console.info("Handle connection");
        ws.on('error', console.error);
        ws.on('message', (buffer: Buffer, isBinary: boolean) => {
            OnMessage(buffer, ws);
        });
    });
    //http_server = http.createServer((req, res) => {
    http_server = https.createServer({key: hostPrivateKey, cert: hostCert}, (req, res) => {
        console.log(`Request received for '${req.url}'`);
        //var local_path = new URL(req.url).pathname;
    
        if (req.method == "POST" && req.url == "/login") {
            // Wie das Board: Der Vite-Dev-Proxy loggt sich vor dem Websocket-Aufbau per POST /login ein
            // und erwartet ein "session"-Cookie. Der Testserver prueft keine Zugangsdaten.
            req.resume();
            res.writeHead(200, { 'Set-Cookie': 'session=testserver; Path=/; Secure; HttpOnly', 'Content-Type': 'text/plain' });
            res.end("OK");
        }
        else if (req.method == "POST" && req.url!.startsWith("/files")) {
            const req_body_chunks: any[] = [];
            req.on("data", (chunk: any) => req_body_chunks.push(chunk));
            req.on("end", () => {
                var p = path.join("./", req.url!)
                fs.mkdirSync(path.dirname(p.toString()), { recursive: true });
                fs.writeFileSync(p, Buffer.concat(req_body_chunks), {});
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write('<p>OK</p>');
                res.end();
                //process(res, req.url!, Buffer.concat(req_body_chunks));
            });
        }
        else if (req.method == "GET" && req.url!.startsWith("/files")) {
            if (req.url!.endsWith("/")) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                var ret = { files: new Array<string>(), dirs: new Array<string>() }
                for (const f of fs.readdirSync(path.join("./", req.url!.slice(0, -1)), { withFileTypes: true })) {
                    if (f.isFile()) ret.files.push(f.name);
                    if (f.isDirectory()) ret.dirs.push(f.name);
                }
                res.write(JSON.stringify(ret));
                res.end();
            } else {
                try {
                    var p = path.join("./", req.url!)
                    var b = fs.readFileSync(p);
                    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
                    res.write(b);
                    res.end();
                }
                catch (error) {
                    res.writeHead(500);
                    res.write("Resource not available");
                    res.end();
                }
            }
        } else {
            console.log(`Request unknwon '${req.url}'`);
            res.writeHead(404);
            res.end("Not found");
        }
    });
    
    http_server.on('upgrade', (req, sock, head) => {
        if (req.url == '/webmanager_ws') {
            console.info("Handle upgrade to websocket");
            websocket_server.handleUpgrade(req, sock, head, ws => websocket_server.emit('connection', ws, req));
        } else {
            sock.destroy();
        }
    });
    
    http_server.on("error", (e) => {
        console.error(e);
    })
    
    http_server.listen(WEBSERVER_PORT, () => {
        console.log(`Webserver with Websockets is running on port ${WEBSERVER_PORT}`);
    });


    //let clientCert = fs.readFileSync(path.join(sslCertificatesRoot, "client.pem.crt")).toString();
    //let clientPrivateKey = fs.readFileSync(path.join(sslCertificatesRoot, "client.pem.key")).toString();
    //let rootCACert = fs.readFileSync(path.join(sslCertificatesRoot, "rootCA.pem.crt")).toString();
    let authserver = https.createServer({ key: hostPrivateKey, cert: hostCert, requestCert:true, rejectUnauthorized:false, ca:[rootCaCert] }, (req, res) => {
        console.log(`Request received for '${req.url}'`);
        const peerCert = ((req.socket) as TLSSocket).getPeerCertificate();
        //var local_path = new URL(req.url).pathname;

        if (req.method == "GET" && req.url!.startsWith("/labathome")) {
            const i = peerCert.issuer.CN;
            if(peerCert.issuer.CN!="AAA Klaus Liebler personal Root CA"){
                return res.writeHead(401).end(`Certificate is not signed from right rootCA, but from ${i}`);
            }
            if (!peerCert.subject) {
                return res.writeHead(401).end(`Sorry, but you need to provide a client certificate to continue.`);
            }
            const cn = String(peerCert.subject.CN);
            if(!(cn.startsWith("mosquitto") ||cn.startsWith("labathome"))){
                return res.writeHead(403).end(`Sorry ${peerCert.subject.CN}, certificates from ${peerCert.issuer.CN} are not welcome here.`);
            }
            
            res.writeHead(200).end(`Welcome ${cn} with certificate from ${peerCert.issuer.CN}. Access granted is ${extractCustomExtension(peerCert)}`);

        } else {
            console.log(`Request unknwon '${req.url}'`);
            res.writeHead(404);
            res.end("Not found");
        }
    });


    authserver.on("error", (e) => {
        console.error(e);
    })

    authserver.listen(AUTHSERVER_PORT, () => {
        console.log(`AuthServer is running on port ${AUTHSERVER_PORT}`);
        
    });
}






function extractCustomExtension(peerCert:PeerCertificate) {
    const cert = forge.pki.certificateFromPem('-----BEGIN CERTIFICATE-----\n' + peerCert.raw.toString('base64') + '\n-----END CERTIFICATE-----');
    const ext = (cert.extensions as Array<any>).find(v=>v.id== '1.3.6.1.4.1.54392.5.2757');
    return ext?.value;
  };


