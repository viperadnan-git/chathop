import { api } from "sdk";
import { NAME, SHORT } from "./about.js";
import { settingsButton } from "./app.js";
import { resolveChat, resolveChatId } from "./chatref.js";
import { createForward } from "./forwards.js";
import { statusLabel } from "./health.js";
import { describeUser, findToken, HAND_OVER, isOurToken } from "./ownership.js";
import { capturePhoto } from "./photos.js";
import { refreshFor } from "./refresh.js";
import * as store from "./store.js";
import { chatTitle, escapeHtml } from "./text.js";

const send = (chat_id, text, extra = {}) =>
    api.sendMessage({ chat_id, text, parse_mode: "HTML", ...extra });

function welcome(unclaimed) {
    return [
        `<b>${NAME}</b>`,
        SHORT,
        "",
        "<b>Start here</b>",
        "Tap the button below, or send /set to choose the two chats.",
        "",
        "<i>/help lists everything I can do.</i>",
        ...(unclaimed
            ? [
                  "",
                  "<i>Nobody runs this bot yet. /claim takes charge of it.</i>",
              ]
            : []),
    ].join("\n");
}

function help(isAdmin) {
    const sections = [
        ["", [`<b>${NAME}</b>`, SHORT]],
        ["What you can do", listed(false)],
        [
            "Naming a chat",
            [
                "An id, an @username, or a t.me link — including a link to a message, which gives the chat it is in.",
                "I have to be in both chats, and you have to be an admin of the one I send into.",
            ],
        ],
    ];

    if (isAdmin) {
        sections.push([
            "You run this bot",
            [
                ...listed(true),
                "",
                "<i>Take it back any time with /claim and this bot's token from @BotFather.</i>",
            ],
        ]);
    }

    return sections
        .map(
            ([title, lines]) =>
                (title ? `<b>${title}</b>\n` : "") + lines.join("\n"),
        )
        .join("\n\n");
}

const cannotUse = (raw, why) =>
    `Could not use <code>${escapeHtml(raw)}</code>: ${escapeHtml(why)}`;

async function claimChat(raw) {
    const resolved = await resolveChat(raw);
    if (!resolved.ok)
        return {
            ok: false,
            error: cannotUse(raw, resolved.error),
        };

    await capturePhoto(resolved.chat, await store.saveChat(resolved.chat));
    return { ok: true, chat: resolved.chat };
}

async function cmdSet({ userId, chatId, args }) {
    const [from, to] = args.split(/\s+/, 2);

    if (!from || !to) {
        await send(
            chatId,
            [
                from
                    ? "Two chats are needed."
                    : "Name the chat to forward from, then the one to forward to.",
                "<pre>/set (source) (destination)</pre>",
                "Either can be an id, an @username or a t.me link:",
                "<pre>/set @my_channel -1001234567890</pre>",
                "",
                "<i>Or tap below to choose both from a list instead.</i>",
            ].join("\n"),
            { reply_markup: await settingsButton("Choose from a list") },
        );
        return;
    }

    const source = await claimChat(from);
    if (!source.ok) return send(chatId, source.error);

    const dest = await claimChat(to);
    if (!dest.ok) return send(chatId, dest.error);

    const made = await createForward(userId, source.chat, dest.chat);
    await send(chatId, forwardReply(made, source.chat, dest.chat));
}

function forwardReply(made, source, dest) {
    const from = `<b>${escapeHtml(chatTitle(source))}</b>`;
    const to = `<b>${escapeHtml(chatTitle(dest))}</b>`;

    if (made.ok) {
        return made.created
            ? `Forwarding ${from} → ${to}.`
            : `${from} → ${to} was already set.`;
    }
    if (made.code === "SAME_CHAT") return "A chat cannot forward to itself.";
    return made.end === "source"
        ? `Cannot forward out of ${from}: ${escapeHtml(made.why)}.`
        : `Cannot forward into ${to}: ${escapeHtml(made.why)}.`;
}

async function cmdCancel({ userId, chatId }) {
    const dropped = await store.clearPick(userId);
    await send(chatId, dropped ? "Stopped." : "Nothing to stop.");
}

