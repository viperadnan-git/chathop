<script lang="ts">
import Button from "./Button.svelte";

let {
    label,
    tone = "accent",
    disabled = false,
    busyLabel = "",
    busy = false,
    onclick,
}: {
    label: string;
    tone?: "accent" | "danger";
    disabled?: boolean;
    busyLabel?: string;
    busy?: boolean;
    onclick: () => void;
} = $props();

const text = $derived(busy && busyLabel ? busyLabel : label);
</script>

<Button label={text} {tone} disabled={disabled || busy} {onclick} />
