<script lang="ts">
import { impact } from "../haptics";
import { copyText } from "../telegram";
import Icon from "../ui/Icon.svelte";

let { id }: { id: number } = $props();

let copied = $state(false);
let timer: ReturnType<typeof setTimeout>;

const parts = $derived(
    String(id).startsWith("-100")
        ? { pre: "-100", body: String(id).slice(4) }
        : { pre: "", body: String(id) },
);

async function copy(event: MouseEvent) {
    // The row behind opens on tap; copying must not also navigate.
    event.stopPropagation();
    if (!(await copyText(String(id)))) return;
    copied = true;
    impact();
    clearTimeout(timer);
    timer = setTimeout(() => (copied = false), 1600);
}
</script>

<span class="cid">
    <span class="digits"
        >{#if parts.pre}<span class="pre">{parts.pre}</span>{/if}{parts.body}</span
    >
    <button
        type="button"
        class="copy"
        class:done={copied}
        aria-label={copied ? "Copied" : `Copy chat id ${id}`}
        onclick={copy}
    >
        <Icon name={copied ? "tick" : "copy"} size={12} stroke={2.2} />
    </button>
</span>

<style>
.cid {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin-top: 3px;
}

/* Inherits the row's pointer-events: none, so a tap here opens the route. */
.digits {
    color: var(--ui-text);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.digits .pre {
    color: var(--ui-muted);
    opacity: 0.65;
}

.copy {
    display: flex;
    padding: 4px 6px;
    border: 0;
    background: none;
    color: var(--ui-muted);
    cursor: pointer;
    pointer-events: auto;
    transition: color var(--ui-quick) var(--ui-ease);
}

.copy.done {
    color: var(--ui-accent);
}

@media (hover: hover) {
    .copy:hover {
        color: var(--ui-text);
    }
}

@media (prefers-reduced-motion: reduce) {
    .copy {
        transition: none;
    }
}
</style>
