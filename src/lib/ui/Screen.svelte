<script lang="ts">
import type { Snippet } from "svelte";
import Credit from "./Credit.svelte";
import Header from "./Header.svelte";

let {
    title = "",
    onback,
    backLabel = "Back",
    action,
    underHeader = false,
    footer,
    credit = false,
    children,
}: {
    title?: string;
    onback?: () => void;
    backLabel?: string;
    action?: Snippet;
    underHeader?: boolean;
    footer?: Snippet;
    credit?: boolean;
    children: Snippet;
} = $props();
</script>

<div class="ui-screen" class:has-footer={!!footer}>
    {#if onback}
        <Header {onback} {backLabel} {title} {action} />
    {/if}

    <div class="body" class:under-header={!!onback || underHeader}>
        {@render children()}
        {#if credit && !footer}<Credit />{/if}
    </div>

    {#if footer}
        <div class="footer">{@render footer()}</div>
    {/if}
</div>

<style>
.ui-screen {
    /* A sheet sets --ui-screen-min to 0: it is the one that owns the
       viewport, and the screen inside it fills what is left. */
    min-height: var(--ui-screen-min, var(--tg-viewport-stable-height, 100dvh));
    display: flex;
    flex-direction: column;
    background: var(--ui-page);
    color: var(--ui-text);
}
.body {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: calc(var(--ui-safe-top) + 12px) var(--ui-safe-right)
        calc(var(--ui-safe-bottom) + 40px) var(--ui-safe-left);
}
.under-header {
    padding-top: 16px;
    max-width: 560px;
    width: 100%;
    margin: 0 auto;
}
/* The gutter lives on the children, so a Hero can still run edge to edge.
   A child must therefore never set a `margin` shorthand: it has the same
   specificity as this rule and would cancel the gutter depending only on
   which stylesheet the bundler happened to put last. Use margin-block. */
.body > :global(*) {
    margin-inline: var(--ui-gutter);
}
.body > :global(.ui-hero),
.body > :global(.ui-credit) {
    margin-inline: 0;
}
.body > :global(* + *) {
    margin-top: var(--ui-section-gap);
}
.body > :global(.ui-heading + *) {
    margin-top: 10px;
}
.body > :global(.ui-hero + *) {
    margin-top: 0;
}
.body > :global(.ui-note) {
    margin-top: 8px;
}
.body > :global(.ui-heading) {
    margin-bottom: 0;
}
/* The footer floats over the scroll and owns the bottom safe area, so the
   body reserves its full height instead of its own bottom inset. */
.has-footer .body {
    padding-bottom: calc(var(--ui-safe-bottom) + var(--ui-button-bar) + 28px);
}
.footer :global(.ui-button) {
    min-height: var(--ui-button-bar);
}
.footer {
    position: sticky;
    bottom: 0;
    z-index: var(--ui-z-bar);
    padding: 8px var(--ui-gutter) calc(var(--ui-safe-bottom) + 8px);
    box-shadow: inset 0 1px 0 var(--ui-separator);
    background: var(--tg-theme-bottom-bar-bg-color, var(--ui-page));
    display: flex;
    gap: var(--ui-gap);
}
</style>
