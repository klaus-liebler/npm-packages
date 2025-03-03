import {IPackageJson} from "./package_json"
import {writeFileCreateDirLazy } from "./utils";
import path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os"
import { execSync } from 'node:child_process';

export function CreateAndInstallNpmProjectLazily(projectRoot:string, pj:IPackageJson){
  const pjContent=JSON.stringify(pj);
  const pjPath=path.join(projectRoot, "package.json")
  var needToCallNpmInstall=false;
  if(pj.dependencies && (!fs.existsSync(pjPath) || fs.readFileSync(pjPath).toString()!=pjContent)){
    writeFileCreateDirLazy(pjPath, pjContent);
    console.log(`Written new package.json file to ${projectRoot} because package.json ${fs.existsSync(pjPath)?"does not exist":"changed"} -->call npm i`);
    needToCallNpmInstall=true;
  }
  if(!fs.existsSync(path.join(projectRoot, "node_modules"))){
      console.log(`node_modules does not exist -->call npm i`);
      needToCallNpmInstall=true;
  }
  if(needToCallNpmInstall){
    
    const filterStdOut = (l: string) => true;
    const cmd = `npm install`
    console.info(`Executing ${cmd} in path ${projectRoot}`)
    const stdout = execSync(cmd, {
      cwd: projectRoot,
      env: process.env
    });
    if (stdout)
      stdout.toString().split(os.EOL).filter((v) => filterStdOut(v)).forEach(v => console.log(v.toString()))
  }
}