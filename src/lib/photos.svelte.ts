import * as api from "./api";
import { slot } from "./store.svelte";

type Cached = { id: string; uri: string };

const store = slot<Record<number, Cached>>("chathop:avatars:1", {});

const byChat = $state<Record<number, Cached>>(store.read());

// Asked for once per launch: a cached picture still goes to the server to be
// revalidated, but only the first component to want it starts that.
const asked = new Set<number>();
let queue = new Set<number>();
let scheduled = false;

async function flush() {
    scheduled = false;
    const ids = [...queue];
    queue = new Set();
    if (!ids.length) return;

    const known: Record<number, string> = {};
    for (const id of ids) if (byChat[id]) known[id] = byChat[id].id;

    try {
        const {
            photos: changed,
            drop,
            more,
        } = await api.chatPhotos(known, ids);
        // Said nothing about it, so it served nothing: forget having
        // asked, and the next screen that needs it tries again.
        const answered = new Set([
            ...Object.keys(changed),
            ...drop,
            ...(more ?? []).map(String),
        ]);
        for (const id of ids) if (!answered.has(String(id))) asked.delete(id);
        if (!Object.keys(changed).length && !drop.length) return;

        for (const id of drop) delete byChat[Number(id)];
        Object.assign(byChat, changed);
        store.write(byChat);
    } catch {
        for (const id of ids) asked.delete(id);
    }
}

export const photos = {
    get(chatId: number): string | undefined {
        return byChat[chatId]?.uri;
    },
    ensure(chatId: number) {
        if (!chatId || asked.has(chatId)) return;
        asked.add(chatId);
        queue.add(chatId);
        if (scheduled) return;
        scheduled = true;
        queueMicrotask(flush);
    },
};
