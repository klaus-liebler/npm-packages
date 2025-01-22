
import path from "node:path";
import fs from "node:fs";
import { Context } from "./context";
import { IBoardInfo } from "./utils";



//Dies hier sind ausschließlich relative Pfade bezogen auf die in gulpfile_config.ts definierten Pfade
export const SOUNDS_DE_SUBDIR = path.join("sounds","de")
export const WEB_SUBDIR = "web"
export const FLASH_KEY_SUBDIR ="flash_encryption"
export const FLASH_KEY_FILENAME= "key.bin"

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
    //top level directories in main project
    get WEB() {return path.join(this.c.c.idfProjectDirectory, "web");}
    get TESTSERVER(){return path.join(this.c.c.idfProjectDirectory, "testserver");}
    get BOARDS(){return this.c.c.boardsDirectory;}//Board Specific generated files, die einmalig  generiert werden
    get CURRENT_BOARD(){return path.join(this.c.c.idfProjectDirectory, "current_board");}//Board Specific files copied from BOARDS for current board  
    get BUILD() {return path.join(this.c.c.idfProjectDirectory, "build");}
    get SOUNDS() {return path.join(this.c.c.idfProjectDirectory, "sounds");}//Common sounds
    get SOUNDS_DE() {return path.join(this.SOUNDS, "de");}//Common german voice sounds
    //im generated-Verzeichnis liegen alle Dateien, die bei jedem build neu generiert werden
    //Unterschied zu BOARDS:
    //- sie sind nicht immer gleich (Zertifikate, Schlüssel dürfen nicht immer neu generiert werden, sondern einmalig und bleiben dann gleich -->deshalb im BOARDS-Verzeichnis)
    //- Sie werden auch nicht von einem externen Dienst (z.b. Google TTS) geholt
    get GENERATED(){return path.join(this.c.c.idfProjectDirectory, "generated");}
    get GENERATED_SENSACT_TS() {return path.join(this.GENERATED, "sensact_ts");}
    get GENERATED_BOARD_SPECIFIC() {return path.join(this.GENERATED, "board_specific_cpp");}
    get GENERATED_USERSETTINGS() {return path.join(this.GENERATED, "usersettings");}
    
    get WM_GENERATED(){return path.join(this.c.c.idfComponentWebmanangerDirectory, "generated");}
    get WM_GENERATED_WM_SENSACT_FBS() {return path.join(this.WM_GENERATED, "sensact_fbs");}
    get WM_GENERATED_FLATBUFFERS_CPP() {return path.join(this.WM_GENERATED, "flatbuffers_cpp");}
    
    //intermediate and distribution


    get WEB_SRC_GENERATED() {return path.join(this.WEB, "generated")}
    get TESTSERVER_GENERATED() {return path.join(this.TESTSERVER, "generated")}
    get DEST_FLATBUFFERS_TYPESCRIPT_WEBUI() {return path.join(this.WEB_SRC_GENERATED, "flatbuffers");}
    get DEST_SENSACT_TYPESCRIPT_WEBUI() {return path.join(this.WEB_SRC_GENERATED, "sensact");}
    get DEST_USERSETTINGS_PATH() {return path.join(this.WEB_SRC_GENERATED, "usersettings", "usersettings.ts");}

    //Template
    get TEMPLATE_SEND_COMMAND_IMPLEMENTATION() {return path.join(this.WEB, "templates", "sensact",  "sendCommandImplementation.template.ts");}
    get TEMPLATE_SENSACT_APPS() {return path.join(this.WEB, "templates", "sensact",  "sensactapps.template.ts");}


    get DEST_FLATBUFFERS_TYPESCRIPT_SERVER() {return path.join(this.TESTSERVER_GENERATED, "flatbuffers");}
    get DEST_SENSACT_TYPESCRIPT_SERVER() {return path.join(this.TESTSERVER_GENERATED, "sensact");}
        
        
    
    get USERSETTINGS_PATH(){return path.join(this.c.c.idfProjectDirectory, "usersettings", "go_here","go_here", "usersettings.ts");}
    
    
    get FLATBUFFERS_SCHEMA_PATH() {return path.join(this.c.c.idfComponentWebmanangerDirectory, "flatbuffers");}
    
    public boardSpecificPath(subdir?:string, filename?:string){
      return Paths.boardSpecificPath(this.BOARDS, this.c.b, subdir, filename)
    }

    public static boardSpecificPath(BOARDS:string, b:IBoardInfo, subdir?:string, filename?:string){
      if(!subdir)
        return path.join(BOARDS, b.mac+"_"+b.mac_12char);
      else if(!filename)
        return path.join(BOARDS, b.mac+"_"+b.mac_12char, subdir);
      else
        return path.join(BOARDS, b.mac+"_"+b.mac_12char, subdir, filename);
    }

    
    public existsBoardSpecificPath(subdir:string, filename:string){
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