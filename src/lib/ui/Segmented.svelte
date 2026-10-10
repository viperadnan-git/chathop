<script lang="ts">
import { selection } from "../haptics";

let {
    value = $bindable(),
    options,
}: { value: string; options: { value: string; label: string }[] } = $props();

const active = $derived(options.findIndex((o) => o.value === value));

function pick(next: string) {
    if (next === value) return;
    value = next;
    selection();
}
</script>

<div
    class="ui-segmented"
    role="group"
    style="--ui-seg-count: {options.length}; --ui-seg-at: {Math.max(active, 0)}"
>
    {#if active >= 0}<span class="thumb" aria-hidden="true"></span>{/if}
    {#each options as option (option.value)}
        <button
            type="button"
            class:on={value === option.value}
            aria-pressed={value === option.value}
            onclick={() => pick(option.value)}
        >
            {option.label}
        </button>
    {/each}
</div>

<style>
/* A grid, so every segment is as wide as the longest — switching between
   "Copy" and "Forward" must not resize the control under the thumb. */
.ui-segmented {
    position: relative;
    display: inline-grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    flex-shrink: 0;
    padding: 2px;
    border-radius: var(--ui-r-button);
    background: color-mix(in srgb, var(--ui-text) 8%, transparent);
}
.thumb {
    position: absolute;
    top: 2px;
    bottom: 2px;
    left: 2px;
    width: calc((100% - 4px) / var(--ui-seg-count));
    transform: translateX(calc(var(--ui-seg-at) * 100%));
    border-radius: calc(var(--ui-r-button) - 3px);
    background: var(--ui-card);
    box-shadow:
        0 0 0 0.5px rgba(0, 0, 0, 0.04),
        0 1px 2px rgba(0, 0, 0, 0.16);
    transition: transform var(--ui-swift) var(--ui-ease);
}
button {
    border: 0;
    padding: 5px 13px;
    border-radius: calc(var(--ui-r-button) - 3px);
    background: none;
    color: var(--ui-muted);
    font: inherit;
    font-size: var(--ui-note);
    font-weight: var(--ui-weight-button);
    white-space: nowrap;
    cursor: pointer;
    transition:
        background-color var(--ui-swift) var(--ui-ease),
        color var(--ui-swift) var(--ui-ease);
}
button:active:not(.on) {
    color: var(--ui-text);
}
button {
    position: relative;
}
.on {
    color: var(--ui-accent);
}
@media (prefers-reduced-motion: reduce) {
    button,
    .thumb {
        transition: none;
    }
}
</style>
