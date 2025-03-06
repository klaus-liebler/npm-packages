import path from 'node:path';
import * as zlib from "node:zlib"
import * as vite from 'vite'
import fs from "node:fs";
export async function buildAndCompressWebProject(projectRoot: string, outDir: string) {


  await vite.build({
    root: projectRoot,
    esbuild: {
      //drop:["console", 'debugger'],
      legalComments: 'none',

    },
    build: {
      //minify: true,
      sourcemap:true,
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