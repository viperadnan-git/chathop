import { caller } from "../lib/endpoint.js";
import * as store from "../lib/store.js";

export default async function (_input, ctx) {
    return { cleared: await store.clearPick((await caller(ctx)).id) };
}
