// Self-check for the pure logic: entity maths, filters, config, pattern guard.
// Run with `bun test/check.js` (tsconfig paths resolve the bare module names).
// Handlers are checked on the platform instead: `npx tgcloud run handlers/message '{...}'`.

import assert from "node:assert/strict";
import { base64 } from "../tgcloud/lib/base64.js";
import {
    configIssue,
    defaultConfig,
    hasCaptionTransform,
    MAX_RULES,
    parseConfig,
} from "../tgcloud/lib/config.js";
import { mediaKind, passes } from "../tgcloud/lib/forwarding/filters.js";
import { checkPattern } from "../tgcloud/lib/forwarding/regex.js";
import { applyCaption, clamp } from "../tgcloud/lib/forwarding/transforms.js";
import { classify } from "../tgcloud/lib/health.js";
import { isPresent, postVerdict } from "../tgcloud/lib/rights.js";

const caption = (over = {}) => ({ ...defaultConfig().caption, ...over });

// --- entity maths ----------------------------------------------------------

{
    const out = applyCaption(
        caption({
            replace: [
                {
                    pattern: "hello",
                    replacement: "hi",
                    isRegex: false,
                    caseSensitive: true,
                },
            ],
        }),
        {
            text: "hello world",
            entities: [{ type: "bold", offset: 6, length: 5 }],
        },
    );
    assert.equal(out.text, "hi world");
    assert.deepEqual(out.entities, [{ type: "bold", offset: 3, length: 5 }]);
}

{
    const out = applyCaption(
        caption({
            replace: [
                {
                    pattern: "spam",
                    replacement: "",
                    isRegex: false,
                    caseSensitive: true,
                },
            ],
        }),
        {
            text: "a spam b",
            entities: [{ type: "bold", offset: 2, length: 4 }],
        },
    );
    assert.equal(out.text, "a  b");
    assert.deepEqual(out.entities, []);
}

{
    const out = applyCaption(caption({ prepend: "via me" }), {
        text: "hi",
        entities: [{ type: "bold", offset: 0, length: 2 }],
    });
    assert.equal(out.text, "via me\nhi");
    assert.deepEqual(out.entities, [{ type: "bold", offset: 7, length: 2 }]);
}

{
    const out = applyCaption(caption({ removeLinks: true }), {
        text: "see http://x.test now",
        entities: [{ type: "url", offset: 4, length: 13 }],
    });
    assert.equal(out.text, "see  now");
    assert.deepEqual(out.entities, []);
}

{
    const out = clamp(
        { text: "abcdef", entities: [{ type: "bold", offset: 4, length: 2 }] },
        5,
    );
    assert.equal(out.text, "abcde");
    assert.deepEqual(out.entities, [{ type: "bold", offset: 4, length: 1 }]);
}

{
    // The cut must not land between the halves of a surrogate pair: Telegram
    // refuses the whole send over one orphaned half.
    const out = clamp(
        {
            text: `${"a".repeat(1023)}\u{1F600}tail`,
            entities: [{ type: "bold", offset: 1020, length: 5 }],
        },
        1024,
    );
    assert.equal(out.text.length, 1023);
    assert.ok(
        !/[\uD800-\uDBFF]$/.test(out.text),
        "no lone high surrogate at the end",
    );
    assert.deepEqual(out.entities, [{ type: "bold", offset: 1020, length: 3 }]);
}

{
    const out = applyCaption(
        caption({
            replace: [
                {
                    pattern: "AD",
                    replacement: "",
                    isRegex: false,
                    caseSensitive: false,
                },
            ],
        }),
        {
            text: "buy ad now",
            entities: [{ type: "bold", offset: 7, length: 3 }],
        },
    );
    assert.equal(out.text, "buy  now");
    assert.deepEqual(out.entities, [{ type: "bold", offset: 5, length: 3 }]);
}

// --- filters ---------------------------------------------------------------

{
    const msg = { text: "Buy CHEAP pills", chat: { id: 1 }, message_id: 1 };
    const block = parseConfig({
        filters: { blacklist: [{ type: "keyword", value: "cheap" }] },
    });
    assert.equal(passes(block, msg), false, "case-insensitive by default");

    const allow = parseConfig({
        filters: { whitelist: [{ type: "keyword", value: "pills" }] },
    });
    assert.equal(passes(allow, msg), true);

    const both = parseConfig({
        filters: {
            whitelist: [{ type: "keyword", value: "pills" }],
            blacklist: [{ type: "keyword", value: "buy" }],
        },
    });
    assert.equal(passes(both, msg), false);

    assert.equal(
        passes(defaultConfig(), msg),
        true,
        "empty config forwards everything",
    );
}

