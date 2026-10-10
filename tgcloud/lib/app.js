import { api } from "sdk";
import * as store from "./store.js";

const TTL_MS = 6 * 60 * 60 * 1000;

let memo;

// The promise, not the value: concurrent callers would each buy their own
// getMe before the first had anything to memoise.
function facts() {
    memo ??= resolve().catch((error) => {
        memo = undefined;
        throw error;
    });
    return memo;
}

async function resolve() {
    // `username` is checked too: a row cached before it was recorded is stale
    // whatever its age.
    const stored = await store.botFacts();
    if (
        stored?.id &&
        stored.username &&
        Date.now() - (stored.at ?? 0) < TTL_MS
    ) {
        return stored;
    }

    const me = await api.getMe();
    const fresh = { id: me.id, username: me.username, at: Date.now() };
    await store.saveBotFacts(fresh);
    return fresh;
}

export async function botUsername() {
    return (await facts()).username;
}

export async function botId() {
    return (await facts()).id;
}

export async function miniAppUrl() {
    return `https://app${(await facts()).id}.tgcloud.ai/`;
}

export async function settingsButton(text = "Open settings") {
    return {
        inline_keyboard: [[{ text, web_app: { url: await miniAppUrl() } }]],
    };
}
