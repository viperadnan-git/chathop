<script lang="ts">
// The filled button: what commits something. An action that navigates or
// switches a mode is a Row with tone="accent", which carries no fill.
import { impact } from "../haptics";

let {
    label,
    tone = "accent",
    disabled = false,
    onclick,
}: {
    label: string;
    tone?: "accent" | "danger" | "quiet";
    disabled?: boolean;
    onclick: () => void;
} = $props();
</script>

<button
    type="button"
    class="ui-button {tone}"
    {disabled}
    onclick={() => {
        impact();
        onclick();
    }}>{label}</button
>

<style>
.ui-button {
    transition:
        transform var(--ui-quick) var(--ui-ease),
        opacity var(--ui-quick) var(--ui-ease);
    display: block;
    width: 100%;
    flex: 1;
    min-height: var(--ui-button);
    padding: 0 18px;
    border: 0;
    border-radius: var(--ui-r-button);
    font-size: var(--ui-body);
    font-weight: var(--ui-weight-button);
    text-align: center;
    cursor: pointer;
}
.accent {
    background: var(--ui-button-bg);
    color: var(--ui-on-accent);
}
.danger {
    background: var(--ui-danger);
    color: var(--ui-on-accent);
}
.quiet {
    background: var(--ui-inset);
    color: var(--ui-text);
}
.ui-button:active:not(:disabled) {
    transform: scale(0.98);
    opacity: 0.8;
}
@media (prefers-reduced-motion: reduce) {
    .ui-button {
        transition: none;
    }
    .ui-button:active:not(:disabled) {
        transform: none;
    }
}
@media (hover: hover) and (pointer: fine) {
    .ui-button:hover:not(:disabled) {
        filter: brightness(1.08);
    }
}
.ui-button:disabled {
    opacity: 0.45;
    cursor: default;
}
</style>
