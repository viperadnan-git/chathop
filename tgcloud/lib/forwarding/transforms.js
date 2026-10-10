import { matchSpans } from "./regex.js";

// Telegram entity offsets are UTF-16 code units, as are JS string indices.
// Do not introduce a conversion.

const LINK_ENTITIES = new Set(["url", "text_link"]);
const MENTION_ENTITIES = new Set(["mention", "text_mention"]);

function applyEdit(input, edit) {
    const { start, end, replacement } = edit;
    const delta = replacement.length - (end - start);

    const text =
        input.text.slice(0, start) + replacement + input.text.slice(end);

    const entities = [];
    for (const entity of input.entities) {
        const from = entity.offset;
        const to = entity.offset + entity.length;

        let offset;
        let length;

        if (to <= start) {
            offset = from;
            length = entity.length;
        } else if (from >= end) {
            offset = from + delta;
            length = entity.length;
        } else if (from >= start && to <= end) {
            // Before the containment case, so an exact overlap is dropped.
            continue;
        } else if (from <= start && to >= end) {
            offset = from;
            length = entity.length + delta;
        } else if (from < start) {
            offset = from;
            length = start - from;
        } else {
            offset = start + replacement.length;
            length = to - end;
        }

        if (length > 0) entities.push({ ...entity, offset, length });
    }

    return { text, entities };
}

// A literal is a pattern with its specials escaped, so both kinds of
// replacement go through the one matcher — which works in text indices and
// has no folding to get wrong.
const ESCAPE = /[.*+?^${}()|[\]\\]/g;

const spanEdits = (spans, replacement) =>
    spans.map(({ start, end }) => ({ start, end, replacement }));

const ruleEdits = (text, rule) =>
    spanEdits(
        matchSpans(
            rule.isRegex ? rule.pattern : rule.pattern.replace(ESCAPE, "\\$&"),
            text,
            rule.caseSensitive,
        ),
        rule.replacement,
    );

const entitySpanEdits = (entities, types) =>
    entities
        .filter((e) => types.has(e.type))
        .map((e) => ({
            start: e.offset,
            end: e.offset + e.length,
            replacement: "",
        }));

function resolveOverlaps(edits) {
    const sorted = [...edits].sort((a, b) => a.start - b.start);
    const out = [];
    let cursor = -1;
    for (const edit of sorted) {
        if (edit.start >= cursor) {
            out.push(edit);
            cursor = edit.end;
        }
    }
    return out;
}

export function clamp(input, limit) {
    if (input.text.length <= limit) return input;
    // Never between the halves of a surrogate pair: a lone half is not text,
    // and Telegram refuses the whole send.
    const last = input.text.charCodeAt(limit - 1);
    const end = last >= 0xd800 && last <= 0xdbff ? limit - 1 : limit;

    const text = input.text.slice(0, end);
    const entities = input.entities.flatMap((e) =>
        e.offset >= end
            ? []
            : [{ ...e, length: Math.min(e.length, end - e.offset) }],
    );
    return { text, entities };
}

export function applyCaption(caption, input) {
    if (caption.strip) return { text: "", entities: [] };

    const edits = [];
    if (caption.removeLinks)
        edits.push(...entitySpanEdits(input.entities, LINK_ENTITIES));
    if (caption.removeMentions)
        edits.push(...entitySpanEdits(input.entities, MENTION_ENTITIES));
    for (const rule of caption.replace) {
        edits.push(...ruleEdits(input.text, rule));
    }

    // Right to left, so offsets of pending edits stay valid.
    let out = input;
    for (const edit of resolveOverlaps(edits).reverse()) {
        out = applyEdit(out, edit);
    }

    const { prepend, append } = caption;
    if (prepend || append) {
        // Each part on its own line; empty parts are dropped, not left as a blank
        // line — uncaptioned media otherwise leads with a gap.
        const shift = prepend && out.text ? prepend.length + 1 : 0;
        out = {
            text: [prepend, out.text, append].filter(Boolean).join("\n"),
            entities: shift
                ? out.entities.map((e) => ({ ...e, offset: e.offset + shift }))
                : out.entities,
        };
    }

    return out;
}
