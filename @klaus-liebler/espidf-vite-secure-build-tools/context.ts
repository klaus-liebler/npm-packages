import { IBoardInfo, mac_6char } from "./utils";
import * as esp from "./esp32"
import * as idf from "./espidf"
import * as P from "./paths";
import fs from "node:fs";
import path from "node:path";
import { eEncryptionMode } from "@klaus-liebler/commons";

export class ContextConfig {
  constructor(public readonly generatedDirectory: string, public readonly idfProjectDirectory: string, public readonly boardsDirectory: string, public readonly defaultBoardName: string, public readonly defaultBoardVersion:number, public readonly defaultEncryptionMode:eEncryptionMode) { }
}

export class Context {

  public setFlashEncryptionKeyBurnedAndActivated() {
    this.b.flash_encryption_key_burned_and_activated = true;
    const boardInfoJsonPath = P.Paths.boardSpecificPath(this.c.boardsDirectory, this.b.mac, P.BOARD_INFO_JSON_FILENAME);
    fs.writeFileSync(boardInfoJsonPath, JSON.stringify(this.b))
  }

  public static async printInfo(config: ContextConfig) {

    var esp32 = await esp.GetESP32Object();
    if (!esp32) {
      throw new Error(`Updating mac from ESP32 was not successful.`);
    }

    var currentBoardInfoJsonPath = path.join(config.idfProjectDirectory, P.BOARD_INFO_JSON_FILENAME)
    var mac_in_json_file = 0;
    if (fs.existsSync(currentBoardInfoJsonPath)) {
      mac_in_json_file = (JSON.parse(fs.readFileSync(currentBoardInfoJsonPath).toString()) as IBoardInfo).mac;
    }
    console.log("              MAC: " + mac_6char(esp32?.macAsNumber ?? 0) + " (decimal: " + (esp32?.macAsNumber ?? 0) + ")");
    console.log("       ESP32 Chip: " + esp32.chipName);
    console.log("         COM Port: " + esp32.comPort.path);
    console.log(" Is current board: " + (mac_in_json_file==esp32.macAsNumber ? "yes" : "no"));  
    var isAKnownBoard = fs.existsSync(P.Paths.boardSpecificPath(config.boardsDirectory, esp32.macAsNumber))
    if(!isAKnownBoard){
      console.log("No more board info available, as this board is not known yet.");
      return;
    }
    const boardInfoJsonPath = P.Paths.boardSpecificPath(config.boardsDirectory, esp32.macAsNumber, P.BOARD_INFO_JSON_FILENAME);
    var b = JSON.parse(fs.readFileSync(boardInfoJsonPath).toString()) as IBoardInfo
    console.log("       Board Name: " + b.board_name);
    console.log("    Board Version: " + b.board_version);
    console.log("      Board Roles: " + (b.board_roles ? b.board_roles : "(none)"));
    console.log("   Board Settings: " + (b.board_settings ? JSON.stringify(b.board_settings) : "(none)"));
    console.log("  First connected: " + new Date(b.first_connected_dt).toLocaleString());
    console.log("   Last connected: " + new Date(b.last_connected_dt).toLocaleString());
    console.log("Encryption active: " + (b.flash_encryption_key_burned_and_activated ? "yes" : "no"));

  }

  public p: P.Paths;

  private constructor(public c: ContextConfig, public b: IBoardInfo, public i: idf.IIdfProjectInfo | null, public f: idf.IFlasherConfiguration | null) {
    this.p = new P.Paths(this);
  }

  private static instance: Context | null;

  public static async get(config: ContextConfig, updateWithCurrentlyConnectedBoard: boolean = false): Promise<Context> {
    var mac: number = 0;
    const currentBoardInfoJsonPath = path.join(config.idfProjectDirectory, P.BOARD_INFO_JSON_FILENAME)

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

    const boardInfoJsonPath = P.Paths.boardSpecificPath(config.boardsDirectory, mac, P.BOARD_INFO_JSON_FILENAME);
    var boardInfo: IBoardInfo;
    if (!fs.existsSync(boardInfoJsonPath)) {
      console.info(`There was no info.json in path ${boardInfoJsonPath}. Create it with default settings`);
      boardInfo = {
        board_name: config.defaultBoardName,
        board_version: config.defaultBoardVersion,
        board_roles: "",
        board_settings: {},
        first_connected_dt: Date.now(),
        last_connected_dt: Date.now(),
        mac: mac,
        flash_encryption_key_burned_and_activated: false,
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
    fs.cpSync(boardInfoJsonPath, currentBoardInfoJsonPath);
    return Context.instance!;
  }
}