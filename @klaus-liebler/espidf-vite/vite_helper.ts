import path from 'node:path';
import * as zlib from "node:zlib"
import * as vite from 'vite'
import fs from "node:fs";
export async function buildAndCompressWebProject(projectRoot:string, outDir:string, defines?: Record<string, any> | undefined) {
  await vite.build({

    root: projectRoot,
    define: defines,
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
  console.log(`Compressed file written to ${compressedPath}. FileSize = ${result.byteLength} byte = ${(result.byteLength / 1024.0).toFixed(2)} kiB`);
  return;
}