import { api, fetch } from "sdk";
import { botId } from "./app.js";
import { chatTitle } from "./text.js";

/**
 * `<bot id>:<secret>`, matched loosely — Telegram is the real authority. No
 * trailing `\b`: a token ending in `-` is no word boundary, so the match would
 * give that character back and the real token would be refused.
 */
const TOKEN = /\b\d{5,}:[A-Za-z0-9_-]{20,}(?![A-Za-z0-9_-])/;

export const findToken = (text) => String(text ?? "").match(TOKEN)?.[0];

/**
 * True when this is our own token. Never logs it, and never reports why — a
 * wrong token and an unreachable Telegram must look the same from outside.
 */
export async function isOurToken(token) {
    let res;
    try {
        res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    } catch {
        return false;
    }

    const body = await res.json().catch(() => undefined);
    return body?.ok === true && body.result?.id === (await botId());
}

export async function describeUser(userId) {
    try {
        const chat = await api.getChat({ chat_id: userId });
        const named = chat.username ? `@${chat.username}` : String(userId);
        return { known: true, name: chatTitle(chat, named) };
    } catch {
        return { known: false, name: String(userId) };
    }
}

export const HAND_OVER = "admin:";
