import { api } from "sdk";
import { botId } from "./app.js";
import { classify } from "./health.js";
import { isPresent, postVerdict } from "./rights.js";
import * as store from "./store.js";

const whyNot = (error) => {
    const description = error?.description ?? error?.message ?? "";
    // "user not found" from getChatMember means not a member, not no account.
    return /user not found|PARTICIPANT_ID_INVALID/i.test(description)
        ? "you are not in that chat"
        : description || "I could not check that chat";
};

async function membership(userId, chatId) {
    try {
        return {
            ok: true,
            member: await api.getChatMember({
                chat_id: chatId,
                user_id: userId,
            }),
        };
    } catch (error) {
        return { ok: false, error: whyNot(error) };
    }
}

export async function canReadFrom(userId, chat) {
    if (chat.id === userId) return { ok: true };

    // Anyone can read a public group or channel. A bare id says nothing, and a
    // stored username can be stale — the chat may have been made private
    // since — so what it is now comes from Telegram.
    const live = chat.type ? chat : await describe(chat.id);
    if (live?.username && live.type !== "private") return { ok: true };

    const found = await membership(userId, chat.id);
    if (!found.ok) return found;
    return isPresent(found.member)
        ? { ok: true }
        : { ok: false, error: "you are not in that chat" };
}

async function describe(chatId) {
    try {
        return await api.getChat({ chat_id: chatId });
    } catch {
        return undefined;
    }
}

export async function canPostTo(userId, chat) {
    if (chat.id === userId) return { ok: true };

    const found = await membership(userId, chat.id);
    if (!found.ok) return found;
    const { status } = found.member;
    return status === "creator" || status === "administrator"
        ? { ok: true }
        : { ok: false, error: "you need to be an admin of that chat" };
}

export async function canBotPost(chat) {
    if (chat.type === "private") return { ok: false, status: "unprovable" };

    let member;
    try {
        member = await api.getChatMember({
            chat_id: chat.id,
            user_id: await botId(),
        });
    } catch (error) {
        // A 429 or a 5xx is not proof of removal: reconcileChat would stop
        // every route through this chat on a failure that says nothing.
        const verdict = classify(error);
        return verdict.kind === "permanent"
            ? { ok: false, status: verdict.status }
            : { ok: false, status: "unprovable" };
    }
    return postVerdict(chat.type, member);
}

export async function botIsIn(chatId) {
    try {
        return isPresent(
            await api.getChatMember({
                chat_id: chatId,
                user_id: await botId(),
            }),
        );
    } catch {
        return false;
    }
}

export async function reconcileChat(chat, verdict) {
    await store.notePostRights(chat.id, verdict);

    if (verdict && !verdict.ok && verdict.status !== "unprovable") {
        // Gone from the chat breaks both ends; present but unable to post
        // breaks only the routes that post into it.
        const gone =
            verdict.status === "removed" || verdict.status === "blocked";
        const stopped = await store.stopRoutesForChat(
            chat.id,
            verdict.status,
            gone ? "any" : "destination",
        );
        if (stopped)
            console.info(
                `chat ${chat.id} ${verdict.status}: ${stopped} stopped`,
            );
        return -stopped;
    }

    // Reading a source needs membership, which getChat answered; posting into
    // a destination needs rights, which only a verdict answers.
    let revived = await store.reviveRoutesForChat(chat.id, {
        scope: "source",
    });
    if (!verdict || verdict.ok || verdict.status === "unprovable") {
        revived += await store.reviveRoutesForChat(chat.id, {
            scope: "destination",
        });
    }
    if (revived) console.info(`chat ${chat.id} is back: ${revived} resumed`);
    return revived;
}
