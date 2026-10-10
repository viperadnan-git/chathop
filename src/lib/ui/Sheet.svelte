<script lang="ts">
import type { Snippet } from "svelte";
import Header from "./Header.svelte";
import Screen from "./Screen.svelte";

let {
    title,
    onback,
    backLabel = "Back",
    action,
    footer,
    children,
}: {
    title: string;
    onback: () => void;
    backLabel?: string;
    action?: Snippet;
    footer?: Snippet;
    children: Snippet;
} = $props();
</script>

<div class="ui-sheet">
    <Header {onback} {backLabel} {title} {action} />
    <Screen {footer} underHeader>{@render children()}</Screen>
</div>

<style>
.ui-sheet {
    animation: sheet-in var(--ui-slow) var(--ui-ease-sheet);
    position: fixed;
    inset: 0;
    z-index: var(--ui-z-sheet);
    display: flex;
    flex-direction: column;
    background: var(--ui-page);
    overflow-y: auto;
    /* Its own scroller, and the end of it is the end: without this a drag
       carries on into the page underneath, which is still there. */
    overscroll-behavior: contain;
}
@keyframes sheet-in {
    from {
        transform: translateY(14px);
        opacity: 0;
    }
}
@media (prefers-reduced-motion: reduce) {
    .ui-sheet {
        animation: none;
    }
}
/* The screen inside fills what is left rather than demanding a viewport of
   its own — otherwise a sheet with two rows in it still scrolls. */
.ui-sheet {
    --ui-screen-min: 0;
}
.ui-sheet > :global(.ui-screen) {
    flex: 1;
}
</style>
