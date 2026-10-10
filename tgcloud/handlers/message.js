import { api } from "sdk";
import { handleCommand } from "../lib/commands.js";
import { fanOut } from "../lib/forwarding/forward.js";
import { handleShared } from "../lib/picker.js";
import * as store from "../lib/store.js";

export default async function (message) {
    // A supergroup migration is announced in the old chat; rewrite before anything
    // else, or this message forwards from an id that no longer receives updates.
    if (message.migrate_to_chat_id) {
        await store.migrateChat(message.chat.id, message.migrate_to_chat_id);
        return;
    }

    if (message.new_chat_title) {
        await store.saveChat(message.chat);
        return;
    }

    if (message.chat_shared) {
        const reply = await handleShared(message);
        if (reply)
            await api.sendMessage({
                chat_id: message.chat.id,
                parse_mode: "HTML",
                ...reply,
            });
        return;
    }

    // Commands are only commands in a private chat — a group source may well
    // carry text starting with a slash that is meant to be forwarded.
    if (message.chat.type === "private" && (await handleCommand(message)))
        return;

    await fanOut(message);
}
