import { api } from "sdk";
import { describeUser, HAND_OVER } from "../lib/ownership.js";
import * as store from "../lib/store.js";
import { escapeHtml } from "../lib/text.js";

export default async function (query) {
    const data = query.data ?? "";
    const userId = query.from?.id;
    if (!data.startsWith(HAND_OVER) || !userId) return;

    // A stale query cannot be answered, and must not abort what the press asked
    // for — the toast is feedback, not the action.
    const answer = (text) =>
        api
            .answerCallbackQuery({ callback_query_id: query.id, text })
            .catch(() => {});
    const settle = async (html) => {
        const message = query.message;
        if (!message) return;
        await api
            .editMessageText({
                chat_id: message.chat.id,
                message_id: message.message_id,
                text: html,
                parse_mode: "HTML",
            })
            .catch(() => {});
    };

    if ((await store.getAdmin()) !== userId) {
        await answer("Only whoever runs this bot can do that.");
        return;
    }

    const target = data.slice(HAND_OVER.length);
    if (target === "cancel") {
        await answer("Kept.");
        await settle("Kept. You still run this bot.");
        return;
    }

    const id = Number(target);
    if (!Number.isSafeInteger(id) || id <= 0) {
        await answer("That id is not usable.");
        return;
    }

    await store.setAdmin(id);
    const who = await describeUser(id);
    await answer("Handed over.");
    await settle(
        `<b>${escapeHtml(who.name)}</b> (<code>${id}</code>) runs this bot now.\n\n` +
            "<i>To take it back, send /claim with this bot's token from @BotFather.</i>",
    );

    // They may not have a chat with the bot, which is exactly the case the
    // confirmation warned about — so this is allowed to fail.
    await api
        .sendMessage({
            chat_id: id,
            text: "You run <b>this bot</b> now. Send /help to see what that adds.",
            parse_mode: "HTML",
        })
        .catch(() => {});
}
