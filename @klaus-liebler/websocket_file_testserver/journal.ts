import * as flatbuffers from "flatbuffers"
import * as journal from "@generated/flatbuffers_ts/journal"
import { ISender, NamespaceAndHandler } from "./utils";

export class JournalHandler extends NamespaceAndHandler {
    constructor(){
        super(journal.Namespace.Value)
    }
    public Handle(bb: flatbuffers.ByteBuffer, sender: ISender) {
        var rw=journal.RequestWrapper.getRootAsRequestWrapper(bb)
        switch(rw.requestType()){
            case journal.Requests.NONE:
                return;
            case journal.Requests.RequestJournal:{
                //var _rj = <journal.RequestJournal>rw.request(new journal.RequestJournal());
                var b = new flatbuffers.Builder(1024);
                const vect =journal.ResponseJournal.createJournalItemsVector(b,[
                    journal.JournalItem.createJournalItem(b, BigInt(Math.floor(Date.now()/1000-3600)), 1, b.createString("An Entry"), 42, 1),
                    journal.JournalItem.createJournalItem(b, BigInt(Math.floor(Date.now()/1000)), 2, b.createString("A second Entry"), 42, 1)
                ])

                b.finish(
                    journal.ResponseWrapper.createResponseWrapper(
                        b,
                        journal.Responses.ResponseJournal,
                        journal.ResponseJournal.createResponseJournal(
                            b,
                            vect
                        )
                    )
                )
                sender.send(journal.Namespace.Value, b);
            }
        }   
    }
}