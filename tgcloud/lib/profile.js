import { api } from "sdk";
import { ABOUT, SHORT } from "./about.js";
import { miniAppUrl } from "./app.js";
import { menuCommands } from "./commands.js";
import * as store from "./store.js";

// Read off the command table rather than typed again here: the ones worth
// suggesting are the ones that carry a description.
const COMMANDS = menuCommands();

/**
 * Remembers what it applied: these methods are rate limited and a deploy may
 * happen many times an hour.
 */
export async function applyProfile() {
    // getChatMenuButton answers from a cache for a little while after a write,
    // so a read straight back can show the previous label. It did take.
    const menuButton = {
        type: "web_app",
        text: "Settings",
        web_app: { url: await miniAppUrl() },
    };
    const wanted = JSON.stringify({ COMMANDS, SHORT, ABOUT, menuButton });

    if ((await store.getSetting("profile")) === wanted)
        return { applied: false };

    await api.setMyCommands({ commands: COMMANDS });
    await api.setChatMenuButton({ menu_button: menuButton });
    await api.setMyShortDescription({ short_description: SHORT });
    await api.setMyDescription({ description: ABOUT });

    await store.setSetting("profile", wanted);
    return { applied: true, commands: COMMANDS.length, menu: menuButton.text };
}
