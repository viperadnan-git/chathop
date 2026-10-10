import { caller } from "../lib/endpoint.js";
import * as store from "../lib/store.js";

export default async function (input, ctx) {
    await caller(ctx, { admin: true });

    await store.setPrivate(input.private === true);
    return { private: await store.isPrivate() };
}
