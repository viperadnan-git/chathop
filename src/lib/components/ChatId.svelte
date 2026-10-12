<script lang="ts">
let { id }: { id: number } = $props();

const parts = $derived(
    String(id).startsWith("-100")
        ? { pre: "-100", body: String(id).slice(4) }
        : { pre: "", body: String(id) },
);
</script>

<span class="digits"
    >{#if parts.pre}<span class="pre">{parts.pre}</span>{/if}{parts.body}</span
>

<style>
.digits {
    color: var(--ui-text);
    font-size: var(--ui-id);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* The -100 channel prefix is the same on every chat, so it carries no
   information and is dimmed to let the part that does stand out. */
.digits .pre {
    color: var(--ui-muted);
    opacity: 0.65;
}
</style>
