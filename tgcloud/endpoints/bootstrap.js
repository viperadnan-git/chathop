import { caller, routeList, settingsFor } from "../lib/endpoint.js";

export default async function (_input, ctx) {
    const user = await caller(ctx);

    const [routes, settings] = await Promise.all([
        routeList(user.id),
        settingsFor(user.id),
    ]);
    return { routes, settings };
}
