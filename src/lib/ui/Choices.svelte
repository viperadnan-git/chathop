<script lang="ts">
import Icon from "./Icon.svelte";

let {
    options,
    onpick,
    disabled = false,
}: {
    options: { value: string; label: string; icon: string }[];
    onpick: (value: string) => void;
    disabled?: boolean;
} = $props();
</script>

<div class="ui-choices" style="--ui-choices: {options.length}">
    {#each options as option (option.value)}
        <button
            type="button"
            class="choice"
            {disabled}
            onclick={() => onpick(option.value)}
        >
            <Icon name={option.icon} size={22} />
            {option.label}
        </button>
    {/each}
</div>

<style>
.ui-choices {
    display: grid;
    grid-template-columns: repeat(var(--ui-choices), 1fr);
}
.choice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: var(--ui-row);
    padding: 9px var(--ui-gutter);
    border: 0;
    background: none;
    color: var(--ui-accent);
    font: inherit;
    font-size: var(--ui-body);
    cursor: pointer;
}
.choice:not(:first-child) {
    box-shadow: inset 1px 0 0 var(--ui-separator);
}
.choice:active:not(:disabled) {
    background: var(--ui-press);
}
@media (hover: hover) {
    .choice:hover:not(:disabled) {
        background: var(--ui-hover);
    }
}
.choice:disabled {
    opacity: 0.45;
    cursor: default;
}
</style>
