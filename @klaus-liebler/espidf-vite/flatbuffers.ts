import { execSync } from 'node:child_process';
import path from "node:path";
import * as fs from "node:fs/promises"
import { EscapeToVariableName2, StringBuilderImpl } from '@klaus-liebler/commons';
import { writeFileCreateDirLazy } from './utils';
import { IPackageJson } from './package_json';
import * as os from "node:os"

export async function flatbuffers_generate(options: string, inputFile: string, outputBaseDir: string) {
  const cmd = `flatc ${options} -o ${outputBaseDir} ${inputFile}`
  console.info(`Processing flatbuffer schema ${inputFile} with options ${options}`)
  execSync(cmd, {
    env: process.env
  });

}



export async function flatbuffers_generate_c(sourceDir: string, destDir: string) {
  for (const file of (await fs.readdir(sourceDir)).filter(e => e.endsWith(".fbs"))) {
    const inputFile = path.join(sourceDir, file);
    await flatbuffers_generate("-c --gen-all", inputFile, destDir);
  }
}

export async function flatbuffers_generate_ts(sourceDir: string, parentDirectory:string, projectName: string) {
  const sb = new StringBuilderImpl();
  for (const file of (await fs.readdir(sourceDir)).filter(e => e.endsWith(".fbs"))) {
    const inputFile = path.join(sourceDir, file);
    const parsed=path.parse(file)
    await flatbuffers_generate("-T --gen-all --ts-no-import-ext", inputFile, path.join(parentDirectory, projectName));
    sb.AppendLine(`export * as ${EscapeToVariableName2(parsed.name)} from "./${parsed.name}"`)
  }
  writeFileCreateDirLazy(path.join(parentDirectory, projectName, "index.ts"), sb.Code);

  const pj:IPackageJson={
    "name": `@generated/${projectName}`,
    "version": "1.0.0",
    "main": "index.ts",
    "scripts": {
      "test": "echo \"Error: no test specified\" && exit 1"
    },
    "author": "",
    "license": "ISC",
    "description": "",
    "dependencies": {
      "flatbuffers": "^25.1.21"
    }
  }
  writeFileCreateDirLazy(path.join(parentDirectory, projectName, "package.json"), JSON.stringify(pj));
  const filterStdOut =(l:string)=>true;
  const cmd = `npm install`
  console.info(`Executing ${cmd}`)
  const stdout = execSync(cmd, {
    cwd: path.join(parentDirectory, projectName),
    env: process.env
  });
  if (stdout)
    stdout.toString().split(os.EOL).filter((v)=>filterStdOut(v)).forEach(v=>console.log(v.toString()))
}