<script lang="ts">
import { preview } from "../preview";
import type { MediaKind, RouteConfig } from "../types";
import Card from "../ui/Card.svelte";
import Field from "../ui/Field.svelte";
import Heading from "../ui/Heading.svelte";
import Icon from "../ui/Icon.svelte";
import Note from "../ui/Note.svelte";
import Row from "../ui/Row.svelte";
import Segmented from "../ui/Segmented.svelte";
import Textarea from "../ui/Textarea.svelte";

let { config, from }: { config: RouteConfig; from: string } = $props();

const KINDS = [
    { value: "text", label: "Text" },
    { value: "photo", label: "Photo" },
    { value: "document", label: "File" },
];
const NAMED = ["document", "video", "audio", "animation"];

let body = $state("");
let kind = $state<MediaKind>("text");
let fileName = $state("");
let sender = $state("");

const shown = $derived(preview(config, { body, kind, fileName, sender }));
const verdict = $derived(shown.verdict);
const forwards = $derived(shown.forwarded);
const dropped = $derived(shown.dropped);
const out = $derived(shown);

const ext = $derived(
    /\.([A-Za-z0-9]{1,8})$/.exec(fileName.trim())?.[1].toUpperCase() ??
        "Document",
);

const named = (rule: NonNullable<typeof verdict.rule>) =>
    rule.type === "keyword"
        ? `the keyword “${rule.value}”`
        : rule.type === "regex"
          ? `the pattern ${rule.pattern}`
          : rule.type === "media"
            ? "the media rule"
            : "the sender rule";
</script>

<Heading title="A message to try" />
<Card>
    <Textarea bind:value={body} placeholder="Paste or type a message" />
    <Row label="Sent as">
        {#snippet trailing()}
            <Segmented bind:value={kind} options={KINDS} />
        {/snippet}
    </Row>
    {#if NAMED.includes(kind)}
        <Field bind:value={fileName} placeholder="File name, e.g. show.mkv" />
    {/if}
    <Field bind:value={sender} placeholder="From — an id or @username" />
</Card>
<Note>
    Links and @usernames are marked up the way Telegram marks them, so the
    caption rules see what they would really see.
</Note>

<Heading title="What happens" />
<Card>
    <Row label={verdict.pass ? "Forwarded" : "Not forwarded"} tone={verdict.pass ? "accent" : "danger"}>
        {#snippet leading()}
            <Icon name={verdict.pass ? "tick" : "block"} size={22} />
        {/snippet}
        {#snippet detail()}
            {#if verdict.rule}
                {verdict.list === "block" ? "Blocked by" : "Allowed by"}
                {named(verdict.rule)}
            {:else if verdict.list === "allow"}
                No allow rule matches it
            {:else}
                Nothing blocks it, and there are no allow rules
            {/if}
        {/snippet}
    </Row>
</Card>

{#if verdict.pass}
    <Heading title="How it arrives" />
    {#if dropped}
        <Card>
            <Row label="Nothing is sent" tone="danger">
                {#snippet leading()}<Icon name="block" size={22} />{/snippet}
                {#snippet detail()}
                    The rules leave this message empty, and an empty message
                    cannot be sent
                {/snippet}
            </Row>
        </Card>
    {:else}
        <div class="bubble">
            {#if forwards}
                <span class="fwd">Forwarded from <b>{from}</b></span>
            {/if}
            {#if kind === "photo"}
                <span class="shot"><Icon name="media" size={26} stroke={1.6} /></span>
            {:else if kind === "document"}
                <span class="doc">
                    <span class="disc">
                        <Icon name="file" size={21} stroke={1.9} />
                    </span>
                    <span class="about">
                        <span class="fname">{fileName || "A file"}</span>
                        <span class="kind">{ext}</span>
                    </span>
                </span>
            {/if}
            {#if out.text}
                <span class="said">{out.text}</span>
            {:else if kind === "text"}
                <span class="none">Your message, as it would arrive</span>
            {:else}
                <span class="none">No caption</span>
            {/if}
        </div>

    {/if}
{/if}

<style>
/* What lands in the other chat, shown as the thing it becomes. */
.bubble {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-inline: var(--ui-gutter);
    padding: 7px;
    border-radius: var(--ui-r-card);
    border-end-start-radius: 4px;
    background: var(--ui-card);
}
.said,
.none {
    padding: 0 6px 3px;
    font-size: var(--ui-body);
    line-height: 1.35;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}
.none {
    color: var(--ui-muted);
    font-size: var(--ui-note);
}
/* Stand-ins for the media itself, which the bot never sees here. */
.shot {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 3 / 2;
    border-radius: 9px;
    background: var(--ui-inset);
    color: var(--ui-muted);
}
.doc {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 6px 2px;
}
/* The header Telegram puts above a forwarded message. */
.fwd {
    padding: 3px 6px 0;
    font-size: var(--ui-note);
    color: var(--ui-accent);
}
/* The filled disc Telegram puts a document behind. */
.disc {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    flex: none;
    border-radius: 50%;
    background: var(--ui-button-bg);
    color: var(--ui-on-accent);
}
.about {
    display: flex;
    flex-direction: column;
    min-width: 0;
}
.fname {
    font-size: var(--ui-body);
    color: var(--ui-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.kind {
    font-size: var(--ui-caption);
    color: var(--ui-muted);
}
</style>
