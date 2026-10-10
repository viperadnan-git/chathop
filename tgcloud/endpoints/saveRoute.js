import { EndpointError } from "sdk";
import {
    configIssue,
    parseConfig,
    replacementIssue,
    ruleIssue,
} from "../lib/config.js";
import { caller, forApp, ownedRoute } from "../lib/endpoint.js";
import * as store from "../lib/store.js";

// Telegram's own caption limit: longer could never be sent whole anyway.
const TEXT_LIMIT = 1024;

function refuse(config) {
    const bad = (issue) => {
        if (issue) throw new EndpointError(issue, { code: "BAD_PATTERN" });
    };

    bad(configIssue(config));

    for (const rule of [
        ...config.filters.whitelist,
        ...config.filters.blacklist,
    ]) {
        bad(ruleIssue(rule));
    }
    for (const rule of config.caption.replace) bad(replacementIssue(rule));
    for (const text of [config.caption.prepend, config.caption.append]) {
        if (text && text.length > TEXT_LIMIT)
            bad(`That text is too long (${TEXT_LIMIT} characters max)`);
    }
}

export default async function (input, ctx) {
    const user = await caller(ctx);
    const route = await ownedRoute(user.id, input.id);

    const patch = {};

    if (input.config !== undefined) {
        const config = parseConfig(input.config);
        refuse(config);
        patch.config = config;
    }

    // A stop reason is the server's to write, never the client's.
    if (input.status === "active" || input.status === "paused")
        patch.status = input.status;

    if (Object.keys(patch).length === 0) {
        throw new EndpointError("Nothing to save.", { code: "EMPTY_PATCH" });
    }

    const updated = await store.updateRoute(route.id, patch);
    return { route: forApp(updated ?? { ...route, ...patch }) };
}
