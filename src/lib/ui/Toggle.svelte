<script lang="ts">
import { selection } from "../haptics";

// Blue on, salmon off. Unusual — most switches go grey when off — but it is
// what the reference does, and the whole row is the target.
let {
    checked = $bindable(false),
    label,
    onchange,
}: {
    checked?: boolean;
    label: string;
    onchange?: (checked: boolean) => void;
} = $props();
</script>

<button
    type="button"
    class="ui-toggle"
    class:on={checked}
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onclick={() => {
        checked = !checked;
        selection();
        onchange?.(checked);
    }}
>
    <span class="knob"></span>
</button>

<style>
.ui-toggle {
    width: 46px;
    height: 28px;
    flex-shrink: 0;
    padding: 3px;
    border: 0;
    border-radius: var(--ui-r-pill);
    background: var(--ui-danger);
    display: flex;
    cursor: pointer;
    transition: background var(--ui-swift) var(--ui-ease);
}
.on {
    background: var(--ui-button-bg);
}
.knob {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    transition: transform var(--ui-swift) var(--ui-ease);
}
.on .knob {
    transform: translateX(18px);
}
@media (prefers-reduced-motion: reduce) {
    .ui-toggle,
    .knob {
        transition: none;
    }
}
</style>
