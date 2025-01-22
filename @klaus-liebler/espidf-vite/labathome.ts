import { CopyBoardSpecificFiles } from "./utils";
import path from "node:path";
import * as P from "./paths";


import { Context } from "./context";

export function prepare_labathome_files(c:Context) {
  const p=new P.Paths(c);
  CopyBoardSpecificFiles(p.GENERATED_BOARD_SPECIFIC, [path.join(c.c.idfProjectDirectory, "main", "hal")], [c.b.board_version.toString().slice(0,2)]);
}

