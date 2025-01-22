import {IBoardInfo, X02 } from "./utils";
import { ESP32Type } from "./esp32";
import  {DatabaseSync} from 'node:sqlite';

export function getMostRecentlyConnectedBoardInfo(databaseFile:string): IBoardInfo  {
  const db = new DatabaseSync(databaseFile);
  const select_board = db.prepare('select b.mac, b.encryption_key_set, m.name as mcu_name, bt.name as board_name, bt.version as board_version, b.first_connected_dt, b.last_connected_dt, b.last_connected_com_port, b.settings as board_settings, bt.settings as board_type_settings from boards as b inner join board_types as bt on bt.id=b.board_type_id inner join mcu_types as m ON m.id=bt.mcu_id ORDER BY last_connected_dt DESC LIMIT 1');
  var bi = select_board.get() as IBoardInfo;
  if (!bi) {
    throw new Error("No board found in database");
  }
  bi.board_settings = JSON.parse(bi.board_settings);
  bi.board_type_settings = JSON.parse(bi.board_type_settings);
  bi.mac_12char = X02(bi.mac, 12);
  bi.mac_6char = bi.mac_12char.slice(6);
  db.close();
  return bi
}

export async function updateDatabase(esp32: ESP32Type, databaseFile:string, defaultBoardTypeId:number) {
 
  const db = new DatabaseSync(databaseFile);
  const select_board = db.prepare('SELECT * from boards where mac = (?)');
  var board = select_board.get(esp32.macAsNumber);
  var now = Math.floor(Date.now() / 1000);
  if (!board) {
    const getMcuType = db.prepare('SELECT * from mcu_types where name = (?)');
    var mcuType = getMcuType.get(esp32.chipName)
    if (!mcuType) {
      throw new Error(`Database does not know ${esp32.chipName}`);
    }
    const insert_board = db.prepare('INSERT INTO boards VALUES(?,?,?,?,?,?,?,?,?)');
    insert_board.run(esp32.macAsNumber, mcuType["id"], defaultBoardTypeId, now, now, esp32.comPort.path, null, null, esp32.hasEncryptionKey?1:0);
  } else {
    const update_board = db.prepare('UPDATE boards set last_connected_dt = ?, last_connected_com_port= ?, encryption_key_set=? where mac = ? ');
    update_board.run(now, esp32.comPort.path, esp32.hasEncryptionKey?1:0, esp32.macAsNumber);
  }
  db.close();
}