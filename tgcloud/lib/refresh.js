import { api } from "sdk";
import { botPresence, canBotPost } from "./access.js";
import { canRead, classify } from "./health.js";
import { capturePhoto } from "./photos.js";
import { pooled } from "./pool.js";
import * as store from "./store.js";

// A stop these checks can actually contradict. The stops only a send could
// disprove ('never_messaged', 'deactivated', 'is_bot') are left alone, because
// guessing restarts a dead route.
const CHECKABLE = store.CHECKABLE_STOPS;

/** `routeId`: check only that route's two chats. What they answer is a fact
 * about the chats, so it still stops or revives every route through them. */
export async function refreshFor(userId, routeId) {
    const all = await store.listRoutes(userId);
    const routes = routeId ? all.filter((r) => r.id === routeId) : all;
    const ids = [
        ...new Set(routes.flatMap((r) => [r.sourceChatId, r.destChatId])),
    ];
    const destinations = new Set(routes.map((r) => r.destChatId));

    const seen = new Map();
    const postable = new Map();
    // The post verdict read below, kept so a chat that is also a source does
    // not pay for a second getChatMember.
    const verdicts = new Map();
    // [chatId, status, scope]. A chat can be a source in one route and a
    // destination in another, and fail at one end only.
    const stops = [];

    await pooled(ids, async (id) => {
        let chat;
        try {
            chat = await api.getChat({ chat_id: id });
        } catch (error) {
            // Kept under its old name: a chat the bot has lost is still worth
            // naming in the listing that explains why it stopped.
            seen.set(id, null);
            const verdict = classify(error);
            // A 429 or a 5xx proves nothing, so only a permanent answer may
            // stop a working route. Unreachable breaks both ends.
            if (verdict.kind === "permanent")
                stops.push([id, verdict.status, "any"]);
            return;
        }
        seen.set(id, chat);
        await capturePhoto(chat, await store.saveChat(chat));

        if (destinations.has(id)) {
            const verdict = await canBotPost(chat);
            await store.notePostRights(id, verdict);
            verdicts.set(id, verdict);
            postable.set(id, verdict.ok);
            if (!verdict.ok && verdict.status !== "unprovable")
                stops.push([id, verdict.status, "destination"]);
        }
    });

    // getChat resolves a public chat the bot was kicked from, so only
    // membership answers for a source. Asked of the sources an answer could
    // change something for: one that could be stopped, or revived.
    const asks = new Set(
        routes
            .filter(
                (r) => r.status === "active" || CHECKABLE.includes(r.status),
            )
            .map((r) => r.sourceChatId),
    );

    const readable = new Map();
    await pooled([...asks], async (id) => {
        const chat = seen.get(id);
        if (!chat) return readable.set(id, false);
        // A DM reports nothing until a send; it is the user's own chat. A
        // verdict read for the destination end answers this too, and one that
        // proved nothing will not prove more for being asked twice.
        const known =
            chat.type === "private" ? true : canRead(verdicts.get(id));
        if (known !== undefined) readable.set(id, known);
        else if (!verdicts.has(id)) {
            const there = await botPresence(id);
            if (there !== undefined) readable.set(id, there);
        }

        if (readable.get(id) === false)
            stops.push([id, verdicts.get(id)?.status ?? "removed", "source"]);
    });

    // The only check a user can ask for, so it has to stop as well as
    // revive — a dead end would go on reading "Forwarding".
    const byChat = new Map();
    for (const [id, status, scope] of stops) {
        const had = byChat.get(id);
        byChat.set(id, [status, !had || had[1] === scope ? scope : "any"]);
    }
    let stopped = 0;
    for (const [id, [status, scope]] of byChat) {
        stopped += await store.stopRoutesForChat(id, status, scope);
    }

    const revived = await store.reviveRoutes(
        all
            .filter(
                (r) =>
                    CHECKABLE.includes(r.status) &&
                    postable.get(r.destChatId) &&
                    readable.get(r.sourceChatId),
            )
            .map((r) => r.id),
        CHECKABLE,
    );

    const unreachable = ids.filter((id) => !seen.get(id));
    return {
        total: ids.length,
        updated: ids.length - unreachable.length,
        failed: unreachable.length,
        revived,
        stopped,
        unreachable,
    };
}
