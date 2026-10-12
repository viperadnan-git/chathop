import { MEDIA_KINDS } from "../config.js";
import { test as regexTest } from "./regex.js";

export function mediaKind(msg) {
    for (const kind of MEDIA_KINDS) {
        if (kind !== "text" && kind in msg) return kind;
    }
    return "text";
}

const messageText = (msg) => msg.text ?? msg.caption ?? "";

const messageFileName = (msg) =>
    msg.document?.file_name ??
    msg.video?.file_name ??
    msg.audio?.file_name ??
    msg.animation?.file_name ??
    "";

const haystack = (msg, target) =>
    target === "filename" ? messageFileName(msg) : messageText(msg);

function senderIdentities(msg) {
    const ids = [];
    const usernames = [];

    const add = (id, username) => {
        if (id !== undefined) ids.push(id);
        if (username) usernames.push(username.toLowerCase());
    };

    add(msg.from?.id, msg.from?.username);
    add(msg.sender_chat?.id, msg.sender_chat?.username);

    const origin = msg.forward_origin;
    if (origin?.type === "user")
        add(origin.sender_user.id, origin.sender_user.username);
    else if (origin?.type === "chat")
        add(origin.sender_chat.id, origin.sender_chat.username);
    else if (origin?.type === "channel")
        add(origin.chat.id, origin.chat.username);

    return { ids, usernames };
}

// `folded` is one sweep's lowercased haystacks: every keyword rule wants the
// same one, and the text runs to 4096 characters.
function matches(rule, msg, folded) {
    switch (rule.type) {
        case "keyword": {
            const text = haystack(msg, rule.target);
            if (!text) return false;
            if (rule.caseSensitive) return text.includes(rule.value);
            folded[rule.target] ??= text.toLowerCase();
            return folded[rule.target].includes(rule.value.toLowerCase());
        }
        case "regex": {
            const text = haystack(msg, rule.target);
            return text
                ? regexTest(rule.pattern, text, rule.caseSensitive)
                : false;
        }
        case "media":
            return rule.kinds.includes(mediaKind(msg));
        case "sender": {
            const { ids, usernames } = senderIdentities(msg);
            return (
                rule.ids.some((id) => ids.includes(id)) ||
                rule.usernames.some((name) => usernames.includes(name))
            );
        }
        default:
            return false;
    }
}

export function explain(config, msg) {
    const { whitelist, blacklist } = config.filters;
    const folded = {};

    const denied = blacklist.find((rule) => matches(rule, msg, folded));
    if (denied) return { pass: false, list: "block", rule: denied };
    if (whitelist.length === 0) return { pass: true };

    const allowed = whitelist.find((rule) => matches(rule, msg, folded));
    return allowed
        ? { pass: true, list: "allow", rule: allowed }
        : { pass: false, list: "allow" };
}

export const passes = (config, msg) => explain(config, msg).pass;
