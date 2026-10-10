import { EndpointError } from "sdk";
import { caller } from "../lib/endpoint.js";
import { prepare } from "../lib/picker.js";
import * as store from "../lib/store.js";

const ROLES = ["source", "destination", "fix"];

export default async function (input, ctx) {
    const { role } = input;
    if (!ROLES.includes(role)) {
        throw new EndpointError("Which end of the forward?", {
            code: "BAD_INPUT",
        });
    }
    const user = await caller(ctx);

    // Forgotten first, so the app knows the tap landed when the end fills
    // again — re-picking the same chat changes nothing otherwise.
    if (role !== "fix") await store.clearRole(user.id, role);
    return prepare(user.id, role);
}
