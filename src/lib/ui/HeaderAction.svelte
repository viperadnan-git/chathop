<script lang="ts">
import type { Snippet } from "svelte";

import { impact } from "../haptics";

let {
    label,
    tone = "accent",
    prominent = false,
    disabled = false,
    onclick,
    leading,
}: {
    label: string;
    tone?: "accent" | "danger";
    prominent?: boolean;
    disabled?: boolean;
    onclick: () => void;
    leading?: Snippet;
} = $props();
</script>

<button
    type="button"
    class="ui-header-action {tone}"
    class:prominent
    {disabled}
    onclick={() => {
        impact();
        onclick();
    }}
>
    {#if leading}{@render leading()}{/if}
    {label}
</button>

<style>
.ui-header-action {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 34px;
    margin-right: -4px;
    padding: 0 4px;
    border: 0;
    border-radius: var(--ui-r-button);
    background: none;
    font: inherit;
    font-size: var(--ui-body);
    font-weight: var(--ui-weight-button);
    cursor: pointer;
    white-space: nowrap;
}
.accent {
    color: var(--ui-accent);
}
.danger {
    color: var(--ui-danger);
}
.prominent {
    margin-right: 0;
    padding: 0 12px;
    background: color-mix(in srgb, currentcolor 16%, transparent);
}
.ui-header-action {
    transition: opacity var(--ui-quick) var(--ui-ease);
}
.ui-header-action:active:not(:disabled) {
    opacity: 0.6;
}
.ui-header-action:disabled {
    opacity: 0.4;
    cursor: default;
}
</style>
