<script lang="ts">
import type { Snippet } from "svelte";
import Avatar from "../ui/Avatar.svelte";

let {
    chatId,
    name = "",
    description,
    badge,
    trailing,
    muted = false,
}: {
    chatId: number;
    name?: string;
    description?: Snippet;
    badge?: Snippet;
    trailing?: Snippet;
    muted?: boolean;
} = $props();
</script>

<span class="chat" class:muted>
    <Avatar {chatId} {name} size="var(--ui-avatar)" />
    <span class="text">
        <span class="title">
            {#if badge}<span class="badge">{@render badge()}</span>{/if}
            <span class="name">{name || "Unnamed chat"}</span>
        </span>
        {#if description}<span class="detail">{@render description()}</span>{/if}
    </span>
    {#if trailing}<span class="trailing">{@render trailing()}</span>{/if}
</span>

<style>
.chat {
    display: flex;
    align-items: flex-start;
    gap: var(--ui-gap);
    min-width: 0;
    flex: 1;
}
.text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
    /* Centres the pair against the avatar: 40px of picture beside 39px of
       text leaves half a pixel at each end, and this takes it off the top. */
    padding-top: 1px;
}
.title {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    /* Matches the name's own line-height: inheriting the root's taller one
       made the row 0.75px deeper than its text and threw the centring off. */
    line-height: 1.3;
}
.badge {
    display: flex;
    flex: none;
    /* Centring the glyph on the line box leaves it 2px above the letters:
       the box carries ascender space the capitals do not fill. Measured from
       a screenshot, not derived. */
    position: relative;
    top: 2px;
}
.name {
    font-size: var(--ui-body);
    font-weight: var(--ui-weight-button);
    line-height: 1.3;
    /* A flex item will not shrink below its text without this, and then the
       ellipsis never arrives. */
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.muted .name {
    color: var(--ui-muted);
}
.detail {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    min-width: 0;
}
.trailing {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    align-self: center;
}
</style>
