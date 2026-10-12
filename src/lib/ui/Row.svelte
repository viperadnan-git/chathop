<script lang="ts">
import type { Snippet } from "svelte";
import Icon from "./Icon.svelte";

let {
    label,
    description = "",
    detail,
    value = "",
    valueTone = "",
    strong = false,
    chevron = false,
    tone = "",
    disabled = false,
    leading,
    trailing,
    onclick,
}: {
    label: string;
    description?: string;
    detail?: Snippet;
    value?: string;
    /** accent: an action rather than a reading. */
    valueTone?: "" | "danger" | "accent";
    /** A name, not a setting: carries the weight the kit gives chat names. */
    strong?: boolean;
    chevron?: boolean;
    tone?: "" | "accent" | "danger";
    disabled?: boolean;
    leading?: Snippet;
    trailing?: Snippet;
    onclick?: () => void;
} = $props();

const tappable = $derived(!!onclick && !disabled);
</script>

<svelte:element
    this={onclick ? "button" : "div"}
    class="ui-row {tone}"
    class:tappable
    class:iconed={!!leading}
    role={onclick ? "button" : undefined}
    disabled={onclick ? disabled : undefined}
    onclick={tappable ? onclick : undefined}
>
    {#if leading}<span class="leading">{@render leading()}</span>{/if}

    <span class="text">
        <span class="label" class:strong>{label}</span>
        {#if detail}
            <span class="description"><!-- a changing value: see StableText -->
                {@render detail()}
            </span>
        {:else if description}
            <span class="description">{description}</span>
        {/if}
    </span>

    {#if trailing}
        <span class="trailing">{@render trailing()}</span>
    {/if}

    <!-- A worded action and its chevron are one control, not two columns. -->
    {#if value || chevron}
        <span class="end {valueTone}">
            {#if value}<span class="value">{value}</span>{/if}
            {#if chevron}
                <span class="chevron"><Icon name="next" size={16} /></span>
            {/if}
        </span>
    {/if}
</svelte:element>

<style>
.ui-row {
    display: flex;
    align-items: center;
    gap: var(--ui-gap);
    width: 100%;
    min-height: var(--ui-row);
    padding: 7px var(--ui-gutter);
    background: none;
    border: 0;
    color: var(--ui-text);
    font: inherit;
    text-align: left;
    transition: background-color var(--ui-swift) var(--ui-ease);
}
.ui-row:not(:last-child) {
    box-shadow: inset 0 -1px 0 var(--ui-separator);
}
.tappable:active {
    background: var(--ui-press);
}
@media (hover: hover) and (pointer: fine) {
    .tappable:hover {
        background: var(--ui-hover);
    }
}
.ui-row:disabled {
    opacity: 0.45;
}
.iconed {
    padding-left: 11px;
}
.leading {
    display: flex;
    align-items: center;
    justify-content: center;
    /* A glyph is 24; an avatar sizes itself. */
    min-width: 24px;
    flex-shrink: 0;
    color: var(--ui-text);
}
.text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.label {
    font-size: var(--ui-body);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.description {
    font-size: var(--ui-caption);
    line-height: 1.35;
    color: var(--ui-muted);
}
.end,
.trailing {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}
/* The words and the chevron are the same control, so they sit together. */
.end {
    gap: 2px;
}
.end.danger .value {
    color: var(--ui-danger);
}
.end.accent .value,
.end.accent .chevron {
    color: var(--ui-button-bg);
}
.end.accent .value {
    font-weight: var(--ui-weight-button);
}
.label.strong {
    font-weight: var(--ui-weight-button);
}
.value {
    color: var(--ui-muted);
    font-size: var(--ui-body);
    font-variant-numeric: tabular-nums;
}
.accent .label,
.accent .leading {
    color: var(--ui-accent);
}
.danger .label,
.danger .leading {
    color: var(--ui-danger);
}
.chevron {
    display: flex;
    flex-shrink: 0;
    color: var(--ui-muted);
}
</style>
