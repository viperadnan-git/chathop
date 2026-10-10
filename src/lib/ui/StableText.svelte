<script lang="ts">
/**
 * Text that changes without moving anything: every alternative shares one
 * grid cell, so the cell is as tall as the longest.
 *
 * `visibility`, not `display` — a hidden grid item still occupies its cell.
 */
let { options, active }: { options: Record<string, string>; active: string } =
    $props();
</script>

<span class="ui-stable">
    {#each Object.entries(options) as [key, text] (key)}
        <span class:on={key === active} aria-hidden={key !== active}>{text}</span>
    {/each}
</span>

<style>
.ui-stable {
    display: grid;
}
.ui-stable > span {
    grid-area: 1 / 1;
    visibility: hidden;
}
.ui-stable > .on {
    visibility: visible;
}
</style>
