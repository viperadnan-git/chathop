<script lang="ts">
import { isBlankRule, ruleIssue } from "$config";
import { selection } from "../haptics";
import {
    type MatchTarget,
    MEDIA_KINDS,
    type MediaKind,
    type Rule,
} from "../types";
import Card from "../ui/Card.svelte";
import Field from "../ui/Field.svelte";
import Heading from "../ui/Heading.svelte";
import Icon from "../ui/Icon.svelte";
import IconButton from "../ui/IconButton.svelte";
import Note from "../ui/Note.svelte";
import Row from "../ui/Row.svelte";
import Segmented from "../ui/Segmented.svelte";
import Toggle from "../ui/Toggle.svelte";

let { rules = $bindable([]) }: { rules: Rule[] } = $props();

const TYPES: {
    type: Rule["type"];
    label: string;
    what: string;
    icon: string;
}[] = [
    {
        type: "keyword",
        label: "Keyword",
        what: "A word or phrase in the message",
        icon: "keyword",
    },
    {
        type: "regex",
        label: "Pattern",
        what: "A regular expression, for what a keyword cannot express",
        icon: "replace",
    },
    {
        type: "media",
        label: "Media type",
        what: "Photos, videos, documents and the rest",
        icon: "media",
    },
    {
        type: "sender",
        label: "Sender",
        what: "Who posted it, or who it came from",
        icon: "owner",
    },
];

const LABELS = Object.fromEntries(
    TYPES.map((t) => [t.type, t.label]),
) as Record<Rule["type"], string>;

function add(type: Rule["type"]) {
    const blank: Record<Rule["type"], Rule> = {
        keyword: {
            type: "keyword",
            value: "",
            caseSensitive: false,
            target: "text",
        },
        regex: {
            type: "regex",
            pattern: "",
            caseSensitive: false,
            target: "text",
        },
        media: { type: "media", kinds: ["photo"] },
        sender: { type: "sender", ids: [], usernames: [] },
    };
    rules = [...rules, blank[type]];
}

const remove = (i: number) => (rules = rules.filter((_, n) => n !== i));

// What was typed, not what it parsed to: a half-typed "@bo," normalises to
// something shorter, and rewriting the box mid-edit sends the caret to the end.
const typed = new WeakMap<object, string>();

const senderText = (rule: Extract<Rule, { type: "sender" }>) =>
    typed.get(rule) ?? [...rule.ids.map(String), ...rule.usernames].join(", ");

function setSender(rule: Extract<Rule, { type: "sender" }>, raw: string) {
    typed.set(rule, raw);
    const parts = raw
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
    rule.ids = parts.filter((p) => /^-?\d+$/.test(p)).map(Number);
    rule.usernames = parts.filter((p) => !/^-?\d+$/.test(p));
}

function toggleKind(rule: Extract<Rule, { type: "media" }>, kind: MediaKind) {
    rule.kinds = rule.kinds.includes(kind)
        ? rule.kinds.filter((k) => k !== kind)
        : [...rule.kinds, kind];
    selection();
}
</script>

{#snippet textOptions(rule: Extract<Rule, { target: MatchTarget }>)}
    <Row label="Match against">
        {#snippet trailing()}
            <Segmented
                bind:value={rule.target}
                options={[
                    { value: "text", label: "Text" },
                    { value: "filename", label: "File name" }
                ]}
            />
        {/snippet}
    </Row>
    <Row label="Match case">
        {#snippet trailing()}
            <Toggle bind:checked={rule.caseSensitive} label="Match case" />
        {/snippet}
    </Row>
{/snippet}

{#each rules as rule, i (i)}
    {@const blank = isBlankRule(rule)}
    {@const issue = blank ? null : ruleIssue(rule)}

    <Heading title={`#${i + 1} ${LABELS[rule.type]}`}>
        {#snippet trailing()}
            <IconButton
                name="trash"
                tone="danger"
                label="Remove rule {i + 1}"
                onclick={() => remove(i)}
            />
        {/snippet}
    </Heading>

    <Card>
        {#if rule.type === "keyword"}
            <Field
                bind:value={rule.value}
                placeholder={rule.target === "filename"
                    ? "Part of a file name"
                    : "Word or phrase"}
            />
            {@render textOptions(rule)}
        {:else if rule.type === "regex"}
            <Field
                bind:value={rule.pattern}
                mono
                placeholder={rule.target === "filename"
                    ? "\\.(mkv|avi)$"
                    : "t\\.me/\\w+"}
            />
            {@render textOptions(rule)}
        {:else if rule.type === "media"}
            <div class="kinds">
                {#each MEDIA_KINDS as kind}
                    <button
                        type="button"
                        class="kind"
                        class:off={!rule.kinds.includes(kind)}
                        aria-pressed={rule.kinds.includes(kind)}
                        onclick={() => toggleKind(rule, kind)}>{kind}</button
                    >
                {/each}
            </div>
        {:else}
            <Field
                value={senderText(rule)}
                mono
                placeholder="Ids or @usernames, comma separated"
                oninput={(v) => setSender(rule, v)}
            />
        {/if}
    </Card>

    {#if issue}
        <Note tone="danger">{issue}</Note>
    {:else if blank}
        <Note>Not filled in yet, so it is dropped when you save.</Note>
    {:else if rule.type === "regex"}
        <Note>
            A repeated group inside a repeated group is refused, because it can
            hang. Everything else a JavaScript regular expression accepts works.
        </Note>
    {:else if rule.type === "media"}
        <Note>Tap a kind to include or exclude it.</Note>
    {:else if rule.type === "sender"}
        <Note>
            Matches the author, the channel a post was sent as, and — for a
            forwarded message — who it originally came from.
        </Note>
    {/if}
{/each}

<Heading title={rules.length ? "Add another rule" : "Add a rule"} />
<Card>
    {#each TYPES as t}
        <Row label={t.label} description={t.what} tone="accent" chevron onclick={() => add(t.type)}>
            {#snippet leading()}<Icon name={t.icon} />{/snippet}
        </Row>
    {/each}
</Card>

<style>
.kinds {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 12px var(--ui-gutter);
}
.kind {
    padding: 5px 10px;
    border: 0;
    border-radius: var(--ui-r-pill);
    background: color-mix(in srgb, var(--ui-accent) 20%, transparent);
    color: var(--ui-accent);
    font: inherit;
    font-size: var(--ui-note);
    cursor: pointer;
}
.kind.off {
    background: var(--ui-inset);
    color: var(--ui-muted);
}
</style>
