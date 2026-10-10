<script lang="ts">
import Card from "../ui/Card.svelte";
import Shimmer from "../ui/Shimmer.svelte";

// The shape a RouteLink will be: a source with its avatar, and a destination
// indented under the rail. Same paddings and sizes, so nothing moves when the
// real list replaces this.
let { destinations = 1 }: { destinations?: number } = $props();
</script>

<Card>
    <div class="line">
        <Shimmer width="var(--ui-avatar)" height="var(--ui-avatar)" radius="50%" />
        <span class="text">
            <Shimmer width="58%" height="15px" />
            <Shimmer width="34%" height="13px" />
        </span>
    </div>
    {#each { length: destinations } as _}
        <div class="line indent">
            <Shimmer width="var(--ui-avatar)" height="var(--ui-avatar)" radius="50%" />
            <span class="text">
                <Shimmer width="46%" height="15px" />
                <Shimmer width="28%" height="13px" />
            </span>
        </div>
    {/each}
</Card>

<style>
.line {
    display: flex;
    align-items: flex-start;
    gap: var(--ui-gap);
    padding: 9px var(--ui-gutter);
}
.indent {
    padding-left: calc(var(--ui-gutter) + 22px);
}
.text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding-top: 2px;
}
</style>
