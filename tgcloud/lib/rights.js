export function isPresent(member) {
    switch (member?.status) {
        case "creator":
        case "administrator":
        case "member":
            return true;
        case "restricted":
            return member.is_member === true;
        default:
            return false;
    }
}

/**
 * The same answer read for posting.
 *
 * `undefined` means unsettled: only a send proves anything about a private chat.
 */
export function postVerdict(chatType, member, chat) {
    if (chatType === "private") return undefined;

    switch (member?.status) {
        case "creator":
            return { ok: true };
        case "administrator":
            // Only a channel distinguishes posting from the other admin rights.
            return chatType === "channel" && !member.can_post_messages
                ? { ok: false, status: "no_rights" }
                : { ok: true };
        case "member":
            if (chatType === "channel")
                return { ok: false, status: "not_admin" };
            // A group's own defaults decide for a plain member, when a full
            // getChat brought them.
            return chat?.permissions?.can_send_messages === false
                ? { ok: false, status: "no_rights" }
                : { ok: true };
        case "restricted":
            return member.can_send_messages
                ? { ok: true }
                : { ok: false, status: "no_rights" };
        default:
            return { ok: false, status: "removed" };
    }
}
