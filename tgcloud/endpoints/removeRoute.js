import { caller, ownedRoute } from "../lib/endpoint.js";
import * as store from "../lib/store.js";

export default async function (input, ctx) {
    const user = await caller(ctx);
    const route = await ownedRoute(user.id, input.id);

    await store.deleteRoutesFrom(user.id, route.sourceChatId, route.destChatId);
    return { removed: true };
}
