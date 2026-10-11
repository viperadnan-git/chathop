<script lang="ts">
let {
    forwarded,
    last,
}: {
    forwarded: number;
    last?: string;
} = $props();
</script>

<div class="deliveries">
    {#if forwarded}
        <span class="measure">
            <span class="value">{last ?? "a while ago"}</span>
            <span class="label">last forwarded</span>
        </span>
        <span class="measure end">
            <span class="value tally">{forwarded.toLocaleString()}</span>
            <span class="label">delivered</span>
        </span>
    {:else}
        <span class="measure">
            <span class="value">Nothing forwarded yet</span>
            <span class="label">only new messages are copied, not old ones</span>
        </span>
    {/if}
</div>

<style>
.deliveries {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--ui-gap);
    min-height: var(--ui-row);
    padding: 9px var(--ui-gutter);
}
.measure {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
}
.end {
    align-items: flex-end;
    text-align: right;
    /* Never shrinks: a clipped total would misread. */
    flex: none;
}
.measure:only-child .label {
    white-space: normal;
}
.value,
.label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.value {
    font-size: var(--ui-body);
    font-weight: var(--ui-weight-button);
}
.tally {
    font-variant-numeric: tabular-nums;
}
.label {
    font-size: var(--ui-caption);
    color: var(--ui-muted);
}
</style>
