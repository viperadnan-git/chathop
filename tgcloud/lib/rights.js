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
export function postVerdict(chatType, member) {
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
            return chatType === "channel"
                ? { ok: false, status: "not_admin" }
                : { ok: true };
        case "restricted":
            return member.can_send_messages
                ? { ok: true }
                : { ok: false, status: "no_rights" };
        default:
            return { ok: false, status: "removed" };
    }
}
