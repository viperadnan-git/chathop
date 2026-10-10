/**
 * What this bot is, in three lengths. Every screen, every Bot API field and
 * every message picks one of these rather than wording it again.
 *
 * `short` is kept under Telegram's 120-character short_description cap and
 * `about` under the 512 of description.
 */

export const NAME = "chathop";

/** A few words, for a hero beside the name. */
export const TAGLINE = "From one chat to others.";

/** One sentence, for anywhere the bot introduces itself. */
export const SHORT =
    "Forwards messages from one chat to others. Each destination gets its own filters and caption rules.";

/** The full pitch, for the Bot API description and an empty chat. */
export const ABOUT = [
    "I copy new messages from one chat into as many others as you like.",
    "",
    "Each destination has its own rules: which messages get through, and how their text is changed on the way.",
    "",
    "Filter by word, pattern, media type or sender. Add a line above or below, replace words, or strip links.",
    "",
    "Tap Start, then open the app to set one up.",
].join("\n");
