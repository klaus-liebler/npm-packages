import { chatbot } from "@generated/wsprotocol_ts/ws-protocol";
import { ISender, NamespaceAndHandler } from "./utils";

export class ChatbotHandler extends NamespaceAndHandler {
    constructor(){
        super(chatbot.NAMESPACE_ID)
    }
    public Handle(messageTypeId: number, view: DataView, sender: ISender) {
        switch (messageTypeId) {
            case chatbot.RequestChat.TYPE_ID: {
                const req = chatbot.RequestChat.decode(view, 0);
                sender.send(chatbot.ResponseChat.encode({ requestId: req.requestId, text: "Hello " + req.text }));
                break;
            }
        }
    }
}
