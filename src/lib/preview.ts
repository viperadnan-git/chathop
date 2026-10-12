import { explain, type Verdict } from "$filters";
import { applyCaption, clamp, type Entity } from "$transforms";
import type { MediaKind, RouteConfig } from "./config-types";

export type Draft = {
    body: string;
    kind: MediaKind;
    fileName?: string;
    sender?: string;
};

export type Preview = {
    verdict: Verdict;
    text: string;
    entities: Entity[];
    /** Nothing is sent at all: a text message the rules emptied out. */
    dropped: boolean;
    forwarded: boolean;
};

const TEXT_LIMIT = 4096;
const CAPTION_LIMIT = 1024;

const NAMED: MediaKind[] = ["document", "video", "audio", "animation"];

// Telegram marks links and @usernames up as entities, and the caption rules
// read those rather than the text. These are the two it would find here.
const URLS = /\bhttps?:\/\/\S+|\b[\w-]+\.(?:com|org|net|io|me|dev)\/\S*/g;
const MENTIONS = /(^|\s)(@[A-Za-z]\w{3,})/g;

export function entitiesOf(text: string): Entity[] {
    const found: Entity[] = [];
    for (const m of text.matchAll(URLS))
        found.push({ type: "url", offset: m.index, length: m[0].length });
    for (const m of text.matchAll(MENTIONS))
        found.push({
            type: "mention",
            offset: m.index + m[1].length,
            length: m[2].length,
        });
    return found.sort((a, b) => a.offset - b.offset);
}

/** The update Telegram would deliver for this draft. */
export function asMessage(draft: Draft, entities = entitiesOf(draft.body)) {
    const who = (draft.sender ?? "").trim().replace(/^@/, "");
    const from = who
        ? /^\d+$/.test(who)
            ? { id: Number(who) }
            : { id: 1, username: who }
        : undefined;
    const base = { chat: { id: 1 }, message_id: 1, from };

    if (draft.kind === "text") return { ...base, text: draft.body, entities };

    const payload = NAMED.includes(draft.kind)
        ? { file_name: draft.fileName || undefined }
        : {};
    return {
        ...base,
        [draft.kind]: draft.kind === "photo" ? [payload] : payload,
        caption: draft.body,
        caption_entities: entities,
    };
}

/** What the route would do with this draft, rules and all. */
export function preview(config: RouteConfig, draft: Draft): Preview {
    const entities = entitiesOf(draft.body);
    const verdict = explain(config, asMessage(draft, entities));
    const forwarded = config.mode === "forward";

    const out = forwarded
        ? { text: draft.body, entities }
        : clamp(
              applyCaption(config.caption, { text: draft.body, entities }),
              draft.kind === "text" ? TEXT_LIMIT : CAPTION_LIMIT,
          );

    return {
        verdict,
        text: out.text,
        entities: out.entities,
        dropped:
            verdict.pass && !forwarded && draft.kind === "text" && !out.text,
        forwarded,
    };
}
