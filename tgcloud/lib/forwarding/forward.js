import { api } from "sdk";
import { hasCaptionTransform, parseConfig } from "../config.js";
import { classify } from "../health.js";
import { pooled } from "../pool.js";
import * as store from "../store.js";
import { mediaKind, passes } from "./filters.js";
import { applyCaption, clamp } from "./transforms.js";

const TEXT_LIMIT = 4096;
const CAPTION_LIMIT = 1024;

// The kinds Telegram lets a caption ride on. A sticker, poll or dice has no
// caption to transform, and sending the field with one is refused.
const CAPTIONABLE = new Set([
    "photo",
    "video",
    "animation",
    "audio",
    "document",
    "voice",
    "paid_media",
]);

// ponytail: one message per invocation, so an album arrives as separate copies
// rather than a group — the parts land in different invocations and there is no
// process to hold them. Upgrade path: buffer parts in a table keyed by
// media_group_id and flush on the tenth part.

const contentOf = (msg) => ({
    text: msg.text ?? msg.caption ?? "",
    entities: msg.entities ?? msg.caption_entities ?? [],
});

const transformed = (config, msg, limit) =>
    clamp(applyCaption(config.caption, contentOf(msg)), limit);

async function deliver(config, destChatId, sourceChatId, msg) {
    const common = {
        chat_id: destChatId,
        protect_content: config.protectContent,
        disable_notification: config.silent,
    };

    if (config.mode === "forward") {
        await api.forwardMessage({
            ...common,
            from_chat_id: sourceChatId,
            message_id: msg.message_id,
        });
        return true;
    }

    const copy = {
        ...common,
        from_chat_id: sourceChatId,
        message_id: msg.message_id,
    };
    const reply_markup = config.removeButtons ? undefined : msg.reply_markup;

    const isText = msg.text !== undefined;
    // "Remove caption" is about media: a text message has no caption, and
    // stripping it would drop the message rather than send it.
    const effective =
        isText && config.caption.strip
            ? { ...config, caption: { ...config.caption, strip: false } }
            : config;

    const transformable = isText || CAPTIONABLE.has(mediaKind(msg));
    if (!transformable || !hasCaptionTransform(effective)) {
        await api.copyMessage({ ...copy, reply_markup });
        return true;
    }

    if (isText) {
        // copyMessage's caption is media-only, so text has to be re-sent.
        const out = transformed(effective, msg, TEXT_LIMIT);
        if (!out.text) return false; // nothing left to send
        await api.sendMessage({
            ...common,
            text: out.text,
            entities: out.entities,
            reply_markup,
        });
        return true;
    }

    const out = transformed(effective, msg, CAPTION_LIMIT);
    await api.copyMessage({
        ...copy,
        caption: out.text,
        caption_entities: out.entities,
        reply_markup,
    });
    return true;
}

async function onFailure(config, route, sourceChatId, msg, error) {
    const verdict = classify(error);

    if (verdict.kind === "permanent") {
        await store.stopRoute(route.id, verdict.status);
        console.warn(`route ${route.id} stopped: ${verdict.status}`);
        return;
    }

    // ponytail: a transient failure loses the message. The isolate has no
    // timer to wait out flood control with (no setTimeout, no scheduler), so
    // the upgrade path is a pending-sends table drained by a later update.
    if (verdict.kind === "transient") {
        if (verdict.retryAfter)
            console.warn(
                `route ${route.id}: flood control, retry after ${verdict.retryAfter}s`,
            );
        return;
    }

    if (verdict.kind === "migrate") {
        // The error carries the new id but not which of the two chats moved, and
        // the send touched both. Rewriting the wrong one would point every route
        // at the source, so ask Telegram which id actually changed.
        const moved = await whichMoved(sourceChatId, route.destChatId);
        if (!moved) return;

        await store.migrateChat(moved.from, moved.to);
        // A moved source is not retried: this update belongs to the old chat,
        // and the new one delivers its own.
        if (moved.from === route.destChatId)
            return deliver(config, moved.to, sourceChatId, msg);
    }
}

async function whichMoved(sourceChatId, destChatId) {
    for (const id of [destChatId, sourceChatId]) {
        try {
            const chat = await api.getChat({ chat_id: id });
            if (chat.id !== id) return { from: id, to: chat.id };
        } catch {
            // Unreachable tells us nothing about which one moved; try the other.
        }
    }
    return undefined;
}

// Joins, leaves, pins, renames and the rest. Telegram cannot copy or forward
// them, so they would only ever be a failed call per destination.
const SERVICE_FIELDS = [
    "migrate_to_chat_id",
    "migrate_from_chat_id",
    "new_chat_members",
    "left_chat_member",
    "new_chat_title",
    "new_chat_photo",
    "delete_chat_photo",
    "group_chat_created",
    "supergroup_chat_created",
    "channel_chat_created",
    "message_auto_delete_timer_changed",
    "pinned_message",
    "successful_payment",
    "users_shared",
    "chat_shared",
    "proximity_alert_triggered",
    "forum_topic_created",
    "forum_topic_edited",
    "forum_topic_closed",
    "forum_topic_reopened",
    "general_forum_topic_hidden",
    "general_forum_topic_unhidden",
    "write_access_allowed",
    "passport_data",
    "refunded_payment",
    "video_chat_scheduled",
    "video_chat_started",
    "video_chat_ended",
    "video_chat_participants_invited",
    "web_app_data",
    "boost_added",
    "chat_background_set",
    "giveaway_created",
    "giveaway_completed",
];

const isServiceMessage = (msg) => SERVICE_FIELDS.some((field) => field in msg);

export async function fanOut(msg) {
    if (isServiceMessage(msg)) return;
    // The bot never sees its own messages, so the only way its output can come
    // back as an update is Telegram echoing a channel post into the linked
    // discussion group. Dropping that echo makes a forwarding loop impossible.
    // ponytail: blunt — it also drops echoes a group route might legitimately
    // want. Route the channel itself instead; narrow this to cycle detection
    // only if someone actually needs the echo.
    if (msg.is_automatic_forward) return;

    const sourceChatId = msg.chat.id;
    const routes = await store.activeRoutes(sourceChatId);
    if (routes.length === 0) return;

    const delivered = [];

    await pooled(routes, async (route) => {
        const config = parseConfig(route.config);
        if (!passes(config, msg)) return;

        try {
            if (await deliver(config, route.destChatId, sourceChatId, msg))
                delivered.push(route.id);
        } catch (error) {
            console.warn(
                `forward ${sourceChatId}:${msg.message_id} -> ${route.destChatId} failed: ` +
                    (error?.description ?? error?.message),
            );
            const retried = await onFailure(
                config,
                route,
                sourceChatId,
                msg,
                error,
            ).catch((err) =>
                console.error(`could not act on failure: ${err.message}`),
            );
            if (retried) delivered.push(route.id);
        }
    });

    await store.countForwarded(delivered);
}
