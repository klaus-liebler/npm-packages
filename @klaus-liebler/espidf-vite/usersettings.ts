import path from "path";
import { EscapeToVariableName } from "../../usersettings/typescript/utils/usersettings_base";
import { StringBuilderImpl, writeFileCreateDirLazy } from "./utils";

import fs from "node:fs";
import * as idf from "./espidf";
import { Context } from "./context";
import * as P from "./paths";

function generate_partition_csv(p:P.Paths, theusersettings:any) {
  
  console.log(`User settings has ${theusersettings.length} groups`);
  var codeBuilder = new StringBuilderImpl("key,type,encoding,value");

  theusersettings.forEach((cg, i, a) => {
    codeBuilder.AppendLine(`${cg.Key},namespace,,`);
    cg.items.forEach((ci, j, cia) => {
      ci.RenderNvsPartitionGenerator(codeBuilder);
    });
  });
  writeFileCreateDirLazy(path.join(p.GENERATED_USERSETTINGS, "usersettings_partition.csv"), codeBuilder.Code);
}

function generate_cpp_accessor(p:P.Paths, theusersettings:any) {

  var codeBuilder = new StringBuilderImpl();
  theusersettings.forEach((cg, i, a) => {
    cg.items.forEach((ci, j, cia) => {
      codeBuilder.AppendLine(`constexpr const char ${EscapeToVariableName(cg.Key)}_${EscapeToVariableName(ci.Key)}_KEY[]="${ci.Key}";`)
    });
    cg.RenderCPPConfig(codeBuilder);
    cg.items.forEach((ci, j, cia) => {
      ci.RenderCPPConfig(codeBuilder, cg);
    });
    codeBuilder.AppendLine("}};");
  });
  codeBuilder.AppendLine(`constexpr std::array<const GroupCfg*, ${theusersettings.length}> groups = {`);
  theusersettings.forEach((cg, i, a) => {
    codeBuilder.AppendLine(`\t&${EscapeToVariableName(cg.Key)},`);
  });
  codeBuilder.AppendLine(`};`)
  codeBuilder.AppendLine(``);
  codeBuilder.AppendLine(`namespace settings{`);
  theusersettings.forEach((cg, i, a) => {
    cg.items.forEach((ci, j, cia) => {
      ci.RenderCPPAccessor(codeBuilder, cg);
    });

  });
  codeBuilder.AppendLine(`}`)
  writeFileCreateDirLazy(path.join(p.GENERATED_USERSETTINGS, "usersettings_config.hh.inc"), codeBuilder.Code);
}


export async function generate_usersettings(c:Context) {
  const p = new P.Paths(c);
  const us = await import(path.join(p.USERSETTINGS_PATH));
  const theusersettings = us.Build();
  generate_partition_csv(p, theusersettings);
  //compile partition csv to binary partition file
  idf.partition_gen(c.c.idfProjectDirectory, path.join(p.GENERATED_USERSETTINGS, "usersettings_partition.csv"), path.join(p.GENERATED_USERSETTINGS, "usersettings_partition.bin"), false); 
  generate_cpp_accessor(p, theusersettings);

  //this is necessary to copy the usersettings (the project specific file, that contains all settings) in the context of the browser client project. 
  // There, the usersettings_base.ts is totally different from the one used in the build process

  fs.cpSync(p.USERSETTINGS_PATH, p.DEST_USERSETTINGS_PATH, { recursive: true });
}