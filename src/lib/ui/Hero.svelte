<script lang="ts">
import type { Snippet } from "svelte";

import Avatar from "./Avatar.svelte";

let {
    title,
    chatId,
    glyph,
    lede,
}: {
    title: string;
    chatId?: number;
    glyph?: Snippet;
    lede?: Snippet;
} = $props();
</script>

<div class="ui-hero">
    {#if chatId}
        <span class="photo"><Avatar {chatId} name={title} size="var(--ui-media)" /></span>
    {:else if glyph}
        <span class="glyph">{@render glyph()}</span>
    {/if}

    <h1>{title}</h1>
    {#if lede}<p class="lede">{@render lede()}</p>{/if}
</div>

<style>
.ui-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 22px var(--ui-gutter) 20px;
}
.photo {
    width: var(--ui-media);
    height: var(--ui-media);
    border-radius: 50%;
    object-fit: cover;
}
.glyph {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ui-accent);
}
h1 {
    margin: 14px 0 0;
    font-size: var(--ui-title);
    font-weight: var(--ui-weight-title);
    letter-spacing: -0.02em;
    color: var(--ui-text);
}
.lede {
    margin: 8px 0 0;
    max-width: 34ch;
    font-size: var(--ui-note);
    line-height: 1.4;
    color: var(--ui-muted);
}
.lede :global(a) {
    color: var(--ui-accent);
    text-decoration: none;
}
</style>
