import { api } from "sdk";
import { canBotPost, reconcileChat } from "./access.js";
import { capturePhoto } from "./photos.js";
import * as store from "./store.js";
import { chatTitle, escapeHtml } from "./text.js";

/**
 * The native chat picker. savePreparedKeyboardButton hands the app an id,
 * WebApp.requestChat opens Telegram's list, and the tap arrives here as a
 * `chat_shared` service message — never at the app that opened it.
 *
 * So a tap only records the chat. The app reads it back and creates the
 * route through the same endpoint the typed form uses.
 */

const REQUEST = {
    SOURCE_CHANNEL: 1,
    SOURCE_GROUP: 2,
    DEST_CHANNEL: 3,
    DEST_GROUP: 4,
    // Not a pick at all. `request_chat` grants the rights it asks for, so the
    // same mechanism is how someone puts the bot back into a chat it was
    // removed from or demoted in.
    FIX_CHANNEL: 5,
    FIX_GROUP: 6,
};

const isSourceRequest = (id) =>
    id === REQUEST.SOURCE_CHANNEL || id === REQUEST.SOURCE_GROUP;

const isFixRequest = (id) =>
    id === REQUEST.FIX_CHANNEL || id === REQUEST.FIX_GROUP;

/**
 * `bot_is_member` is ignored for channels — requestPeerTypeBroadcast has no
 * `bot_participant` field. Admin rights are the working filter, and a bot must
 * be an admin to see channel posts anyway.
 */
const adminRights = (extra = {}) => ({
    is_anonymous: false,
    // All-false is rejected with ADMIN_RIGHTS_EMPTY. can_manage_chat is implied
    // by any other privilege, so it means "is an admin" without demanding one.
    can_manage_chat: true,
    can_delete_messages: false,
    can_manage_video_chats: false,
    can_restrict_members: false,
    can_promote_members: false,
    can_change_info: false,
    can_invite_users: false,
    can_post_stories: false,
    can_edit_stories: false,
    can_delete_stories: false,
    ...extra,
});

const IDS = {
    source: [REQUEST.SOURCE_CHANNEL, REQUEST.SOURCE_GROUP],
    destination: [REQUEST.DEST_CHANNEL, REQUEST.DEST_GROUP],
    fix: [REQUEST.FIX_CHANNEL, REQUEST.FIX_GROUP],
};

function button(requestId, channel, role) {
    const rights = adminRights(
        role === "source" ? {} : { can_post_messages: true },
    );
    return {
        text: channel ? "Channel" : "Group",
        request_chat: {
            request_id: requestId,
            chat_is_channel: channel,
            request_title: true,
            request_username: true,
            bot_administrator_rights: rights,
            // Required alongside bot rights, and must be a superset, or Telegram
            // returns USER_RIGHTS_MISSING.
            user_administrator_rights: rights,
        },
    };
}

export async function prepare(userId, role) {
    const [channelId, groupId] = IDS[role];
    const ids = await Promise.all(
        [
            [channelId, true],
            [groupId, false],
        ].map(([requestId, channel]) =>
            api.savePreparedKeyboardButton({
                user_id: userId,
                button: button(requestId, channel, role),
            }),
        ),
    );
    return { channel: ids[0].id, group: ids[1].id };
}

async function repair(chat) {
    await reconcileChat(chat, await canBotPost(chat));
}

export async function handleShared(msg) {
    const shared = msg.chat_shared;
    const userId = msg.from?.id;
    if (!shared || !userId) return undefined;

    const fallback = shared.title ?? shared.username ?? String(shared.chat_id);

    // The picker's rights filter is client-side only, and chat_shared carries
    // no type — so ask Telegram what this actually is before trusting it.
    let chat;
    try {
        chat = await api.getChat({ chat_id: shared.chat_id });
    } catch (error) {
        const why = error?.description ?? "I cannot reach that chat";
        await store.failPick(userId, `${fallback} will not work: ${why}.`);
        return {
            text: `<b>${escapeHtml(fallback)}</b> will not work: ${escapeHtml(why)}.`,
        };
    }

    await capturePhoto(chat, await store.saveChat(chat));

    // A repair, not a pick. my_chat_member reports it too, but only when the
    // membership actually changed — granting a missing right to a bot already
    // in the chat may say nothing. So the repair finishes itself here.
    if (isFixRequest(shared.request_id)) {
        await repair(chat);
        return undefined;
    }

    const role = isSourceRequest(shared.request_id) ? "source" : "destination";
    await store.setPick(userId, role, chat, chatTitle(chat));
    return undefined;
}
