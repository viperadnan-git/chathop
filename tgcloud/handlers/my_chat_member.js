import { reconcileChat } from "../lib/access.js";
import { postVerdict } from "../lib/rights.js";
import * as store from "../lib/store.js";

export default async function (update) {
    const { chat, new_chat_member: member } = update;
    await store.saveChat(chat);

    const verdict =
        chat.type === "private"
            ? member.status === "kicked"
                ? { ok: false, status: "blocked" }
                : { ok: true }
            : postVerdict(chat.type, member);

    // Left or kicked breaks both ends, whatever the rights say.
    const absent = member.status === "left" || member.status === "kicked";
    await reconcileChat(
        chat,
        absent ? { ok: false, status: "removed" } : verdict,
    );
}
