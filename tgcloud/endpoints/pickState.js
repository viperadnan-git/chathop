import { caller } from "../lib/endpoint.js";
import * as store from "../lib/store.js";

export default async function (_input, ctx) {
    const pick = await store.readPick((await caller(ctx)).id);
    if (!pick) return { source: null, dest: null, error: null };

    return {
        source: pick.sourceChatId
            ? { chatId: pick.sourceChatId, name: pick.sourceName }
            : null,
        dest: pick.destChatId
            ? { chatId: pick.destChatId, name: pick.destName }
            : null,
        error: pick.error ?? null,
    };
}
