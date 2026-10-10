import { EndpointError } from "sdk";
import { caller, forApp, routeList } from "../lib/endpoint.js";
import { createForward } from "../lib/forwards.js";

const REFUSAL = {
    SAME_CHAT: "A chat cannot forward to itself.",
    LOOP: "Those two already forward into each other.",
};

export default async function (input, ctx) {
    const user = await caller(ctx);

    const sourceChatId = Number(input.sourceChatId);
    const destChatId = Number(input.destChatId);
    if (
        !Number.isSafeInteger(sourceChatId) ||
        !Number.isSafeInteger(destChatId)
    ) {
        throw new EndpointError("Find both chats first.", {
            code: "BAD_INPUT",
        });
    }

    const made = await createForward(
        user.id,
        { id: sourceChatId },
        { id: destChatId },
    );
    if (!made.ok) {
        const end = made.end === "source" ? "out of that chat" : "there";
        throw new EndpointError(
            made.why
                ? `Cannot forward ${end}: ${made.why}.`
                : REFUSAL[made.code],
            { code: made.code },
        );
    }
    if (!made.created) {
        throw new EndpointError("You already forward between those two.", {
            code: "DUPLICATE",
        });
    }

    return { route: forApp(made.route), routes: await routeList(user.id) };
}