async function cmdGet({ userId, chatId, args }) {
    let sourceId;
    if (args) {
        const source = await resolveChatId(args);
        if (!source.ok) return send(chatId, cannotUse(args, source.error));
        sourceId = source.id;
    }

    const all = await store.listRoutesWithNames(userId);
    const routes = sourceId
        ? all.filter((r) => r.sourceChatId === sourceId)
        : all;
    if (routes.length === 0) {
        return send(
            chatId,
            args
                ? "Nothing is forwarded from that chat yet."
                : "You have no forwards yet. Add one with /set.",
        );
    }

    const lines = [];
    let current;
    for (const route of routes) {
        if (route.sourceChatId !== current) {
            current = route.sourceChatId;
            lines.push(`\n<b>${escapeHtml(route.sourceName)}</b>`);
        }
        const state =
            route.status === "active"
                ? ""
                : ` — <i>${escapeHtml(statusLabel(route.status))}</i>`;
        lines.push(
            `  → ${escapeHtml(route.destName)} (${route.forwarded})${state}`,
        );
    }

    await send(chatId, lines.join("\n").trim());
}

async function cmdRm({ userId, chatId, args }) {
    const [from, to] = args.split(/\s+/, 2);
    if (!from) {
        await send(
            chatId,
            "Which chat?\n<pre>/rm (source) (destination)</pre>",
        );
        return;
    }

    // No rights check, and no getChat for a plain id: removing your own route is
    // always allowed, and a route most needs removing once its chat has gone.
    const source = await resolveChatId(from);
    if (!source.ok) return send(chatId, cannotUse(from, source.error));

    let destId;
    if (to) {
        const dest = await resolveChatId(to);
        if (!dest.ok) return send(chatId, cannotUse(to, dest.error));
        destId = dest.id;
    }

    const n = await store.deleteRoutesFrom(userId, source.id, destId);
    await send(
        chatId,
        n === 0
            ? "There was nothing to remove."
            : `Removed ${n} destination${n === 1 ? "" : "s"}.`,
    );
}

async function cmdReload({ userId, chatId }) {
    const routes = await store.listRoutes(userId);
    if (routes.length === 0)
        return send(
            chatId,
            "You have no forwards yet, so there is nothing to refresh.",
        );

    const { total, updated, revived, unreachable } = await refreshFor(userId);

    const lines = [`Refreshed ${updated} of ${total} chat names.`];
    if (revived) {
        lines.push(
            revived === 1
                ? "One stopped forward works again and is back on."
                : `${revived} stopped forwards work again and are back on.`,
        );
    }
    if (unreachable.length) {
        const names = await Promise.all(
            unreachable.map((id) => store.chatLabel(id)),
        );
        lines.push(
            `Could not reach: ${names.map((n) => escapeHtml(n)).join(", ")}.`,
        );
    }
    await send(chatId, lines.join("\n"));
}

async function cmdPrivate({ chatId, args }) {
    const arg = args.trim().toLowerCase();
    if (arg !== "on" && arg !== "off") {
        const on = await store.isPrivate();
        return send(
            chatId,
            `This bot is <b>${on ? "private" : "open to everyone"}</b>.\n<pre>/private on|off</pre>`,
        );
    }

    await store.setPrivate(arg === "on");
    await send(
        chatId,
        arg === "on"
            ? "This bot is now yours alone. Other people can no longer use it, and their routes have gone quiet — turning this off brings them back."
            : "This bot is open to everyone again.",
    );
}

async function cmdTransfer({ userId, chatId, args }) {
    const id = Number(args.trim());
    if (!Number.isSafeInteger(id) || id <= 0) {
        await send(
            chatId,
            "A numeric user id is needed.\n<pre>/transfer 123456789</pre>",
        );
        return;
    }
    if (id === userId) {
        await send(chatId, "You already run this bot.");
        return;
    }

    const who = await describeUser(id);
    const warning = who.known
        ? ""
        : "\n\n<i>They have never messaged me, so I cannot tell them — and if the id is " +
          "wrong, nobody will be able to.</i>";

    await send(
        chatId,
        `Hand this bot over to <b>${escapeHtml(who.name)}</b> (<code>${id}</code>)?\n\n` +
            "<i>You lose /private and /transfer. You can take it back with /claim and this " +
            "bot's token from @BotFather.</i>" +
            warning,
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "Hand over",
                            callback_data: `${HAND_OVER}${id}`,
                        },
                        { text: "Cancel", callback_data: `${HAND_OVER}cancel` },
                    ],
                ],
            },
        },
    );
}

