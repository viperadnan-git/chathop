<script lang="ts">
import Card from "../ui/Card.svelte";

let { items }: { items: [string, string][] } = $props();
</script>

<Card>
    {#each items as [literal, what] (literal)}
        {@const [head, ...rest] = literal.split(" ")}
        <div class="item">
            <code>
                <span class="head">{head}</span>{#if rest.length}<span
                        class="args">&nbsp;{rest.join(" ")}</span
                    >{/if}
            </code>
            <span class="what">{what}</span>
        </div>
    {/each}
</Card>

<style>
.item {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 11px var(--ui-gutter);
}
.item:not(:last-child) {
    box-shadow: inset 0 -1px 0 var(--ui-separator);
}
code {
    font-family: ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace;
    font-size: calc(var(--ui-note) + 1px);
    line-height: 1.35;
    overflow-wrap: anywhere;
}
.head {
    color: var(--ui-accent);
    font-weight: 500;
}
.args {
    color: var(--ui-muted);
}
.what {
    font-size: var(--ui-note);
    line-height: 1.35;
    color: var(--ui-muted);
}
</style>
