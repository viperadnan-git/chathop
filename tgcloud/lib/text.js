export const escapeHtml = (s) =>
    String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

/** A person's name, which only a private chat has. */
const personName = (chat) =>
    [chat.first_name, chat.last_name].filter(Boolean).join(" ");

/** What to call a chat. `fallback` is what to use when it has no name at all. */
export const chatTitle = (chat, fallback = String(chat.id)) =>
    chat.title || personName(chat) || fallback;
