import { caller, routeList } from "../lib/endpoint.js";
import { refreshFor } from "../lib/refresh.js";

export default async function (input, ctx) {
    const user = await caller(ctx);
    const { updated, failed, revived, stopped } = await refreshFor(
        user.id,
        input?.routeId ? String(input.routeId) : undefined,
    );

    return {
        updated,
        failed,
        revived,
        stopped,
        routes: await routeList(user.id),
    };
}
