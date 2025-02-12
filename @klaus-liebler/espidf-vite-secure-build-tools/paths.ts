
import path from "node:path";
import fs from "node:fs";
import { Context } from "./context";
import { mac_12char } from "./utils";



//Dies hier sind ausschließlich relative Pfade bezogen auf die in gulpfile_config.ts definierten Pfade
export const SOUNDS_DE_SUBDIR = path.join("sounds","de")
export const CURRENT_BOARD_SUBDIR = "current_board"
export const FLASH_KEY_SUBDIR ="flash_encryption"
export const FLASH_KEY_FILENAME= "key.bin"
export const BOARD_INFO_JSON_FILENAME = "board_info.json"
export const NVS_PARTITION_BIN_FILENAME ="nvs_partition.bin"
export const NVS_PARTITION_ENC_BIN_FILENAME ="nvs_partition-enc.bin"
export const NVS_CSV_FILENAME ="nvs.csv"
export const NVS_CPP_HEADER_FILENAME ="nvs_accessor.hh.inc"

export const CERTIFICATES_SUBDIR =  "certificates"
export const ESP32_CERT_PEM_CRT_FILE = "esp32.pem.crt"
export const ESP32_CERT_PEM_PRVTKEY_FILE = "esp32.pem.key"
export const ESP32_CERT_PEM_PUBKEY_FILE = "esp32.pem.pubkey"
export const ROOT_CA_PEM_CRT_FILE = "rootCA.pem.crt";
export const ROOT_CA_PEM_PRVTKEY_FILE = "rootCA.pem.key";
export const TESTSERVER_CERT_PEM_CRT_FILE = "testserver.pem.crt";
export const TESTSERVER_CERT_PEM_PRVTKEY_FILE = "testserver.pem.key";
export const PUBLICSERVER_CERT_PEM_CRT_FILE = "publicserver.pem.crt";
export const PUBLICSERVER_CERT_PEM_PRVTKEY_FILE = "publicserver.pem.key";
export const CLIENT_CERT_PEM_CRT_FILE = "client.pem.crt";
export const CLIENT_CERT_PEM_PRVTKEY_FILE = "client.pem.key";

export class Paths{
    constructor(private readonly c:Context){}
    //Current Project
    get P_BUILD() {return path.join(this.c.c.idfProjectDirectory, "build");}
    get P_SOUNDS() {return path.join(this.c.c.idfProjectDirectory, "sounds");}//Project specific sound vald for all boards
    get P_FLATBUFFERS() {return path.join(this.c.c.idfProjectDirectory, "flatbuffers");}//Project specific flatbuffer sources vald for all boards
    get P_FLATBUFFERS_TEMPLATES() {return path.join(this.c.c.idfProjectDirectory, "flatbuffers_templates");}//Project specific flatbuffer templates
    get P_WEB() {return path.join(this.c.c.idfProjectDirectory, "web");}
    get P_SOUNDS_DE() {return path.join(this.P_SOUNDS, "de");}//Common german voice sounds
    get P_USERSETTINGS_PATH(){return path.join(this.c.c.idfProjectDirectory, "usersettings", "usersettings.ts");}

    //im generated-Verzeichnis liegen alle Dateien, die bei jedem build neu generiert werden
    get GENERATED_CURRENT_BOARD(){return path.join(this.c.c.generatedDirectory, CURRENT_BOARD_SUBDIR);}//Board Specific files copied from BOARDS for current board  
    //es kann beim current_board kein Unterverzeichnis mit der individuellen Board-MAC-Adresse geben, weil dann der Pfad aller Dateien dynamisch wäre
    //Unterschied zu BOARDS:
    //- sie sind nicht immer gleich (Zertifikate, Schlüssel dürfen nicht immer neu generiert werden, sondern einmalig und bleiben dann gleich -->deshalb im BOARDS-Verzeichnis)
    //- Sie werden auch nicht von einem externen Dienst (z.b. Google TTS) geholt
    
    get GENERATED_BOARD_SPECIFIC_CPP() {return path.join(this.c.c.generatedDirectory, "board_specific_cpp");}
    get GENERATED_NVS() {return path.join(this.c.c.generatedDirectory, "nvs");}
    get GENERATED_NVS_TS() {return path.join(this.c.c.generatedDirectory, "nvs_ts");}
    get GENERATED_FLATBUFFERS_CPP() {return path.join(this.c.c.generatedDirectory, "flatbuffers_cpp");}
    get GENERATED_FLATBUFFERS_TS() {return path.join(this.c.c.generatedDirectory, "flatbuffers_ts");}
    
    get GENERATED_WEB() {return path.join(this.c.c.generatedDirectory, "web");}
        
    get GENERATED_FLATBUFFERS_FBS() {return path.join(this.c.c.generatedDirectory, "flatbuffers_fbs");}

    public boardSpecificPath(subdir?:string, filename?:string){
      return Paths.boardSpecificPath(this.c.c.boardsDirectory, this.c.b.mac, subdir, filename)
    }

    public static boardSpecificPath(BOARDS:string, mac:number, subdir?:string, filename?:string){
      if(!subdir)
        return path.join(BOARDS, mac+"_"+mac_12char(mac));
      else if(!filename)
        return path.join(BOARDS, mac+"_"+mac_12char(mac), subdir);
      else
        return path.join(BOARDS, mac+"_"+mac_12char(mac), subdir, filename);
    }

    
    public existsBoardSpecificPath(subdir:string, filename?:string){
      return fs.existsSync(this.boardSpecificPath(subdir, filename));
    }
    
    
    
    public createBoardSpecificPathLazy(subdir:string) {
      var directory= this.boardSpecificPath(subdir);
      fs.mkdirSync(directory, { recursive: true });
    }
    
    public writeBoardSpecificFileCreateDirLazy(subdir:string, filename:string, data: string | NodeJS.ArrayBufferView, callback?: fs.NoParamCallback) {
      this.createBoardSpecificPathLazy(subdir)
      if (callback) {
        fs.writeFile(this.boardSpecificPath(subdir, filename), data, callback);
      } else {
        fs.writeFileSync(this.boardSpecificPath(subdir, filename), data);
      }
    }
}