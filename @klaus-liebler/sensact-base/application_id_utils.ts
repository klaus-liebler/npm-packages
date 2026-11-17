import { sensact } from "@generated/wsprotocol_ts/ws-protocol"
import { ApplicationId } from "@generated/sensact_applicationids/applicationIds";

export function GetTechnologyFromApplicationId(id: ApplicationId){
    return ApplicationId[id].split("_").filter(a=>a.length>0)[0]
}

export function GetLevelFromApplicationId(id: ApplicationId){
    return ApplicationId[id].split("_").filter(a=>a.length>0)[1]
}

export function GetRoomFromApplicationId(id: ApplicationId){
    return ApplicationId[id].split("_").filter(a=>a.length>0)[2]
}
