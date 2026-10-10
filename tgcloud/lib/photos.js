import { api } from "sdk";
import { base64 } from "./base64.js";
import * as store from "./store.js";

// Telegram's "small" avatar is a few KB; anything larger is not one.
const MAX_PHOTO_BYTES = 128_000;

export async function capturePhoto(chat, stored) {
    const small = chat?.photo?.small_file_id;
    const id = chat?.photo?.small_file_unique_id ?? null;

    try {
        // Gone, or unchanged since last time. savePhoto writes the id and the
        // bytes together, so a matching id means the picture is there.
        if (!small) {
            if (stored) await store.savePhoto(chat.id, null, null);
            return;
        }
        if (stored === id) return;

        const bytes = await api.getFileContent(small);
        if (bytes.length > MAX_PHOTO_BYTES) return undefined;
        await store.savePhoto(chat.id, id, bytes);
    } catch (error) {
        console.warn(
            `No avatar for ${chat.id}: ${error?.description ?? error?.message}`,
        );
    }
}

// A cold launch can name every chat of the account at once, and one avatar is
// up to 128 KB before base64. The rest come back on the next call.
const MAX_REPLY_BYTES = 1_500_000;

export async function photosFor(chatIds, known = {}) {
    const rows = await store.chatPhotoIds(chatIds);
    const live = new Set();
    const changed = [];
    for (const row of rows) {
        if (!row.photoId) continue;
        live.add(String(row.chatId));
        if (known[row.chatId] !== row.photoId) changed.push(row.chatId);
    }

    const photos = {};
    const more = [];
    let budget = MAX_REPLY_BYTES;
    for (const row of await store.chatPhotoBytes(changed)) {
        if (!row.photo) continue;
        if (budget < row.photo.length) {
            more.push(row.chatId);
            continue;
        }
        budget -= row.photo.length;
        photos[row.chatId] = {
            id: row.photoId,
            uri: `data:image/jpeg;base64,${base64(row.photo)}`,
        };
    }

    const drop = Object.keys(known).filter((id) => !live.has(String(id)));
    return { photos, drop, more };
}
