import { applyProfile } from "../lib/profile.js";

/**
 * Applies the bot's public face. Run by `bun run deploy`.
 *
 * No caller check: it takes no input and can only write the profile this
 * code defines.
 */
export default async function () {
    return applyProfile();
}
