<script lang="ts">
import { impact } from "../haptics";
import Icon from "./Icon.svelte";

let {
    name,
    label,
    tone = "accent",
    disabled = false,
    onclick,
}: {
    name: string;
    label: string;
    tone?: "accent" | "danger";
    disabled?: boolean;
    onclick: () => void;
} = $props();
</script>

<button
    type="button"
    class="ui-icon-button {tone}"
    aria-label={label}
    {disabled}
    onclick={() => {
        impact();
        onclick();
    }}
>
    <Icon {name} size={18} />
</button>

<style>
.ui-icon-button {
    flex: none;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    margin-right: -7px;
    border: 0;
    border-radius: 50%;
    background: none;
    cursor: pointer;
    transition: background-color var(--ui-swift) var(--ui-ease);
}
.accent {
    color: var(--ui-accent);
}
.danger {
    color: var(--ui-danger);
}
.ui-icon-button:active:not(:disabled) {
    background: var(--ui-press);
    transition-duration: 0s;
}
.ui-icon-button:disabled {
    opacity: 0.4;
    cursor: default;
}
</style>
