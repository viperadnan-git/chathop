<script lang="ts">
import { isStopped, type Route } from "../types";
import Card from "../ui/Card.svelte";
import Icon from "../ui/Icon.svelte";
import Chat from "./Chat.svelte";
import CopyId from "./CopyId.svelte";

let {
    sourceChatId,
    sourceName,
    routes,
    marks,
    onopen,
}: {
    sourceChatId: number;
    sourceName?: string;
    routes: Route[];
    marks?: (route: Route) => string[];
    onopen?: (route: Route) => void;
} = $props();
</script>

<Card>
    <div class="source">
        <span class="rail stem from" aria-hidden="true"></span>
        <Chat chatId={sourceChatId} name={sourceName}>
            {#snippet description()}<CopyId id={sourceChatId} />{/snippet}
        </Chat>
    </div>

    {#each routes as route, i (route.id)}
        {@const glyphs = marks?.(route) ?? []}
        {@const last = i === routes.length - 1}
        <div class="dest">
            {#if onopen}
                <button
                    type="button"
                    class="hit"
                    onclick={() => onopen(route)}
                    aria-label="Edit {route.destName || route.destChatId}"
                ></button>
            {/if}
            <span class="rail stem" class:turn={last} aria-hidden="true"></span>
            {#if !last}<span class="rail arm" aria-hidden="true"></span>{/if}

            <Chat
                chatId={route.destChatId}
                name={route.destName}
                muted={route.status !== "active"}
            >
                {#snippet badge()}
                    {#if route.status !== "active"}
                        {@const halted = isStopped(route.status)}
                        <span class:stopped={halted} class:paused={!halted}>
                            <Icon
                                name={halted ? "block" : "pause"}
                                size={14}
                                stroke={2.3}
                            />
                        </span>
                    {/if}
                {/snippet}
                {#snippet description()}
                    <span class="line">
                        <CopyId id={route.destChatId} />
                        {#if glyphs.length}
                            <span class="sep"></span>
                            <span class="marks">
                                {#each glyphs as glyph (glyph)}
                                    <Icon name={glyph} size={13} stroke={2.2} />
                                {/each}
                            </span>
                        {/if}
                    </span>
                {/snippet}
            </Chat>
            {#if onopen}<span class="chevron"><Icon name="next" size={16} /></span>{/if}
        </div>
    {/each}
</Card>

<style>
.source,
.dest {
    --rail-w: 1.5px;
    --rail-pad: 11px;
    --rail-x: calc(var(--rail-pad) + var(--ui-avatar) / 2);
    --rail-y: calc(9px + var(--ui-avatar) / 2);
    --rail-arm: 13px;
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: var(--ui-gap);
    padding: 9px var(--ui-gutter) 9px var(--rail-pad);
}
.dest {
    padding-left: calc(var(--rail-x) + var(--rail-arm));
}
.dest:not(:last-child)::after {
    content: "";
    position: absolute;
    left: calc(var(--ui-gutter) * 2 + var(--ui-avatar) + 22px);
    right: 0;
    bottom: 0;
    height: 1px;
    background: var(--ui-separator);
}
.hit {
    position: absolute;
    inset: 0;
    border: 0;
    background: none;
    cursor: pointer;
}

/*
 * The hit area covers the row, so content sits above it and lets clicks
 * through. CopyId puts `pointer-events: auto` back on itself — it is the one
 * thing in the row that is not the row.
 */
.dest > :global(.chat),
.dest > .chevron {
    position: relative;
    z-index: var(--ui-z-raised);
    pointer-events: none;
}
.hit:active {
    background: var(--ui-press);
}
@media (hover: hover) and (pointer: fine) {
    .hit:hover {
        background: var(--ui-hover);
    }
}
/* The stroke is translucent, so two of them must never cross: where they do,
   the colour doubles and the junction shows as a dark pip. Hence the width in
   a variable — the arm starts where the stem's stroke ends. */
.rail {
    position: absolute;
    left: var(--rail-x);
    width: var(--rail-arm);
    pointer-events: none;
}
.dest > .stem {
    top: 0;
    bottom: 0;
    border-left: var(--rail-w) solid var(--ui-rail);
}
.dest > .stem.turn {
    bottom: auto;
    height: var(--rail-y);
    border-bottom: var(--rail-w) solid var(--ui-rail);
    border-bottom-left-radius: 8px;
}
.dest > .arm {
    top: var(--rail-y);
    left: calc(var(--rail-x) + var(--rail-w));
    width: calc(var(--rail-arm) - var(--rail-w));
    border-bottom: var(--rail-w) solid var(--ui-rail);
}
.source > .stem.from {
    top: var(--rail-y);
    bottom: 0;
    border-left: var(--rail-w) solid var(--ui-rail);
}
/* An id is the same width for every chat; a name would not have been. */
.line {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    margin-top: 3px;
}
/* The id carries that offset everywhere else; here the line does. */
.line :global(.cid) {
    margin-top: 0;
}
.sep {
    width: 1px;
    height: 11px;
    flex: none;
    /* Cancels the copy button's padding, which sits inside the id's box. */
    margin-left: -6px;
    background: var(--ui-rail);
}
.marks {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: none;
    color: var(--ui-muted);
}
.stopped {
    color: var(--ui-danger);
}
.paused {
    color: var(--ui-muted);
}
.chevron {
    display: flex;
    align-self: center;
    flex-shrink: 0;
    color: var(--ui-muted);
}
</style>