async function cmdClaim({ userId, chatId, args, msg }) {
    const token = findToken(args);

    if (token) {
        // A live credential sitting in the chat history.
        await api
            .deleteMessage({ chat_id: chatId, message_id: msg.message_id })
            .catch(() => {});

        if (!(await isOurToken(token))) {
            await send(chatId, "That is not my token.");
            return;
        }
        await store.setAdmin(userId);
        await send(chatId, "You run this bot now.");
        return;
    }

    if (args.trim()) {
        await send(
            chatId,
            "That does not look like a bot token. It reads like <code>123456789:AA-Hh…</code>",
        );
        return;
    }

    const admin = await store.getAdmin();
    if (admin === undefined) {
        await store.setAdmin(userId);
        await send(chatId, "Nobody was running this bot, so you do now.");
        return;
    }
    if (admin === userId) {
        await send(chatId, "You already run this bot.");
        return;
    }

    await send(
        chatId,
        "Someone else runs this bot.\n\n" +
            "<i>If it is yours, send /claim followed by its token from @BotFather — holding the " +
            "token is the proof. I delete the message straight away.</i>",
    );
}

async function cmdStart({ chatId }) {
    // The same memoised read the dispatcher already made.
    const unclaimed = (await store.getAdmin()) === undefined;
    await send(chatId, welcome(unclaimed), {
        reply_markup: await settingsButton(),
    });
}

async function cmdHelp({ chatId, isAdmin }) {
    await send(chatId, help(isAdmin), { reply_markup: await settingsButton() });
}

async function cmdSettings({ chatId }) {
    await send(
        chatId,
        "Everything you can set up, by tapping instead of typing.",
        {
            reply_markup: await settingsButton(),
        },
    );
}

/**
 * Every command, and the only list of them: /help and the Telegram menu are
 * both read off this.
 *
 *   run        what it does, given the context below
 *   describe   the line Telegram shows in the menu; absent means not listed
 *   help       the forms to document, `[args, what]`; defaults to describe
 *   admin      only whoever runs the bot
 *   always     runs even when the bot is private and the caller is not admin
 */
const COMMANDS = {
    settings: { run: cmdSettings, describe: "Open the app" },
    set: {
        run: cmdSet,
        describe: "Add a forward",
        help: [
            ["", "pick the two chats from a list"],
            ["(source) (destination)", "add one without the picker"],
        ],
    },
    get: {
        run: cmdGet,
        describe: "List your forwards",
        help: [["(source)", "list your destinations, or /get for all of them"]],
    },
    rm: {
        run: cmdRm,
        describe: "Remove a forward",
        help: [
            ["(source) (destination)", "remove one, or /rm (source) for all"],
        ],
    },
    reload: {
        run: cmdReload,
        describe: "Refresh names, and retry anything stopped",
    },
    cancel: { run: cmdCancel, describe: "Stop a half-finished /set" },
    help: { run: cmdHelp, describe: "How it works" },
    start: { run: cmdStart },
    private: {
        run: cmdPrivate,
        admin: true,
        help: [
            ["on|off", "keep it to yourself; everyone else's forwards pause"],
        ],
    },
    transfer: {
        run: cmdTransfer,
        admin: true,
        help: [["(user id)", "hand it over, after confirming"]],
    },
    // How someone becomes the admin, so it cannot require being one — and it
    // has to work in private mode, or a bot handed to the wrong id is lost.
    claim: { run: cmdClaim, always: true },
};

export const menuCommands = () =>
    Object.entries(COMMANDS)
        .filter(([, spec]) => spec.describe)
        .map(([command, spec]) => ({ command, description: spec.describe }));

const forms = (name, spec) =>
    (spec.help ?? [["", spec.describe.toLowerCase()]]).map(
        ([args, what]) => `/${name}${args ? ` ${args}` : ""} — ${what}`,
    );

const listed = (admin) =>
    Object.entries(COMMANDS)
        .filter(
            ([, spec]) =>
                !!spec.admin === admin && (spec.describe || spec.help),
        )
        .flatMap(([name, spec]) => forms(name, spec));

export async function handleCommand(msg) {
    const text = msg.text ?? "";
    if (!text.startsWith("/")) return false;

    const [word, ...rest] = text.split(/\s+/);
    const name = word.split("@")[0].slice(1).toLowerCase();
    // hasOwn: `/constructor` and `/__proto__` otherwise resolve to inherited
    // properties and the dispatch below calls a `run` that is not there.
    const spec = Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : undefined;
    if (!spec) return false;

    const userId = msg.from?.id;
    if (!userId) return false;
    const chatId = msg.chat.id;

    const admin = await store.getAdmin();
    const isAdmin = userId === admin;

    if (!spec.always && !isAdmin && (await store.isPrivate())) {
        await send(chatId, "This bot is private.");
        return true;
    }
    if (spec.admin && !isAdmin) {
        await send(chatId, "Only whoever runs this bot can do that.");
        return true;
    }

    await spec.run({
        userId,
        chatId,
        args: rest.join(" ").trim(),
        msg,
        isAdmin,
    });
    return true;
}
