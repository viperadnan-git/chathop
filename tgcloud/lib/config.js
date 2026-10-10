import { checkPattern } from "./forwarding/regex.js";

// A route's whole state in one JSON column. No zod here — hand-rolled
// normalisation, because a stored config only ever comes from this bot.
//
// Every per-route feature belongs here rather than in a new column: this is
// what keeps schema migrations rare. Unknown keys are dropped on read, which
// is the one discipline a JSON column needs.

export const MEDIA_KINDS = [
    "text",
    "photo",
    "video",
    "animation",
    "audio",
    "document",
    "sticker",
    "voice",
    "video_note",
    "poll",
    "contact",
    "location",
    "dice",
    "paid_media",
];

export const MATCH_TARGETS = ["text", "filename"];

export const defaultConfig = () => ({
    mode: "copy",
    protectContent: false,
    silent: false,
    removeButtons: false,
    filters: { whitelist: [], blacklist: [] },
    caption: {
        strip: false,
        prepend: undefined,
        append: undefined,
        replace: [],
        removeLinks: false,
        removeMentions: false,
    },
});

const bool = (v, fallback = false) => (typeof v === "boolean" ? v : fallback);
const str = (v) => (typeof v === "string" && v !== "" ? v : undefined);
const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);

const arr = (v) => (Array.isArray(v) ? v : []);

function normaliseRule(raw) {
    if (!raw || typeof raw !== "object") return null;
    const target = MATCH_TARGETS.includes(raw.target) ? raw.target : "text";

    if (raw.type === "keyword") {
        const value = String(raw.value ?? "").trim();
        return value
            ? {
                  type: "keyword",
                  value,
                  caseSensitive: bool(raw.caseSensitive),
                  target,
              }
            : null;
    }
    if (raw.type === "regex") {
        const pattern = String(raw.pattern ?? "").trim();
        return pattern
            ? {
                  type: "regex",
                  pattern,
                  caseSensitive: bool(raw.caseSensitive),
                  target,
              }
            : null;
    }
    if (raw.type === "media") {
        const kinds = arr(raw.kinds).filter((k) => MEDIA_KINDS.includes(k));
        return kinds.length ? { type: "media", kinds } : null;
    }
    if (raw.type === "sender") {
        const ids = arr(raw.ids).filter(Number.isInteger);
        const usernames = arr(raw.usernames)
            .map((u) => String(u).trim().replace(/^@/, "").toLowerCase())
            .filter(Boolean);
        return ids.length || usernames.length
            ? { type: "sender", ids, usernames }
            : null;
    }
    return null;
}

function normaliseReplacement(raw) {
    if (!raw || typeof raw !== "object") return null;
    const pattern = String(raw.pattern ?? "").trim();
    if (!pattern) return null;
    return {
        pattern,
        replacement: String(raw.replacement ?? ""),
        isRegex: bool(raw.isRegex),
        // Defaults true, unlike a keyword rule: replacements have always matched case.
        caseSensitive: bool(raw.caseSensitive, true),
    };
}

const keep = (items, fn) => arr(items).map(fn).filter(Boolean);

export function parseConfig(raw) {
    const base = defaultConfig();
    if (!raw || typeof raw !== "object") return base;

    const filters =
        raw.filters && typeof raw.filters === "object" ? raw.filters : {};
    const caption =
        raw.caption && typeof raw.caption === "object" ? raw.caption : {};

    return {
        mode: raw.mode === "forward" ? "forward" : "copy",
        protectContent: bool(raw.protectContent),
        silent: bool(raw.silent),
        removeButtons: bool(raw.removeButtons),
        filters: {
            whitelist: keep(filters.whitelist, normaliseRule),
            blacklist: keep(filters.blacklist, normaliseRule),
        },
        caption: {
            strip: bool(caption.strip),
            prepend: str(caption.prepend),
            append: str(caption.append),
            replace: keep(caption.replace, normaliseReplacement),
            removeLinks: bool(caption.removeLinks),
            removeMentions: bool(caption.removeMentions),
        },
    };
}

export const hasCaptionTransform = (c) =>
    c.caption.strip ||
    c.caption.removeLinks ||
    c.caption.removeMentions ||
    c.caption.replace.length > 0 ||
    // Trimmed: an emptied textarea in the editor leaves "", and a draft that
    // reads as a transform disables the save with nothing visible to turn off.
    !!c.caption.prepend?.trim() ||
    !!c.caption.append?.trim();

// --- shared with the Mini App ----------------------------------------------
// The front-end bundles this module through the `$config` alias, so the shape
// is defined once. Keep it dependency-free: an `sdk` import here would break
// the browser build.

/**
 * The stored config is partial; fill the gaps for editing.
 *
 * Deep: the editor edits what it is handed, and a rule object shared with the
 * route it came from would write discarded edits straight into the list.
 */
export const withDefaults = (config) => {
    const base = defaultConfig();
    const copy = config ? JSON.parse(JSON.stringify(config)) : {};
    return {
        ...base,
        ...copy,
        filters: { ...base.filters, ...copy.filters },
        caption: { ...base.caption, ...copy.caption },
    };
};

export function isBlankRule(rule) {
    if (rule?.type === "keyword") return String(rule.value ?? "").trim() === "";
    if (rule?.type === "regex") return String(rule.pattern ?? "").trim() === "";
    if (rule?.type === "sender") {
        return arr(rule.ids).length === 0 && arr(rule.usernames).length === 0;
    }
    return false;
}

export const isBlankReplacement = (rule) =>
    String(rule?.pattern ?? "").trim() === "";

export function ruleIssue(rule) {
    if (!rule || typeof rule !== "object") return "Invalid";

    if (rule.type === "keyword") {
        if (String(rule.value ?? "").length > 256)
            return "That keyword is too long (256 characters max)";
        return null;
    }
    if (rule.type === "regex") {
        const checked = checkPattern(String(rule.pattern ?? ""));
        if (!checked.ok) return capitalise(checked.error);
        return null;
    }
    if (rule.type === "media") {
        return arr(rule.kinds).length ? null : "Pick at least one media type";
    }
    if (rule.type === "sender") {
        return arr(rule.ids).length || arr(rule.usernames).length
            ? null
            : "Add at least one id or @username";
    }
    return "Invalid";
}

export const pruneConfig = (config) => ({
    ...config,
    filters: {
        whitelist: arr(config.filters?.whitelist).filter(
            (r) => !isBlankRule(r),
        ),
        blacklist: arr(config.filters?.blacklist).filter(
            (r) => !isBlankRule(r),
        ),
    },
    caption: {
        ...config.caption,
        replace: arr(config.caption?.replace).filter(
            (r) => !isBlankReplacement(r),
        ),
    },
});

// Per list, not in total: every rule runs on every message, and the config is
// read from the row on the forwarding hot path.
export const MAX_RULES = 100;

export function configIssue(config) {
    for (const [what, list] of [
        ["filter rules", config.filters?.whitelist],
        ["filter rules", config.filters?.blacklist],
        ["replacements", config.caption?.replace],
    ]) {
        if (arr(list).length > MAX_RULES)
            return `That is too many ${what} (${MAX_RULES} max)`;
    }
    return null;
}

export function replacementIssue(rule) {
    if (!rule || typeof rule !== "object") return "Invalid";
    if (String(rule.pattern ?? "").length > 512)
        return "That is too long to find (512 characters max)";
    if (String(rule.replacement ?? "").length > 1024) {
        return "That replacement is too long (1024 characters max)";
    }
    return rule.isRegex
        ? ruleIssue({ type: "regex", pattern: rule.pattern })
        : null;
}
