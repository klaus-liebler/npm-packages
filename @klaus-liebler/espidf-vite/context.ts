import { IBoardInfo, X02 } from "./utils";
import * as esp from "./esp32"
import * as idf from "./espidf"
import * as P from "./paths";
import fs from "node:fs";
import path from "node:path";
export class ContextConfig{
  constructor(public readonly idfProjectDirectory:string, public readonly idfComponentWebmanangerDirectory:string, public readonly boardsDirectory: string, public readonly defaultBoardName: string, public readonly defaultBoardVersion){}
}
export class Context{
  
  private constructor(public c:ContextConfig, public b: IBoardInfo, public i: idf.IIdfProjectInfo|null, public f:idf.IFlasherConfiguration|null){}
  private static instance:Context|null;
  public static async get(config:ContextConfig, updateWithCurrentlyConnectedBoard:boolean=false):Promise<Context>{
    var b:IBoardInfo|null=null;
    const jsonInfo=path.join(config.idfProjectDirectory, "current_board", "info.json")
    if(!updateWithCurrentlyConnectedBoard && fs.existsSync(jsonInfo)){
       b=JSON.parse(fs.readFileSync(jsonInfo).toString()) as IBoardInfo;
    }
    if(updateWithCurrentlyConnectedBoard || !b){
      
      var esp32 = await esp.GetESP32Object();
      if (!esp32) {
        throw new Error("No connected board found");
      }
      console.log(`Found ${esp32.chipName} on ${esp32.comPort.path} with mac ${esp32.macAsHexString} (decimal: ${esp32.macAsNumber}) and encryption key '${esp32.hasEncryptionKey?"already written":"not written"}'`)
      //await db.updateDatabase(esp32, config.boardDatabaseFile, config.defaultBoardTypeId);
      b={
        board_name:config.defaultBoardName,
        board_version:config.defaultBoardVersion,
        encryption_key_set:esp32.hasEncryptionKey,
        board_settings:{},
        board_type_settings:{},
        first_connected_dt:Date.now(),
        last_connected_com_port:esp32.comPort.path,
        last_connected_dt:Date.now(),
        mac:esp32.macAsNumber,
        mac_12char: X02(esp32.macAsNumber, 12),
        mac_6char:X02(esp32.macAsNumber, 12).slice(6),
        mcu_name:esp32.chipName
      }
      fs.writeFileSync(jsonInfo, JSON.stringify(b))
      fs.writeFileSync(P.Paths.boardSpecificPath(config.boardsDirectory, b, "info.json"), JSON.stringify(b))
      
    }
    if(!Context.instance){
      const i = idf.GetProjectDescription(config.idfProjectDirectory);
      const f = idf.GetFlashArgs(config.idfProjectDirectory)
      Context.instance=new Context(config, b, i, f);
    }else{
      if(!Context.instance.i){
        Context.instance.i=idf.GetProjectDescription(config.idfProjectDirectory);
      }
      if(!Context.instance.f){
        Context.instance.f = idf.GetFlashArgs(config.idfProjectDirectory)
      }
    }
    //sanity check
    const p = new P.Paths(Context.instance);
    if(Context.instance.b.encryption_key_set && !p.existsBoardSpecificPath(P.FLASH_KEY_SUBDIR, P.FLASH_KEY_FILENAME)) {
      throw new Error("Inconsistency between database and file system: encryption key set in database but there is no flash key file on file system ");
    }else if(!Context.instance.b.encryption_key_set && p.existsBoardSpecificPath(P.FLASH_KEY_SUBDIR, P.FLASH_KEY_FILENAME)){
      throw new Error("Inconsistency between database and file system: encryption key not set in database but there is a key file on file system ");
    }
    return Context.instance!;
  }
}