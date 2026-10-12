import { db } from "sdk";
import { and, eq, inArray, sql } from "sdk/db";
import { chats, picker, routes, settings } from "../schema.js";
import { ABSENT, brokenEnds } from "./health.js";
import { newId } from "./id.js";
import { chatTitle } from "./text.js";

// --- settings --------------------------------------------------------------

export async function getSetting(key) {
    const row = await db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .get();
    return row?.value;
}

export async function setSetting(key, value) {
    accessMemo = undefined;
    await db
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } })
        .run();
}

export const botFacts = async () => (await access()).me;

export const saveBotFacts = (facts) => setSetting("me", JSON.stringify(facts));

// Nothing survives an invocation, so this cannot go stale between requests.
let accessMemo;

export function access() {
    // The promise, not the value: concurrent callers share the one query.
    accessMemo ??= readAccess().catch((error) => {
        accessMemo = undefined;
        throw error;
    });
    return accessMemo;
}

async function readAccess() {
    // 'me' rides along: every launch wants it too, and it is the same table.
    const rows = await db.all(
        "SELECT key, value FROM settings WHERE key IN ('private', 'admin', 'me')",
    );
    const value = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
        private: value.private === "1",
        admin: value.admin === undefined ? undefined : Number(value.admin),
        me: value.me ? safeParse(value.me) : undefined,
    };
}

export async function getAdmin() {
    return (await access()).admin;
}

export const setAdmin = (userId) => setSetting("admin", String(userId));

export const isPrivate = async () => (await access()).private;

export const setPrivate = (on) => setSetting("private", on ? "1" : "0");

// --- chats -----------------------------------------------------------------

export async function saveChat(chat) {
    const row = {
        chatId: chat.id,
        title: chatTitle(chat, null),
        username: chat.username ?? null,
        type: chat.type ?? null,
    };
    // No photo columns, so the upsert leaves a stored avatar alone — and
    // answers with it, which saves capturePhoto a read.
    const [back] = await db
        .insert(chats)
        .values(row)
        .onConflictDoUpdate({ target: chats.chatId, set: row })
        .returning({ photoId: chats.photoId })
        .run();
    return back?.photoId ?? null;
}

/**
 * Merges rather than replaces: a rename and a demotion arrive as different
 * updates. json_patch drops any key given as null.
 */
async function noteChat(chatId, patch) {
    if (!patch) return;
    await db.run(
        `UPDATE chats SET facts = json_patch(coalesce(facts, '{}'), :patch)
      WHERE chat_id = :chat`,
        {
            ":patch": JSON.stringify({
                ...patch,
                at: Math.floor(Date.now() / 1000),
            }),
            ":chat": chatId,
        },
    );
}

export const notePostRights = (chatId, verdict) =>
    verdict &&
    verdict.status !== "unprovable" &&
    noteChat(chatId, {
        canPost: verdict.ok,
        block: verdict.ok ? null : (verdict.status ?? null),
    });

export async function savePhoto(chatId, photoId, photo) {
    await db
        .update(chats)
        .set({ photoId, photo })
        .where(eq(chats.chatId, chatId))
        .run();
}

export async function chatPhotoIds(chatIds) {
    if (!chatIds.length) return [];
    return db
        .select({ chatId: chats.chatId, photoId: chats.photoId })
        .from(chats)
        .where(inArray(chats.chatId, chatIds))
        .all();
}

export async function chatPhotoBytes(chatIds) {
    if (!chatIds.length) return [];
    return db
        .select({
            chatId: chats.chatId,
            photo: chats.photo,
            photoId: chats.photoId,
        })
        .from(chats)
        .where(inArray(chats.chatId, chatIds))
        .all();
}

// Never `select()`: that would carry every avatar out to label a list.
const NAMES = {
    chatId: chats.chatId,
    title: chats.title,
    username: chats.username,
};

// What judging a route's ends needs on top of a label.
const ENDS = { ...NAMES, type: chats.type, facts: chats.facts };

const chatName = (chat, chatId) =>
    chat?.title || (chat?.username ? `@${chat.username}` : String(chatId));

export async function chatLabel(chatId) {
    const chat = await db
        .select(NAMES)
        .from(chats)
        .where(eq(chats.chatId, chatId))
        .get();
    return chatName(chat, chatId);
}

// --- the chat picker's scratch pad --------------------------------------

/** An abandoned pick should not greet someone days later. */
const PICK_TTL_MS = 30 * 60 * 1000;

