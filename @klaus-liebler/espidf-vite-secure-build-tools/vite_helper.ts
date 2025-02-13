import path from 'node:path';
import * as zlib from "node:zlib"
import * as vite from 'vite'
import fs from "node:fs";
import * as npm from "./npm"
import { Paths } from './paths';
import { StringBuilderImpl } from '@klaus-liebler/commons';
import { writeFileCreateDirLazy } from './utils';
export async function buildAndCompressWebProject(p: Paths, projectRoot: string, outDir: string, defines?: Record<string, any> | undefined) {

  var sb = new StringBuilderImpl();
  if(defines){
    for (const [k, v] of Object.entries(defines)) {
      sb.AppendLine(`export const ${k}=${JSON.stringify(v)}`)
    }
  }
  
  writeFileCreateDirLazy(
    path.join(p.GENERATED_RUNTIMECONFIG_TS, "index.ts"),
    sb.Code
  );

  npm.CreateAndInstallNpmProjectLazily(
    p.GENERATED_RUNTIMECONFIG_TS,
    {
      name: `@generated/runtimeconfig_ts`,
      version: "0.0.1",
      description: "Generated during Build",
      author: "Generated",
      license: "No License",
      main: "index.ts"
    }
  );
  await vite.build({
    root: projectRoot,
    esbuild: {
      //drop:["console", 'debugger'],
      legalComments: 'none',

    },
    build: {
      //minify: true,
      //sourcemap:"inline",
      cssCodeSplit: false,
      outDir: outDir,
      emptyOutDir: true,
    }
  });
  const origPath = path.join(outDir, "index.html")
  const compressedPath = path.join(outDir, "index.compressed.br")
  const result = zlib.brotliCompressSync(fs.readFileSync(origPath));
  fs.writeFileSync(compressedPath, result);
  console.log(`Web application file written to ${compressedPath}. Brotli compressed file size = ${result.byteLength} byte = ${(result.byteLength / 1024.0).toFixed(2)} kiB`);
  return;
}