import { IBoardInfo} from "./utils";
import * as esp from "./esp32"
import * as idf from "./espidf"
import * as P from "./paths";
import fs from "node:fs";
import path from "node:path";
export class ContextConfig {
  //generatedDirectory: NUR!!! hier darf generierter Code hingeschrieben werden; nichts an anderer Stelle
  //idfProjectDirectory: benötigt, weil hier im Build-Verzeichnis einige JSON-Dateien liegen, die man einlesen möchte
  //flatbufferSchemaDirs: Alle fbs-Dateien in diesen Verzeichnissen werden übersetzt
  constructor(public readonly generatedDirectory, public readonly idfProjectDirectory: string, public readonly boardsDirectory: string, public readonly defaultBoardName: string, public readonly defaultBoardVersion) { }
}
export class Context {

  public setFlashEncryptionKeyBurnedAndActivated(){
    this.b.flash_encryption_key_burned_and_activated=true;
    const boardInfoJsonPath = P.Paths.boardSpecificPath(this.c.boardsDirectory, this.b.mac, P.INFO_JSON_FILENAME);
    fs.writeFileSync(boardInfoJsonPath, JSON.stringify(this.b))
  }

  private constructor(public c: ContextConfig, public b: IBoardInfo, public i: idf.IIdfProjectInfo | null, public f: idf.IFlasherConfiguration | null) { }
  private static instance: Context | null;
  public static async get(config: ContextConfig, updateWithCurrentlyConnectedBoard: boolean = false): Promise<Context> {
    var mac: number = 0;
    const currentBoardInfoJsonPath = path.join(config.idfProjectDirectory, P.CURRENT_BOARD_SUBDIR, P.INFO_JSON_FILENAME)

    if (!updateWithCurrentlyConnectedBoard && Context.instance) {
      //wenn ich nix aktualisieren soll und der Context bereits erzeugt wurde -->ggf. "i" und "f" nachtragen und dann raus hier
      if (!Context.instance.i) {
        Context.instance.i = idf.GetProjectDescription(config.idfProjectDirectory);
      }
      if (!Context.instance.f) {
        Context.instance.f = idf.GetFlashArgs(config.idfProjectDirectory)
      }
      return Context.instance;
    }


    if (updateWithCurrentlyConnectedBoard) {
      var esp32 = await esp.GetESP32Object();
      if (!esp32) {
        throw new Error(`Updating mac from ESP32 was not successful.`);
      }
      console.log(`Found ${esp32.chipName} on ${esp32.comPort.path} with mac ${esp32.macAsHexString} (decimal: ${esp32.macAsNumber}) and encryption key '${esp32.hasEncryptionKey ? "already written" : "not written"}'`)
      mac = esp32.macAsNumber;
    } else {
      if (fs.existsSync(currentBoardInfoJsonPath)) {
        mac = (JSON.parse(fs.readFileSync(currentBoardInfoJsonPath).toString()) as IBoardInfo).mac;
      }
      else {
        console.warn(`There is no info.json in path ${currentBoardInfoJsonPath}. Try to get mac from ESP32 directly`);
        var esp32 = await esp.GetESP32Object();
        if (!esp32) {
          throw new Error(`There was no info.json in path ${currentBoardInfoJsonPath}. Try to get mac from ESP32 directly was not successful.`);
        }
        console.log(`Found ${esp32.chipName} on ${esp32.comPort.path} with mac ${esp32.macAsHexString} (decimal: ${esp32.macAsNumber}) and encryption key '${esp32.hasEncryptionKey ? "already written" : "not written"}'`)
        mac = esp32.macAsNumber;
      }
    }
    if (!mac)
      throw new Error("Invalid mac address");

    var boardPath = P.Paths.boardSpecificPath(config.boardsDirectory, mac);
    fs.mkdirSync(boardPath, { recursive: true });

    const boardInfoJsonPath = P.Paths.boardSpecificPath(config.boardsDirectory, mac, P.INFO_JSON_FILENAME);
    var boardInfo: IBoardInfo;
    if (!fs.existsSync(boardInfoJsonPath)) {
      console.info(`There was no info.json in path ${boardInfoJsonPath}. Create it with default settings`);
      boardInfo = {
        board_name: config.defaultBoardName,
        board_version: config.defaultBoardVersion,
        board_settings: {},
        first_connected_dt: Date.now(),
        last_connected_dt: Date.now(),
        mac: mac,
        flash_encryption_key_burned_and_activated:false,
      }
      fs.writeFileSync(boardInfoJsonPath, JSON.stringify(boardInfo))

    } else {
      boardInfo = JSON.parse(fs.readFileSync(boardInfoJsonPath).toString()) as IBoardInfo
      if (updateWithCurrentlyConnectedBoard) {
        boardInfo.last_connected_dt = Date.now();
        fs.writeFileSync(boardInfoJsonPath, JSON.stringify(boardInfo))
      }
    }
    //Ich habe jetzt das zentrale Verzeichnis und eine Board-Info-Datei, aber keinen Context. Baue den jetzt neu auf
    const i = idf.GetProjectDescription(config.idfProjectDirectory);
    const f = idf.GetFlashArgs(config.idfProjectDirectory)
    Context.instance = new Context(config, boardInfo, i, f);
    return Context.instance!;
  }
}