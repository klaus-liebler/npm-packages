import * as fs from "node:fs"
import path from "node:path"

import { randomInt } from "node:crypto";

const FBDSTORE_BASE_DIRECTORY = "fbdstore";
const DEFAULT_FBD_FILEPATH = "default.fbd";
const TEMP_FBD_FILEPATH = "temp.fbd";


import { functionblock } from "@generated/wsprotocol_ts/ws-protocol";
import { ISender, NamespaceAndHandler } from "./utils";

export class FunctionblockHandler extends NamespaceAndHandler {
    constructor(private readonly spiffsRoot:string) {
        super(functionblock.NAMESPACE_ID)
    }
    public Handle(messageTypeId: number, view: DataView, sender: ISender) {
        switch (messageTypeId) {
            case functionblock.RequestFbdRun.TYPE_ID: {
                const req = functionblock.RequestFbdRun.decode(view, 0);
                sender.respond(functionblock.ResponseFbdRun.encode, {});
                break;
            }
            case functionblock.RequestDebugData.TYPE_ID: {
                const req = functionblock.RequestDebugData.decode(view, 0);
                var temp = fs.readFileSync(path.join(this.spiffsRoot, TEMP_FBD_FILEPATH))
                var dv = new DataView(temp.buffer, temp.byteOffset, temp.byteLength);
                var sizeOfBinaryData = dv.getUint32(0, true)
                var dataStructureVersion = dv.getUint32(4, true);
                if (dataStructureVersion != 0xAFFECAFE) {
                    console.error("dataStructureVersion!=0xAFFECAFE")
                    return
                }
                var hash = dv.getUint32(8, true);
                var booleansCount = dv.getUint32(12, true);
                var integersCount = dv.getUint32(16, true);
                var floatsCount = dv.getUint32(20, true);
                var colorsCount = dv.getUint32(24, true);
                //var operatorsCount = dv.getUint32(28, true);
                sender.respond(functionblock.ResponseDebugData.encode, { debugInfoHash: hash,
                    bools: Array.from({ length: booleansCount }, () => ({ value: randomInt(0, 2) == 1 })),
                    integers: Array.from({ length: integersCount }, () => ({ value: randomInt(0, 100) })),
                    floats: Array.from({ length: floatsCount }, () => ({ value: randomInt(0, 100) })),
                    colors: Array.from({ length: colorsCount }, () => ({ value: randomInt(0, 2000000000) })), });
                break;
            }
        }
    }
}


