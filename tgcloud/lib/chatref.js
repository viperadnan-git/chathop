import { api } from "sdk";

const HOSTS = new Set(["t.me", "telegram.me", "telegram.dog"]);
const USERNAME = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;

// Channel and supergroup ids are the internal id behind a -100 prefix.
const toChannelId = (internal) => Number(`-100${internal}`);

function parseChatRef(raw) {
    const input = String(raw ?? "").trim();
    if (!input)
        return { ok: false, error: "Enter a chat id, @username or t.me link" };

    if (/^-?\d+$/.test(input)) {
        const id = Number(input);
        return Number.isSafeInteger(id)
            ? { ok: true, ref: { kind: "id", id } }
            : { ok: false, error: "That number is too large to be a chat id" };
    }

    if (input.startsWith("@")) {
        const username = input.slice(1);
        return USERNAME.test(username)
            ? { ok: true, ref: { kind: "username", username } }
            : { ok: false, error: "That is not a valid username" };
    }

    if (/^(https?:\/\/)?([\w-]+\.)?(t\.me|telegram\.(me|dog))\//i.test(input))
        return parseLink(input);

    return USERNAME.test(input)
        ? { ok: true, ref: { kind: "username", username: input } }
        : { ok: false, error: "Enter a chat id, @username or t.me link" };
}

function parseLink(input) {
    let url;
    try {
        url = new URL(input.startsWith("http") ? input : `https://${input}`);
    } catch {
        return { ok: false, error: "That link could not be read" };
    }

    if (!HOSTS.has(url.hostname.replace(/^www\./i, "").toLowerCase())) {
        return { ok: false, error: "That is not a Telegram link" };
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length === 0)
        return { ok: false, error: "That link does not point to a chat" };

    if (parts[0].startsWith("+") || parts[0].toLowerCase() === "joinchat") {
        return {
            ok: false,
            error: "Invite links cannot be used. Open the chat and copy a message link instead.",
        };
    }

    if (parts[0].toLowerCase() === "c") {
        if (!parts[1] || !/^\d+$/.test(parts[1])) {
            return { ok: false, error: "That link does not contain a chat id" };
        }
        const id = toChannelId(parts[1]);
        return Number.isSafeInteger(id)
            ? { ok: true, ref: { kind: "id", id } }
            : { ok: false, error: "That link contains an unusable chat id" };
    }

    const name = parts[0].toLowerCase() === "s" ? parts[1] : parts[0];
    if (!name)
        return { ok: false, error: "That link does not point to a chat" };

    return USERNAME.test(name)
        ? { ok: true, ref: { kind: "username", username: name } }
        : { ok: false, error: "That link does not point to a chat" };
}

/**
 * The id alone, without asking Telegram: /rm and /get must keep working once
 * the bot is kicked, which is exactly when getChat starts failing.
 */
export async function resolveChatId(input) {
    const parsed = parseChatRef(input);
    if (!parsed.ok) return parsed;
    if (parsed.ref.kind === "id") return { ok: true, id: parsed.ref.id };

    const resolved = await resolveChat(input);
    return resolved.ok ? { ok: true, id: resolved.chat.id } : resolved;
}

export async function resolveChat(input) {
    const parsed = parseChatRef(input);
    if (!parsed.ok) return parsed;

    const target =
        parsed.ref.kind === "id" ? parsed.ref.id : `@${parsed.ref.username}`;

    try {
        return { ok: true, chat: await api.getChat({ chat_id: target }) };
    } catch (error) {
        const description = error?.description ?? error?.message ?? "";
        if (/not found/i.test(description)) {
            return {
                ok: false,
                error: "Chat not found. Add the bot to that chat first.",
            };
        }
        return { ok: false, error: description || "Could not read that chat" };
    }
}
