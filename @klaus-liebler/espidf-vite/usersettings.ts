import path from "path";
import {EscapeToVariableName, StringBuilderImpl } from "@klaus-liebler/commons";
import {writeFileCreateDirLazy } from "./utils";
import * as url from "node:url"
import fs from "node:fs";
import * as idf from "./espidf";
import { Context } from "./context";
import * as P from "./paths";
import { ConfigGroup } from "../usersettings_codegeneration";

function generate_partition_csv(p:P.Paths, theusersettings:ConfigGroup[]) {
  
  console.log(`User settings has ${theusersettings.length} groups`);
  var codeBuilder = new StringBuilderImpl("key,type,encoding,value");

  theusersettings.forEach((cg, i, a) => {
    codeBuilder.AppendLine(`${cg.Key},namespace,,`);
    cg.items.forEach((ci, j, cia) => {
      ci.RenderNvsPartitionGenerator(codeBuilder);
    });
  });
  writeFileCreateDirLazy(path.join(p.GENERATED_NVS, P.NVS_CSV_FILENAME), codeBuilder.Code);
}

function generate_cpp_accessor(p:P.Paths, theusersettings:ConfigGroup[]) {

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
  writeFileCreateDirLazy(path.join(p.GENERATED_NVS, P.NVS_CPP_HEADER_FILENAME), codeBuilder.Code);
}


export async function generate_usersettings(c:Context, cfg:ConfigGroup[]) {
  const p = new P.Paths(c);
  console.log("Try to import")
 
  generate_partition_csv(p, cfg);
  //compile partition csv to binary partition file
  idf.nvs_partition_gen_encrypt(c, ()=>true); 
  generate_cpp_accessor(p, cfg);

  //this is necessary to copy the usersettings (the project specific file, that contains all settings) in the context of the browser client project. 
  // There, the usersettings_base.ts is totally different from the one used in the build process

  fs.cpSync(p.USERSETTINGS_PATH, path.join(p.WEB_GENERATED_USERSETTINGS, "usersettings.ts"), { recursive: true });
  fs.writeFileSync(path.join(p.WEB_GENERATED_USERSETTINGS, "usersettings_import_adapter.ts"), `export * from "@klaus-liebler/web-components"`);
}