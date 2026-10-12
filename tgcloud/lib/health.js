// error_code is too coarse to act on — 400 covers both "chat not found" and
// "message text is empty" — so these rules match on description only.

export const ROUTE_STATUS = {
    active: "Forwarding",
    paused: "Paused by you",
    removed: "I was removed from this chat",
    blocked: "This person blocked me",
    no_rights: "I am not allowed to post here",
    not_admin: "I need to be an admin here",
    gone: "This chat is gone, or I was never added",
    deactivated: "This account was deleted",
    is_bot: "I cannot forward to another bot",
    never_messaged: "This person has never messaged me",
};

export const statusLabel = (status) => ROUTE_STATUS[status] ?? "Stopped";

// 'gone' belongs here: a chat never added answers like one that is gone.
export const ABSENT = ["removed", "blocked", "gone"];

/** The ends a user has to go and fix, from each end's last known facts. Both
 * can be broken at once, and each needs its own repair. */
export function brokenEnds(source, dest) {
    const ends = [];
    if (ABSENT.includes(source?.facts?.block)) ends.push("source");
    if (dest?.facts?.canPost === false) ends.push("destination");
    return ends;
}

/** One wording for both sides, so the endpoint's refusal and the app's report
 * can never describe the same chat differently. `broken`: `[{ end, name }]`. */
export const stuckReason = (
    broken,
    { fix = "Give me access there first." } = {},
) =>
    `${broken
        .map(({ end, name }) =>
            end === "source"
                ? `I still cannot read ${name}`
                : `I still cannot post in ${name}`,
        )
        .join(", and ")}. ${fix}`;

/** What a post verdict proves about being in the chat at all, which is all a
 * source needs; `undefined` proves nothing. An admin that cannot post still
 * sees every message — except in a channel it is only a member of. */
export function canRead(verdict) {
    if (!verdict || verdict.status === "unprovable") return undefined;
    if (ABSENT.includes(verdict.status)) return false;
    return verdict.status !== "not_admin";
}

export const isStopped = (status) =>
    status !== "active" && status !== "paused" && status in ROUTE_STATUS;

// One message failed, not the route. Checked first, or "not enough rights to
// send photos" would match the text-rights rule below.
const CONTENT = [
    /not enough rights to send (photos|videos|video notes|documents|audios|voice messages|stickers|animations|games|polls|dice)/i,
    /message (text is empty|is too long)/i,
    /entities too long/i,
    /(wrong file identifier|invalid file id|file is too big)/i,
    /failed to get HTTP URL content/i,
    /message to (copy|forward) not found/i,
    /MESSAGE_ID_INVALID/i,
    /reply message not found/i,
];

const PERMANENT = [
    { test: /bot was kicked from/i, status: "removed" },
    { test: /bot is not a member of/i, status: "removed" },
    { test: /bot was blocked by the user/i, status: "blocked" },
    {
        test: /bot can't initiate conversation with a user/i,
        status: "never_messaged",
    },
    { test: /bot can't send messages to bots/i, status: "is_bot" },
    { test: /user is deactivated/i, status: "deactivated" },
    { test: /chat not found/i, status: "gone" },
    { test: /PEER_ID_INVALID/i, status: "gone" },
    { test: /group (chat was deactivated|is deactivated)/i, status: "gone" },
    { test: /CHAT_WRITE_FORBIDDEN/i, status: "no_rights" },
    { test: /have no rights to send a message/i, status: "no_rights" },
    { test: /not enough rights to send text messages/i, status: "no_rights" },
    { test: /need administrator rights/i, status: "not_admin" },
    { test: /CHAT_ADMIN_REQUIRED/i, status: "not_admin" },
];

/**
 * `{ kind: 'permanent' | 'migrate' | 'transient', retryAfter? }`. Anything not
 * recognised is transient: stopping a working route on an unknown string is
 * the worse error.
 */
export function classify(err) {
    const description = err?.description;
    // Flood control says exactly how long to wait; the caller decides whether
    // the wait is worth it.
    const retryAfter = err?.parameters?.retry_after;
    if (typeof description !== "string")
        return { kind: "transient", retryAfter };

    const migrateTo = err.parameters?.migrate_to_chat_id;
    if (migrateTo) return { kind: "migrate", toChatId: migrateTo };

    if (CONTENT.some((re) => re.test(description)))
        return { kind: "transient" };

    const hit = PERMANENT.find(({ test }) => test.test(description));
    return hit
        ? { kind: "permanent", status: hit.status }
        : { kind: "transient", retryAfter };
}