{
    const photo = { photo: [{ file_id: "x" }], chat: { id: 1 }, message_id: 2 };
    assert.equal(mediaKind(photo), "photo");
    const onlyPhotos = parseConfig({
        filters: { whitelist: [{ type: "media", kinds: ["photo"] }] },
    });
    assert.equal(passes(onlyPhotos, photo), true);
    assert.equal(
        passes(onlyPhotos, { text: "hi", chat: { id: 1 }, message_id: 3 }),
        false,
    );
}

{
    const msg = {
        text: "hi",
        from: { id: 42, username: "Spammer" },
        chat: { id: 1 },
        message_id: 4,
    };
    const byName = parseConfig({
        filters: { blacklist: [{ type: "sender", usernames: ["@SPAMMER"] }] },
    });
    assert.equal(
        passes(byName, msg),
        false,
        "usernames are normalised on both sides",
    );
}

// --- config ----------------------------------------------------------------

{
    const c = parseConfig({
        mode: "nonsense",
        caption: { prepend: "" },
        filters: { blacklist: [{ type: "keyword", value: "  " }] },
    });
    assert.equal(c.mode, "copy", "unknown mode falls back");
    assert.equal(c.caption.prepend, undefined, "empty string means absent");
    assert.deepEqual(
        c.filters.blacklist,
        [],
        "blank rules are dropped, not kept as never-matching",
    );
    assert.equal(hasCaptionTransform(c), false);
    assert.deepEqual(
        parseConfig(null),
        defaultConfig(),
        "a corrupt config falls back rather than going dark",
    );
}

{
    // Case folding can change length, and an index into a folded copy is not
    // an index into the text the entities are measured against.
    const out = applyCaption(
        caption({
            replace: [
                {
                    pattern: "AD",
                    replacement: "X",
                    isRegex: false,
                    caseSensitive: false,
                },
            ],
        }),
        {
            text: "\u0130 buy ad now",
            entities: [{ type: "bold", offset: 9, length: 3 }],
        },
    );
    assert.equal(
        out.text,
        "\u0130 buy X now",
        "a wider-folding character earlier in the text must not shift the match",
    );
    assert.deepEqual(out.entities, [{ type: "bold", offset: 8, length: 3 }]);
}

{
    const replace = (over) =>
        caption({ replace: [{ pattern: "a.b", replacement: "X", ...over }] });
    const run = (over, text) =>
        applyCaption(replace(over), { text, entities: [] }).text;

    assert.equal(run({ caseSensitive: false }, "A.B a.b"), "X X");
    assert.equal(run({ caseSensitive: true }, "A.B a.b"), "A.B X");
    assert.equal(
        run({}, "axb a.b"),
        "axb X",
        "a literal's regex specials are escaped, not honoured",
    );
    assert.equal(
        run({ isRegex: true }, "axb a.b"),
        "X X",
        "a pattern rule still means the pattern",
    );
}

// --- posting rights --------------------------------------------------------

{
    const admin = (over = {}) => ({ status: "administrator", ...over });
    assert.equal(
        postVerdict("private", admin()),
        undefined,
        "a private chat proves nothing either way",
    );
    assert.deepEqual(
        postVerdict("channel", admin({ can_post_messages: true })),
        { ok: true },
    );
    assert.deepEqual(
        postVerdict("channel", admin({ can_post_messages: false })),
        { ok: false, status: "no_rights" },
        "an admin without the posting right still cannot post",
    );
    assert.deepEqual(
        postVerdict("supergroup", admin()),
        { ok: true },
        "a group admin needs no posting right",
    );
    assert.deepEqual(postVerdict("group", { status: "member" }), { ok: true });
    assert.deepEqual(postVerdict("channel", { status: "member" }), {
        ok: false,
        status: "not_admin",
    });
    assert.deepEqual(
        postVerdict("supergroup", {
            status: "restricted",
            can_send_messages: false,
        }),
        {
            ok: false,
            status: "no_rights",
        },
    );
    assert.deepEqual(
        postVerdict("supergroup", {
            status: "restricted",
            can_send_messages: true,
        }),
        {
            ok: true,
        },
    );
    assert.deepEqual(postVerdict("group", { status: "kicked" }), {
        ok: false,
        status: "removed",
    });
    assert.deepEqual(
        postVerdict("group", undefined),
        { ok: false, status: "removed" },
        "no answer is not a yes",
    );
}

// --- pattern guard ---------------------------------------------------------

assert.equal(checkPattern("\\d+").ok, true);
assert.equal(checkPattern("(a+)+$").ok, false, "nested quantifier is refused");
assert.equal(checkPattern("(a|a)+$").ok, false, "alternation repeats too");
assert.equal(checkPattern("(a|ab)+c").ok, false);
assert.equal(checkPattern("(\\w|\\d)*!").ok, false, "escapes are not literals");
assert.equal(checkPattern("(a{1,2})+").ok, false, "a bounded inner repeat too");
assert.equal(checkPattern("((a+))+").ok, false, "through a nested group");
assert.equal(checkPattern("(a?)+").ok, false);
assert.equal(checkPattern("(").ok, false, "unparseable is refused");