const touch = (userId, set) =>
    db
        .insert(picker)
        .values({ userId, ...set, updatedAt: new Date() })
        .onConflictDoUpdate({
            target: picker.userId,
            set: { ...set, updatedAt: new Date() },
        })
        .run();

export const setPick = (userId, role, chat, name) =>
    touch(
        userId,
        role === "source"
            ? { sourceChatId: chat.id, sourceName: name, error: null }
            : { destChatId: chat.id, destName: name, error: null },
    );

/** Opening the picker forgets that end; re-picking it would otherwise be
 * no change at all, and the app would wait for ever. */
export const clearRole = (userId, role) =>
    touch(
        userId,
        role === "source"
            ? { sourceChatId: null, sourceName: null, error: null }
            : { destChatId: null, destName: null, error: null },
    );

export const failPick = (userId, error) => touch(userId, { error });

export async function clearPick(userId) {
    const gone = await db
        .delete(picker)
        .where(eq(picker.userId, userId))
        .returning()
        .run();
    return gone.length > 0;
}

export async function readPick(userId) {
    const row = await db
        .select()
        .from(picker)
        .where(eq(picker.userId, userId))
        .get();
    if (!row) return undefined;
    if (Date.now() - new Date(row.updatedAt).getTime() > PICK_TTL_MS) {
        await clearPick(userId);
        return undefined;
    }
    return row;
}

// --- routes ----------------------------------------------------------------

/** The hot path: one query per message, so private mode is folded in. */
export async function activeRoutes(sourceChatId) {
    const rows = await db.all(
        `SELECT r.id            AS id,
            r.user_id       AS userId,
            r.dest_chat_id  AS destChatId,
            r.config        AS config
       FROM routes r
      WHERE r.source_chat_id = :chat
        AND r.status = 'active'
        -- In private mode only the admin's routes fire. A stranger's go quiet
        -- rather than being deleted, so unlocking restores them.
        AND ((SELECT value FROM settings WHERE key = 'private') IS NOT '1'
             OR r.user_id = CAST((SELECT value FROM settings WHERE key = 'admin') AS INTEGER))`,
        { ":chat": sourceChatId },
    );

    return rows.map((row) => ({
        ...row,
        config:
            typeof row.config === "string" ? safeParse(row.config) : row.config,
    }));
}

const safeParse = (text) => {
    try {
        return JSON.parse(text);
    } catch {
        return {};
    }
};

export async function listRoutes(userId) {
    return db
        .select()
        .from(routes)
        .where(eq(routes.userId, userId))
        .orderBy(routes.sourceChatId, routes.id)
        .all();
}

/** Two lookups rather than a self-join: `sdk/db` documents no `alias`. */
export async function listRoutesWithNames(userId) {
    const rows = await listRoutes(userId);
    if (rows.length === 0) return [];

    const ids = [
        ...new Set(rows.flatMap((r) => [r.sourceChatId, r.destChatId])),
    ];
    const known = await db
        .select(ENDS)
        .from(chats)
        .where(inArray(chats.chatId, ids))
        .all();
    const byId = new Map(known.map((c) => [c.chatId, c]));
    const name = (id) => chatName(byId.get(id), id);

    return rows.map((r) => ({
        ...r,
        sourceName: name(r.sourceChatId),
        destName: name(r.destChatId),
        broken: brokenEnds(
            byId.get(r.sourceChatId),
            byId.get(r.destChatId),
        ).map((end) => {
            const id = end === "source" ? r.sourceChatId : r.destChatId;
            return {
                end,
                chatId: id,
                name: name(id),
                type: byId.get(id)?.type ?? null,
            };
        }),
    }));
}

/** The two chats a route runs between, as the facts recorded for them. */
export async function endsOf(route) {
    const rows = await db
        .select(ENDS)
        .from(chats)
        .where(inArray(chats.chatId, [route.sourceChatId, route.destChatId]))
        .all();
    const byId = new Map(rows.map((c) => [c.chatId, c]));
    return {
        source: byId.get(route.sourceChatId),
        dest: byId.get(route.destChatId),
        name: (id) => chatName(byId.get(id), id),
    };
}

export async function getUserRoute(userId, id) {
    return db
        .select()
        .from(routes)
        .where(and(eq(routes.userId, userId), eq(routes.id, id)))
        .get();
}

export async function createRoute(userId, sourceChatId, destChatId) {
    const existing = await db
        .select()
        .from(routes)
        .where(
            and(
                eq(routes.userId, userId),
                eq(routes.sourceChatId, sourceChatId),
                eq(routes.destChatId, destChatId),
            ),
        )
        .get();
    if (existing) return { created: false, route: existing };

    const [route] = await db
        .insert(routes)
        .values({ id: newId(), userId, sourceChatId, destChatId })
        .returning()
        .run();
    return { created: true, route };
}

