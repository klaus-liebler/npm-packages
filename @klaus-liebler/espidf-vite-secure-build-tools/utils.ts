import path from "node:path";
import fs, { PathLike } from "node:fs";
import {SearchReplace, X02 } from "@klaus-liebler/commons";


export function mac_12char(mac:number){return X02(mac, 12);}
export function mac_6char(mac:number){return mac_12char(mac).slice(6);}

export interface IBoardInfo{
  mac:number,//as Primärschlüssel
  //alle folgenden können nicht aus Board ausgelesen werden
  board_name:string,
  board_version:number,
  board_roles:string|Array<string>,
  first_connected_dt:number,
  last_connected_dt:number,
  board_settings:any,
  flash_encryption_key_burned_and_activated:boolean,
}

export function writeFileCreateDirLazy(file: fs.PathOrFileDescriptor, data: string | NodeJS.ArrayBufferView) {
  fs.mkdirSync(path.dirname(file.toString()), { recursive: true });
  fs.writeFileSync(file, data);
}

export function cleanNpmExcept_PackageJson_node_modules(targetDir:string){
  if(!fs.existsSync(targetDir)) return;
  const dirItems=fs.readdirSync(targetDir);
  for(const item of dirItems){
    const fullPath = path.join(targetDir, item);
    const stats=fs.statSync(fullPath)
    if(stats.isDirectory()){
      if(fullPath.indexOf("node_modules")>=0) continue
      fs.rmSync(fullPath, {recursive:true, force:true})
    }else if(stats.isFile()){
      if(fullPath.endsWith("json")) continue
      fs.unlinkSync(fullPath);
    }
  };
}

export function CopyBoardSpecificFiles(targetDir:string, pathsWithDynamicFiles:Array<string>, namesToSearchFor:Array<string>) {
    pathsWithDynamicFiles.forEach((p)=>{
         namesToSearchFor.forEach((n)=>{
            if(fs.existsSync(path.join(p, n))){
                console.info(`Copying ${path.join(p, n)} to ${path.join(targetDir, path.basename(p))}`);
                fs.cpSync(path.join(p, n), path.join(targetDir, path.basename(p)), { recursive: true });
            }
         })
    });   
}


export function createWriteStreamCreateDirLazy(pathLike: fs.PathLike): fs.WriteStream {
  fs.mkdirSync(path.dirname(pathLike.toString()), { recursive: true });
  return fs.createWriteStream(pathLike);
}



export default function templateSpecial(fillInFilePath:string, templatePath: string, defaultSearch:string, furtherSearchReplace:SearchReplace[]) {
  const file = fs.readFileSync(fillInFilePath, {encoding:"utf-8"});
  const htmlTemplate:string = fs.readFileSync(templatePath, {encoding:"utf-8"});
  furtherSearchReplace.forEach(e => {
    e.replaceFilePath=fs.readFileSync(e.replaceFilePath, {encoding:"utf-8"});
  });
  
  var content =  htmlTemplate.replace(defaultSearch, file);
  furtherSearchReplace.forEach(e => {
    content=content.replace(e.search, e.replaceFilePath);
  });  
  //TODO, not used right now..

};

