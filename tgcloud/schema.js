import {
    blob,
    index,
    integer,
    json,
    sql,
    table,
    text,
    uniqueIndex,
} from "sdk/db";

// Open to everyone: routes belong to the user who added them, not to the bot.
// `settings.admin` is only whoever administers the bot itself.
// No foreign keys: the runtime runs with them off (see AGENTS.md).
//
// Keeping migrations rare, given what this platform charges for each kind:
//   new table / column / index — safe, applied together, no thought needed
//   dropping anything          — `.deprecated()`, confirmed one at a time
//   changing a column's TYPE   — manual, by hand, with raw SQL
// So: types are the only decisions worth agonising over, and adding later is
// free — which is the reason nothing here is pre-created "for later".
//   1. Per-route settings grow inside `config`, never as new columns.
//   2. Any column added later must be nullable or carry a default.
//   3. Anything with an open-ended set of values is TEXT, not an enum.

export const settings = table("settings", {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
});

export const chats = table("chats", {
    chatId: integer("chat_id").primaryKey(),
    title: text("title"),
    username: text("username"),
    type: text("type"),
    photo: blob("photo"),
    photoId: text("photo_id"),
    // What we last learned, beyond name and picture — absent means never:
    //   { canPost, block, at }   can the bot post, why not, when we checked
    // One JSON column by rule 1 above: the set of facts here is open-ended.
    facts: json("facts"),
});

export const picker = table("picker", {
    userId: integer("user_id").primaryKey(),
    sourceChatId: integer("source_chat_id"),
    sourceName: text("source_name"),
    destChatId: integer("dest_chat_id"),
    destName: text("dest_name"),
    error: text("error"),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(
        sql`(unixepoch())`,
    ),
});

export const routes = table(
    "routes",
    {
        // TEXT, not autoincrement: an opaque id can be minted anywhere, and two
        // instances' rows never collide. A type change is the costly migration.
        id: text("id").primaryKey(),
        userId: integer("user_id").notNull(),
        sourceChatId: integer("source_chat_id").notNull(),
        destChatId: integer("dest_chat_id").notNull(),
        config: json("config").notNull().default({}),
        // 'active' | 'paused' | a stopped reason from lib/health.js.
        status: text("status").notNull().default("active"),
        forwarded: integer("forwarded").notNull().default(0),
        lastForwardedAt: integer("last_forwarded_at", { mode: "timestamp" }),
        createdAt: integer("created_at", { mode: "timestamp" }).default(
            sql`(unixepoch())`,
        ),
        updatedAt: integer("updated_at", { mode: "timestamp" }).default(
            sql`(unixepoch())`,
        ),
    },
    (t) => ({
        pair: uniqueIndex("uidx_routes_pair").on(
            t.userId,
            t.sourceChatId,
            t.destChatId,
        ),
        bySource: index("idx_routes_source").on(t.sourceChatId, t.status),
        byUser: index("idx_routes_user").on(t.userId),
    }),
);