/**
 * Would a copy come back round? Across everyone's routes, since a copy
 * landing in a chat is a new message there whoever set the next hop up, and
 * across every status, since a paused route can be resumed.
 */
export async function updateRoute(id, patch) {
    const [row] = await db
        .update(routes)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(routes.id, id))
        .returning()
        .run();
    return row;
}

export const stopRoute = (id, status) => updateRoute(id, { status });

/** Everyone's routes for that chat. Losing the right to send breaks a
 * destination but not a source; losing membership breaks both. */
export async function stopRoutesForChat(chatId, status, scope = "any") {
    const result = await db.run(
        `UPDATE routes SET status = :status, updated_at = unixepoch()
     WHERE status = 'active' AND ${SCOPES[scope]}`,
        { ":chat": chatId, ":status": status },
    );
    return result?.rowsAffected ?? 0;
}

// What being back in a chat contradicts. A route paused by hand stays paused;
// 'gone' is here because a chat never joined answers like one that is gone.
export const CHECKABLE_STOPS = [
    "removed",
    "blocked",
    "no_rights",
    "not_admin",
    "gone",
];

const SCOPES = {
    any: "(dest_chat_id = :chat OR source_chat_id = :chat)",
    source: "source_chat_id = :chat",
    destination: "dest_chat_id = :chat",
};

/** `scope`: reading a source needs membership, posting into a destination
 * needs rights, and only the caller knows which it just established. */
export async function reviveRoutesForChat(
    chatId,
    { scope = "any", statuses = CHECKABLE_STOPS } = {},
) {
    const list = statuses.map((s) => `'${s}'`).join(", ");
    const result = await db.run(
        `UPDATE routes SET status = 'active', updated_at = unixepoch()
     WHERE status IN (${list}) AND ${SCOPES[scope]}
       -- One end being back says nothing about the other. The last verdict
       -- recorded for each does, and an unknown one reads as fine.
       AND coalesce(
             json_extract((SELECT facts FROM chats WHERE chat_id = routes.dest_chat_id),
                          '$.canPost'),
             1) = 1
       AND coalesce(
             json_extract((SELECT facts FROM chats WHERE chat_id = routes.source_chat_id),
                          '$.block'),
             '') NOT IN (${ABSENT.map((s) => `'${s}'`).join(", ")})`,
        { ":chat": chatId },
    );
    return result?.rowsAffected ?? 0;
}

/** `from` guards it: a route paused by hand is never restarted. */
export async function reviveRoutes(ids, from) {
    if (!ids.length) return 0;
    const result = await db
        .update(routes)
        .set({ status: "active", updatedAt: sql`(unixepoch())` })
        .where(and(inArray(routes.id, ids), inArray(routes.status, from)))
        .run();
    return result?.rowsAffected ?? 0;
}

export async function deleteRoutesFrom(userId, sourceChatId, destChatId) {
    const where =
        destChatId === undefined
            ? and(
                  eq(routes.userId, userId),
                  eq(routes.sourceChatId, sourceChatId),
              )
            : and(
                  eq(routes.userId, userId),
                  eq(routes.sourceChatId, sourceChatId),
                  eq(routes.destChatId, destChatId),
              );
    const gone = await db.delete(routes).where(where).returning().run();
    return gone.length;
}

export async function countForwarded(ids) {
    if (!ids.length) return;
    await db
        .update(routes)
        .set({
            forwarded: sql`${routes.forwarded} + 1`,
            lastForwardedAt: sql`(unixepoch())`,
        })
        .where(inArray(routes.id, ids))
        .run();
}

/**
 * `OR REPLACE`: the new id may already have rows — my_chat_member for the
 * supergroup can arrive first — and a collision would otherwise reject the
 * update, leaving half the migration applied on every retry.
 */
export async function migrateChat(fromId, toId) {
    for (const stmt of [
        "UPDATE OR REPLACE routes SET source_chat_id = :to WHERE source_chat_id = :from",
        "UPDATE OR REPLACE routes SET dest_chat_id = :to WHERE dest_chat_id = :from",
        "UPDATE OR REPLACE chats SET chat_id = :to WHERE chat_id = :from",
        "UPDATE picker SET source_chat_id = :to WHERE source_chat_id = :from",
        "UPDATE picker SET dest_chat_id = :to WHERE dest_chat_id = :from",
    ]) {
        await db.run(stmt, { ":to": toId, ":from": fromId });
    }
}
