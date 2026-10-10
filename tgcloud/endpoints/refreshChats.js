import { caller, routeList } from "../lib/endpoint.js";
import { refreshFor } from "../lib/refresh.js";

export default async function (_input, ctx) {
    const user = await caller(ctx);
    const { updated, failed, revived } = await refreshFor(user.id);

    return { updated, failed, revived, routes: await routeList(user.id) };
}