assert.equal(checkPattern("(abc)+").ok, true, "an unambiguous group is fine");
assert.equal(checkPattern("([*+])+").ok, true, "specials in a class are not");
assert.equal(
    checkPattern("(\\d{1,3}\\.){3}").ok,
    true,
    "a bounded outer repeat cannot blow up",
);

{
    const msg = { text: "Buy SPAM now", chat: { id: 1 }, message_id: 1 };
    const loose = parseConfig({
        filters: { blacklist: [{ type: "regex", pattern: "spam|scam" }] },
    });
    assert.equal(passes(loose, msg), false);
    const strict = parseConfig({
        filters: {
            blacklist: [
                { type: "regex", pattern: "spam|scam", caseSensitive: true },
            ],
        },
    });
    assert.equal(passes(strict, msg), true);
}

{
    const many = (n) => ({
        type: "keyword",
        value: "x",
        caseSensitive: false,
        target: "text",
        n,
    });
    const over = parseConfig({
        filters: {
            blacklist: Array.from({ length: MAX_RULES + 1 }, (_, i) => many(i)),
        },
    });
    assert.ok(configIssue(over), "too many filter rules is refused");
    assert.equal(configIssue(defaultConfig()), null);
}

// --- what an error means ---------------------------------------------------

{
    const bad = (description, parameters) => ({ description, parameters });

    assert.deepEqual(classify(bad("Bad Request: chat not found")), {
        kind: "permanent",
        status: "gone",
    });
    assert.deepEqual(
        classify(bad("Bad Request: not enough rights to send photos")).kind,
        "transient",
        "one message failed, not the route — checked before the rights rule",
    );
    assert.deepEqual(
        classify(bad("Bad Request: not enough rights to send text messages")),
        { kind: "permanent", status: "no_rights" },
    );
    assert.equal(
        classify(
            bad("Bad Request: group chat was upgraded", {
                migrate_to_chat_id: -100123,
            }),
        ).kind,
        "migrate",
    );
    assert.deepEqual(
        classify(bad("Too Many Requests: retry after 3", { retry_after: 3 })),
        { kind: "transient", retryAfter: 3 },
        "flood control says how long to wait",
    );
    assert.equal(
        classify(bad("something nobody has seen")).kind,
        "transient",
        "an unknown description never stops a working route",
    );
    assert.equal(classify(undefined).kind, "transient");
}

// --- presence --------------------------------------------------------------

for (const status of ["creator", "administrator", "member"])
    assert.equal(isPresent({ status }), true, status);
assert.equal(isPresent({ status: "restricted", is_member: true }), true);
assert.equal(isPresent({ status: "restricted", is_member: false }), false);
assert.equal(isPresent({ status: "left" }), false);
assert.equal(isPresent({ status: "kicked" }), false);
assert.equal(isPresent(undefined), false, "no answer is not a yes");

// --- base64 ----------------------------------------------------------------

// The runtime has no btoa and no Buffer, so this encoder is hand-rolled and
// its padding is the part that breaks silently. Checked against Node's.
for (const len of [0, 1, 2, 3, 4, 5, 17, 64, 199]) {
    const bytes = Uint8Array.from(
        { length: len },
        (_, i) => (i * 37 + 11) % 256,
    );
    assert.equal(
        base64(bytes),
        Buffer.from(bytes).toString("base64"),
        `base64 of ${len} bytes`,
    );
}

// --- router round trip -----------------------------------------------------

{
    // href() and parse() are each other's inverse. They drifted apart once —
    // href kept writing the old /app prefix that parse no longer stripped, so
    // every back navigation landed on the settings screen.
    globalThis.location = { pathname: "/", search: "", hash: "" };
    globalThis.history = {
        state: null,
        replaceState() {},
        pushState() {},
        back() {},
    };
    globalThis.addEventListener = () => {};

    const { parse, href } = await import("../src/lib/router.ts");

    for (const loc of [
        { name: "settings" },
        { name: "help" },
        { name: "add" },
        { name: "route", id: "mgq1x8k2abc", pane: null },
        { name: "route", id: "mgq1x8k2abc", pane: "allow" },
        { name: "route", id: "mgq1x8k2abc", pane: "replace" },
    ]) {
        assert.deepEqual(parse(href(loc)), loc, `round trip: ${href(loc)}`);
    }

    globalThis.location = {
        pathname: "/",
        search: "?x=1",
        hash: "#tgWebAppData=y",
    };
    assert.equal(href({ name: "help" }), "/help?x=1#tgWebAppData=y");
    assert.deepEqual(
        parse("/"),
        { name: "settings" },
        "the launch URL opens the list",
    );

    delete globalThis.location;
    delete globalThis.history;
    delete globalThis.addEventListener;
}

console.log("ok");
