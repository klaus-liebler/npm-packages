import { execSync } from 'node:child_process';
import path from "node:path";
import * as fs from "node:fs/promises"
import * as P from "./paths";
import { Context } from './context';

export async function flatbuffers_generate(options: string, inputDir:string, outputBaseDir: string) {

  for (const file of (await fs.readdir(inputDir)).filter(e=>e.endsWith(".fbs"))) {
    const cmd=`flatc ${options} -o ${outputBaseDir} ${path.join(inputDir, file)}`
    console.info(`Processing flatbuffer schema ${file} with options ${options}`)
    execSync(cmd, {
      env: process.env
    });
  }
}



export async function flatbuffers_generate_c(sourceDir:string, destDir:string) {
  await flatbuffers_generate("-c --gen-all", sourceDir, destDir);
}

export async function flatbuffers_generate_ts(sourceDir:string, destDir:string) {
  await flatbuffers_generate("-T --gen-all --ts-no-import-ext", sourceDir, destDir);
}