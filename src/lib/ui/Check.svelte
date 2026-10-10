<script lang="ts">
import { selection } from "../haptics";

let { checked = $bindable(), label }: { checked?: boolean; label: string } =
    $props();
</script>

<label class="check">
    <input type="checkbox" bind:checked onchange={selection} />
    <span class="box"></span>
    <span>{label}</span>
</label>

<style>
.check {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    cursor: pointer;
    font-size: var(--ui-note);
    color: var(--ui-muted);
}

.check input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

.check .box {
    flex: none;
    width: 21px;
    height: 21px;
    border-radius: 6px;
    border: 1.5px solid color-mix(in srgb, var(--ui-muted) 55%, transparent);
    background: var(--ui-card);
    display: grid;
    place-items: center;
    transition:
        background var(--ui-quick) var(--ui-ease),
        border-color var(--ui-quick) var(--ui-ease);
}

.check .box::after {
    content: "";
    width: 10px;
    height: 5.5px;
    border-left: 2px solid var(--ui-on-accent);
    border-bottom: 2px solid var(--ui-on-accent);
    transform: rotate(-45deg) scale(0.5);
    opacity: 0;
    transition:
        opacity var(--ui-quick) var(--ui-ease),
        transform var(--ui-quick) var(--ui-ease);
    margin-top: -2px;
}

.check input:checked + .box {
    background: var(--ui-button-bg);
    border-color: var(--ui-button-bg);
}

.check input:checked + .box::after {
    opacity: 1;
    transform: rotate(-45deg) scale(1);
}

.check input:focus-visible + .box {
    outline: 2px solid var(--ui-accent);
    outline-offset: 2px;
}
</style>
