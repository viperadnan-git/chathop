import { EndpointError } from "sdk";
import { resolveChat } from "../lib/chatref.js";
import { caller } from "../lib/endpoint.js";
import { capturePhoto } from "../lib/photos.js";
import * as store from "../lib/store.js";
import { chatTitle } from "../lib/text.js";

export default async function (input, ctx) {
    await caller(ctx);

    const result = await resolveChat(String(input.input ?? ""));
    if (!result.ok)
        throw new EndpointError(result.error, { code: "UNRESOLVED" });

    await capturePhoto(result.chat, await store.saveChat(result.chat));
    const { id, username, type } = result.chat;
    return { chatId: id, title: chatTitle(result.chat), username, type };
}
