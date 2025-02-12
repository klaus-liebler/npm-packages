import * as sensact from "@generated/flatbuffers_ts/sensact"

export function GetTechnologyFromApplicationId(id: sensact.ApplicationId){
    return sensact.ApplicationId[id].split("_").filter(a=>a.length>0)[0]
}

export function GetLevelFromApplicationId(id: sensact.ApplicationId){
    return sensact.ApplicationId[id].split("_").filter(a=>a.length>0)[1]
}

export function GetRoomFromApplicationId(id: sensact.ApplicationId){
    return sensact.ApplicationId[id].split("_").filter(a=>a.length>0)[2]
}