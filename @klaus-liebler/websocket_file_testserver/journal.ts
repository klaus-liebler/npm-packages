import { journal } from "@generated/wsprotocol_ts/ws-protocol";
import { ISender, NamespaceAndHandler } from "./utils";

export class JournalHandler extends NamespaceAndHandler {
    constructor(){
        super(journal.NAMESPACE_ID)
    }
    public Handle(messageTypeId: number, view: DataView, sender: ISender) {
        switch(messageTypeId){
            case journal.RequestJournal.TYPE_ID:{
                const req = journal.RequestJournal.decode(view, 0);
                const now = Math.floor(Date.now()/1000);
                sender.respond(journal.ResponseJournal.encode, { journalItems: [
                        { classId: journal.JournalItem.CLASS_ID, lastMessageTimestamp: now-3600, messageCode: 1, messageString: "An Entry", messageData: 42, messageCount: 1 },
                        { classId: journal.JournalItem.CLASS_ID, lastMessageTimestamp: now, messageCode: 2, messageString: "A second Entry", messageData: 42, messageCount: 1 },
                    ], });
                break;
            }
        }
    }
}
