import { StringBuilderImpl } from "@klaus-liebler/commons";
import { Context } from "./context"
import path from "node:path";
import {writeFileCreateDirLazy } from "./utils";
import * as npm from "./npm"

export function createCppConfigurationHeader(c: Context, defines: Record<string, string |Array<string>| number>) {
    var s = new StringBuilderImpl("#pragma once\n");
    for (const [k, v] of Object.entries(defines)) {
        s.AppendLine(`#define __${k}__ ${JSON.stringify(v)}`);
    }
    writeFileCreateDirLazy(path.join(c.p.GENERATED_RUNTIMECONFIG_CPP, "runtimeconfig_defines.hh"), s.Code);
    s = new StringBuilderImpl("#pragma once\nnamespace cfg{");
    for (const [k, v] of Object.entries(defines)) {

        s.AppendLine(`\tconstexpr auto ${k}{${JSON.stringify(v)}};`);
    }
    s.AppendLine("}//namespace")
    writeFileCreateDirLazy(path.join(c.p.GENERATED_RUNTIMECONFIG_CPP, "runtimeconfig.hh"), s.Code);
}

export function createCMakeJsonConfigFile(c: Context, defines: Record<string, string | Array<string> | number>) {
    writeFileCreateDirLazy(path.join(c.p.GENERATED_CMAKE, "config.json"), JSON.stringify(defines));
}

export function createTypeScriptRuntimeConfigProject(c:Context, defines: Record<string, string | Array<string> | number>){
    var sb = new StringBuilderImpl();
   
    for (const [k, v] of Object.entries(defines)) {
    sb.AppendLine(`export const ${k}=${JSON.stringify(v)}`)
    }
    writeFileCreateDirLazy(path.join(c.p.GENERATED_RUNTIMECONFIG_TS, "index.ts"),sb.Code);
  
    npm.CreateAndInstallNpmProjectLazily(
      c.p.GENERATED_RUNTIMECONFIG_TS,
      {
        name: `@generated/runtimeconfig_ts`,
        version: "0.0.1",
        description: "Generated during Build",
        author: "Generated",
        license: "No License",
        main: "index.ts"
      }
    );
}