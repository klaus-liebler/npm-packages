import { mac_6char, writeFileCreateDirLazy } from "./utils";
import path from "node:path";
import fs from "node:fs";
import * as P from "./paths";
import { Context } from "./context";
import { IPackageJson } from "./package_json";

const SENSACT_JSON_FILENAME="sensact.json"

export class Sensact{
  private pa:P.Paths
  constructor(private readonly c:Context, private readonly sensactComponentGeneratedDirectory:string){
    this.pa = new P.Paths(c);
  }

  private createEmptyDummyFiles(){
    fs.cpSync(path.join("templates", "sensact", "applicationIds.fbs.inc.empty"), path.join(this.pa.GENERATED_FLATBUFFERS_FBS, "applicationIds.fbs.inc"));
    fs.cpSync(path.join("templates", "sensact", "commandTypes.fbs.inc.empty"), path.join(this.pa.GENERATED_FLATBUFFERS_FBS, "commandTypes.fbs.inc"));
  }

  public prepare_sensact_files() {
    if(this.pa.existsBoardSpecificPath(SENSACT_JSON_FILENAME)){
      console.warn(`No sensact.json file found for mac 0x${mac_6char(this.c.b.mac) }. Prepare empty/dummy files for successful build.`);
      return this.createEmptyDummyFiles()
    }
    const sensact_json= JSON.parse(fs.readFileSync(this.pa.boardSpecificPath("sensact.json")).toString())
    
    const node_id=sensact_json?sensact_json["node_id"]:null;
    if (!node_id) {
      console.warn(`sensact.json file found for mac 0x${mac_6char(this.c.b.mac) } did not contain a node_id. Prepare empty/dummy files for successful build.`);
      return this.createEmptyDummyFiles()
    }
  
    //jede Node kennt alle ApplicationIds und CommandTypes - das ist also nicht board-spezifisch, deshalb aus dem "common"-Ordner kopieren
  
    fs.cpSync(path.join(this.sensactComponentGeneratedDirectory, "common", "applicationIds.fbs.inc"), path.join(this.pa.GENERATED_FLATBUFFERS_FBS, "applicationIds.fbs.inc"));
    fs.cpSync(path.join(this.sensactComponentGeneratedDirectory, "common", "commandTypes.fbs.inc"), path.join(this.pa.GENERATED_FLATBUFFERS_FBS, "commandTypes.fbs.inc"));
    
  
    //Damit die Applicationen ihre commands versenden können, werden hier passende Funktionen zum Versenden erzeugt
    var content = fs.readFileSync(path.join("templates", "sensact", "sendCommandImplementation.template.ts")).toString();
    if(node_id){
      content = content.replace("//TEMPLATE_HERE", fs.readFileSync(path.join(this.sensactComponentGeneratedDirectory, "common", "sendCommandImplementation.ts.inc")).toString());
    }
    writeFileCreateDirLazy(path.join(this.pa.GENERATED_SENSACT_TS, "sendCommandImplementation.ts"), content);
    
  
    //Alle im Sensact-System bekannten Apps erhalten mit diesem Code einen digitalen Zwilling in der Web-UI
    var content = fs.readFileSync(path.join("templates", "sensact", "sensactapps.template.ts")).toString();
    if(node_id){
      content = content.replace("//TEMPLATE_HERE", fs.readFileSync(path.join(this.sensactComponentGeneratedDirectory, "common", "sensactapps.ts.inc")).toString());
    }
    writeFileCreateDirLazy(path.join(this.pa.GENERATED_SENSACT_TS, "sensactapps.ts"), content);


    writeFileCreateDirLazy(path.join(this.pa.GENERATED_NVS_TS, "index.ts"), `export * from "./sendCommandImplementation"; export * from "./sensactapps"`);
    const pj:IPackageJson={
        name:"@generated/sensact",
        version:"0.0.1",
        description:"Generated during Build",
        main: "index.ts",
        author:"Generated",
        license:"No License",
        dependencies:{
          "a":"b"
        }
      }
    writeFileCreateDirLazy(path.join(this.pa.GENERATED_SENSACT_TS, "package.json"), JSON.stringify(pj));
  }
}




/*
Wir brauchen noch:
- die richige HAL-Implementierung
- die richtige Busmaster-Konfiguration (also insbesondere welche I2C-PortExtender angeschlossen sind und wie die konfiguriert sind)
  -->Auslagern in eine Funktion, die einen Pointer auf std::vector<AbstractBusmaster*> zurückgibt
- die richtige host-Konfiguration, also welche Hosts laufen sollen
   --> Auslagern in eine Funktion, die einen Pointer auf std::vector<sensact::iHost*> zurückgibt
*/
