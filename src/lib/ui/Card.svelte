<script lang="ts">
import type { Snippet } from "svelte";

let { children }: { children: Snippet } = $props();
</script>

<div class="ui-card">{@render children()}</div>

<style>
.ui-card {
    background: var(--ui-card);
    border-radius: var(--ui-r-card);
    overflow: hidden;
}
</style>
