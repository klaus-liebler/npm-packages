import path from "path";
import {EscapeToVariableName, StringBuilderImpl } from "@klaus-liebler/commons";
import {writeFileCreateDirLazy } from "./utils";
import fs from "node:fs";
import * as idf from "./espidf";
import { Context } from "./context";
import * as P from "./paths";
import { ConfigGroup } from "../usersettings_codegeneration";
import {IPackageJson} from "./package_json"
import * as npm from "./npm"
import { execSync } from "node:child_process";
import * as os from "node:os"

function generate_partition_csv(pa:P.Paths, theusersettings:ConfigGroup[]) {
  
  console.log(`User settings has ${theusersettings.length} groups`);
  var codeBuilder = new StringBuilderImpl("key,type,encoding,value");

  theusersettings.forEach((cg, i, a) => {
    codeBuilder.AppendLine(`${cg.Key},namespace,,`);
    cg.items.forEach((ci, j, cia) => {
      ci.RenderNvsPartitionGenerator(codeBuilder);
    });
  });
  writeFileCreateDirLazy(path.join(pa.GENERATED_NVS, P.NVS_CSV_FILENAME), codeBuilder.Code);
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
  const pa = new P.Paths(c);
  generate_partition_csv(pa, cfg);
  //compile partition csv to binary partition file
  idf.nvs_partition_gen(c, false, (l)=>l.startsWith("Created NVS binary")); 
  generate_cpp_accessor(pa, cfg);

  //this is necessary to copy the usersettings (the project specific file, that contains all settings) in the context of the browser client project. 
  // There, the usersettings_base.ts is totally different from the one used in the build process
  const USERSETTINGS_TS_FILE="usersettings.ts"
  fs.cpSync(pa.P_USERSETTINGS_PATH, path.join(pa.GENERATED_NVS_TS, USERSETTINGS_TS_FILE), { recursive: true });
  writeFileCreateDirLazy(path.join(pa.GENERATED_NVS_TS, "usersettings_import_adapter.ts"), `export * from "@klaus-liebler/usersettings_runtime"`);
  npm.CreateAndInstallNpmProjectLazily(
    pa.GENERATED_NVS_TS,
    {
      name:"@generated/usersettings",
      version:"0.0.1",
      description:"Generated during Build",
      main: USERSETTINGS_TS_FILE,
      author:"Generated",
      license:"No License",
      dependencies:{
        "@klaus-liebler/usersettings_runtime": "file:../../npm-packages/@klaus-liebler/usersettings_runtime"
      }
    }
  );
}