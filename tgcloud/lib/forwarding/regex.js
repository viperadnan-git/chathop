// The self-hosted bot ran user patterns on RE2, which cannot backtrack. There
// is no RE2 here and no npm to bring one, so the guard moves to save time: a
// group that repeats without bound may not hold anything that repeats or
// branches, and matching only ever sees a Telegram-sized string.
//
// ponytail: heuristic, not a proof. If a pattern ever hangs an invocation,
// the upgrade path is a bundled RE2 compiled to plain JS in lib/.

const MAX_INPUT = 4096;

/**
 * The pattern with escapes and character classes blanked to `x`, so the paren
 * scan below cannot be fooled by `(a\+)+` or `([*+])+`. Length is preserved.
 */
function skeleton(pattern) {
    let out = "";
    for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] === "\\") {
            out += "xx";
            i += 1;
            continue;
        }
        if (pattern[i] === "[") {
            let j = i + 1;
            while (j < pattern.length && pattern[j] !== "]")
                j += pattern[j] === "\\" ? 2 : 1;
            out += "x".repeat(Math.min(j, pattern.length - 1) - i + 1);
            i = j;
            continue;
        }
        out += pattern[i];
    }
    return out;
}

// `*`, `+` and `{n,}` — the repetitions with no ceiling. A bounded one like
// `{1,3}` can only re-split a bounded number of ways.
const UNBOUNDED = /^(?:[*+]|\{\d*,\})/;

const AMBIGUOUS = /[*+?|{]/;

function ambiguousRepeat(pattern) {
    const flat = skeleton(pattern);
    const open = [];
    for (let i = 0; i < flat.length; i++) {
        if (flat[i] === "(") open.push(i);
        else if (flat[i] === ")") {
            const start = open.pop();
            if (start === undefined) continue;
            if (!UNBOUNDED.test(flat.slice(i + 1))) continue;
            if (AMBIGUOUS.test(flat.slice(start + 1, i))) return true;
        }
    }
    return false;
}

const cache = new Map();

export function checkPattern(pattern) {
    if (pattern.length > 512)
        return {
            ok: false,
            error: "that pattern is too long (512 characters max)",
        };
    if (ambiguousRepeat(pattern)) {
        return {
            ok: false,
            error: "a repeated group holding another repetition or an | can hang; simplify the pattern",
        };
    }
    try {
        new RegExp(pattern);
        return { ok: true };
    } catch (e) {
        return {
            ok: false,
            error: String(e.message).replace(
                /^Invalid regular expression:.*?: /,
                "",
            ),
        };
    }
}

function compile(pattern, flags) {
    const key = `${flags} ${pattern}`;
    let re = cache.get(key);
    if (!re) {
        re = new RegExp(pattern, flags);
        cache.set(key, re);
    }
    return re;
}

export function test(pattern, text, caseSensitive = true) {
    if (text.length > MAX_INPUT) return false;
    try {
        return compile(pattern, caseSensitive ? "" : "i").test(text);
    } catch {
        return false;
    }
}

export function matchSpans(pattern, text, caseSensitive = true) {
    if (text.length > MAX_INPUT) return [];
    const spans = [];
    let re;
    try {
        re = compile(pattern, caseSensitive ? "g" : "gi");
    } catch {
        return spans;
    }
    re.lastIndex = 0;
    for (let m = re.exec(text); m !== null; m = re.exec(text)) {
        if (m[0].length > 0)
            spans.push({ start: m.index, end: m.index + m[0].length });
        // A zero-length match would loop forever on the same index.
        else re.lastIndex += 1;
    }
    return spans;
}
