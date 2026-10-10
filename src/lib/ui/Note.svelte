<script lang="ts">
import type { Snippet } from "svelte";

let { tone = "", children }: { tone?: "" | "danger"; children: Snippet } =
    $props();
</script>

<p class="ui-note {tone}">{@render children()}</p>

<style>
.ui-note {
    margin-block: 8px 0;
    padding: 0 var(--ui-gutter);
    font-size: var(--ui-note);
    line-height: 1.4;
    color: var(--ui-muted);
}
.danger {
    color: var(--ui-danger);
}
.ui-note :global(a) {
    color: var(--ui-accent);
    text-decoration: none;
}
</style>
