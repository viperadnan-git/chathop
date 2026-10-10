<script lang="ts">
import type { Snippet } from "svelte";

let { title, trailing }: { title: string; trailing?: Snippet } = $props();
</script>

<div class="ui-heading">
    <h2>{title}</h2>
    {#if trailing}<div class="trailing">{@render trailing()}</div>{/if}
</div>

<style>
.ui-heading {
    display: flex;
    align-items: center;
    gap: var(--ui-gap);
    padding: 0 var(--ui-gutter);
    margin-bottom: 10px;
}
h2 {
    flex: 1;
    min-width: 0;
    margin-block: 0;
    font-size: var(--ui-heading);
    font-weight: var(--ui-weight-heading);
    letter-spacing: -0.01em;
    color: var(--ui-text);
}
.trailing {
    display: flex;
    align-items: center;
    gap: var(--ui-gap);
    flex-shrink: 0;
}
</style>
