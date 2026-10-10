import { caller, routeList } from "../lib/endpoint.js";

export default async function (_input, ctx) {
    const user = await caller(ctx);
    return { routes: await routeList(user.id) };
}
