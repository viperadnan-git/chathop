import { canPostTo, canReadFrom } from "./access.js";
import * as store from "./store.js";

export async function createForward(userId, source, dest) {
    if (source.id === dest.id) return { ok: false, code: "SAME_CHAT" };

    // Whoever runs the bot is entitled to whatever it can reach. What the
    // bot itself may read and post to stays Telegram's to enforce.
    if (userId !== (await store.getAdmin())) {
        const [readable, allowed] = await Promise.all([
            canReadFrom(userId, source),
            canPostTo(userId, dest),
        ]);
        if (!readable.ok)
            return {
                ok: false,
                code: "FORBIDDEN",
                end: "source",
                why: readable.error,
            };
        if (!allowed.ok)
            return {
                ok: false,
                code: "FORBIDDEN",
                end: "destination",
                why: allowed.error,
            };
    }

    return {
        ...(await store.createRoute(userId, source.id, dest.id)),
        ok: true,
    };
}
