import * as flatbuffers from "flatbuffers"
import * as chatbot from "@generated/flatbuffers_ts/chatbot"
import { ISender, NamespaceAndHandler } from "..";

export class ChatbotHandler extends NamespaceAndHandler {
    constructor(){
        super(chatbot.Namespace.Value)
    }
    public Handle(buffer: flatbuffers.ByteBuffer, sender: ISender) {
        var rw = chatbot.RequestWrapper.getRootAsRequestWrapper(buffer)
        switch (rw.requestType()) {
            case chatbot.Requests.RequestChat: {
                const rwc = <chatbot.RequestChat>rw.request(new chatbot.RequestChat());
                let b = new flatbuffers.Builder(1024);
                b.finish(chatbot.ResponseWrapper.createResponseWrapper(b, chatbot.Responses.ResponseChat, chatbot.ResponseChat.createResponseChat(b, b.createString("Hello " + rwc.text()))));
                sender.send(chatbot.Namespace.Value, b);

            }
                break;
        }
    }
}

