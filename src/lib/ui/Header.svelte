<script lang="ts">
import type { Snippet } from "svelte";
import Icon from "./Icon.svelte";

let {
    onback,
    backLabel = "Back",
    title = "",
    action,
}: {
    onback: () => void;
    backLabel?: string;
    title?: string;
    action?: Snippet;
} = $props();
</script>

<header class="ui-header">
    <button type="button" class="back" onclick={onback}>
        <Icon name="back" size={16} />
        {backLabel}
    </button>

    <span class="title">{title}</span>

    <span class="action">{#if action}{@render action()}{/if}</span>
</header>

<style>
.ui-header {
    position: sticky;
    top: 0;
    z-index: var(--ui-z-bar);
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--ui-gap);
    /* Owns the top safe area so the body never doubles it. */
    padding: calc(var(--ui-safe-top) + 8px) var(--ui-gutter) 8px;
    background: var(--ui-page);
    box-shadow: inset 0 -1px 0 var(--ui-separator);
}
.back {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    min-height: 34px;
    margin-left: -4px;
    padding: 0 4px;
    border: 0;
    background: none;
    color: var(--ui-accent);
    font: inherit;
    font-size: var(--ui-body);
    cursor: pointer;
}
.back:active {
    opacity: 0.6;
}
.title {
    font-size: var(--ui-body);
    font-weight: var(--ui-weight-button);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.action {
    justify-self: end;
    display: flex;
    align-items: center;
}
</style>
