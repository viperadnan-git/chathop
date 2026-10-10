import { EndpointError } from "sdk";
import { botUsername } from "./app.js";
import { parseConfig } from "./config.js";
import { statusLabel } from "./health.js";
import * as store from "./store.js";

export async function caller(ctx, { admin: mustAdmin = false } = {}) {
    const user = ctx.initData?.user;
    if (!user)
        throw new EndpointError("Open this from the bot.", { code: "NO_USER" });

    const { private: locked, admin } = await store.access();
    if (locked && user.id !== admin) {
        throw new EndpointError("This bot is private.", { code: "PRIVATE" });
    }
    if (mustAdmin && user.id !== admin) {
        throw new EndpointError("Only whoever runs this bot can do that.", {
            code: "NOT_ADMIN",
        });
    }
    return user;
}

/**
 * A Date does not survive the bridge — it arrives as `{}` — so every timestamp
 * leaves here as an ISO string, which is what the app's types say anyway.
 */
const iso = (value) => {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "number") return new Date(value * 1000).toISOString();
    return undefined;
};

export const forApp = (route) => ({
    ...route,
    createdAt: iso(route.createdAt),
    updatedAt: iso(route.updatedAt),
    lastForwardedAt: iso(route.lastForwardedAt),
    config: parseConfig(route.config),
    statusLabel: statusLabel(route.status),
});

export async function ownedRoute(userId, id) {
    const route = await store.getUserRoute(userId, String(id ?? ""));
    if (!route)
        throw new EndpointError("That forward no longer exists.", {
            code: "NOT_FOUND",
        });
    return route;
}

export const routeList = async (userId) =>
    (await store.listRoutesWithNames(userId)).map(forApp);

export async function settingsFor(userId) {
    const { private: locked, admin } = await store.access();
    return {
        isAdmin: userId === admin,
        private: locked,
        bot: { username: await botUsername() },
    };
}
