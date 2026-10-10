import { api } from "sdk";
import { botIsIn, canBotPost } from "./access.js";
import { capturePhoto } from "./photos.js";
import { pooled } from "./pool.js";
import * as store from "./store.js";

// A stop these checks can actually contradict. The stops only a send could
// disprove ('never_messaged', 'deactivated', 'is_bot') are left alone, because
// guessing restarts a dead route.
const CHECKABLE = store.CHECKABLE_STOPS;

export async function refreshFor(userId) {
    const routes = await store.listRoutes(userId);
    const ids = [
        ...new Set(routes.flatMap((r) => [r.sourceChatId, r.destChatId])),
    ];
    const destinations = new Set(routes.map((r) => r.destChatId));

    const seen = new Map();
    const postable = new Map();

    await pooled(ids, async (id) => {
        let chat;
        try {
            chat = await api.getChat({ chat_id: id });
        } catch {
            // Kept under its old name: a chat the bot has lost is still worth
            // naming in the listing that explains why it stopped.
            seen.set(id, null);
            return;
        }
        seen.set(id, chat);
        await capturePhoto(chat, await store.saveChat(chat));

        if (destinations.has(id)) {
            const verdict = await canBotPost(chat);
            await store.notePostRights(id, verdict);
            postable.set(id, verdict.ok);
        }
    });

    // getChat resolves a public chat the bot was kicked from, so it cannot
    // answer for a source. Asked only for the stopped routes that are
    // otherwise revivable, which is usually none.
    const candidates = routes.filter(
        (r) =>
            CHECKABLE.includes(r.status) &&
            postable.get(r.destChatId) &&
            seen.get(r.sourceChatId),
    );
    const readable = new Map();
    await pooled(
        [...new Set(candidates.map((r) => r.sourceChatId))],
        async (id) =>
            readable.set(
                id,
                // A DM reports nothing until a send; it is the user's own chat.
                seen.get(id).type === "private" ? true : await botIsIn(id),
            ),
    );

    const revived = await store.reviveRoutes(
        candidates.filter((r) => readable.get(r.sourceChatId)).map((r) => r.id),
        CHECKABLE,
    );

    const unreachable = ids.filter((id) => !seen.get(id));
    return {
        total: ids.length,
        updated: ids.length - unreachable.length,
        failed: unreachable.length,
        revived,
        unreachable,
    };
}
