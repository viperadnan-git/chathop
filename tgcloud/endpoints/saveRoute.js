import { EndpointError } from "sdk";
import {
    configIssue,
    parseConfig,
    replacementIssue,
    ruleIssue,
} from "../lib/config.js";
import { caller, forApp, ownedRoute } from "../lib/endpoint.js";
import { brokenEnds, isStopped, stuckReason } from "../lib/health.js";
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

    // Switching a stopped route back on claims it is fixed, so check the last
    // known facts before believing it. A paused route was never broken.
    if (patch.status === "active" && isStopped(route.status)) {
        const ends = await store.endsOf(route);
        const broken = brokenEnds(ends.source, ends.dest).map((end) => ({
            end,
            name: ends.name(
                end === "source" ? route.sourceChatId : route.destChatId,
            ),
        }));
        // What is known, not what is true now: nothing tells the bot when a
        // group's own permissions change, so Refresh is the way out.
        if (broken.length)
            throw new EndpointError(
                stuckReason(broken, {
                    fix: "Give me access there, or refresh to check again.",
                }),
                { code: "STILL_BROKEN" },
            );
    }

    if (Object.keys(patch).length === 0) {
        throw new EndpointError("Nothing to save.", { code: "EMPTY_PATCH" });
    }

    const updated = await store.updateRoute(route.id, patch);
    return { route: forApp(updated ?? { ...route, ...patch }) };
}
