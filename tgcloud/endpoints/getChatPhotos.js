import { caller } from "../lib/endpoint.js";
import { photosFor } from "../lib/photos.js";
import * as store from "../lib/store.js";

export default async function (input, ctx) {
    const user = await caller(ctx);

    const [routes, pick] = await Promise.all([
        store.listRoutes(user.id),
        store.readPick(user.id),
    ]);
    const owned = new Set(
        routes.flatMap((r) => [r.sourceChatId, r.destChatId]),
    );
    if (pick?.sourceChatId) owned.add(pick.sourceChatId);
    if (pick?.destChatId) owned.add(pick.destChatId);

    // Only real entries: the input object can arrive carrying a sentinel key,
    // and `known` is caller-supplied either way.
    const known = {};
    for (const [chatId, photoId] of Object.entries(input.known ?? {})) {
        if (/^-?\d+$/.test(chatId) && typeof photoId === "string")
            known[chatId] = photoId;
    }

    const chatIds = Array.isArray(input.chatIds) ? input.chatIds : [];
    const asked = [...owned].filter((id) => chatIds.includes(id));

    return photosFor(asked, known);
}
