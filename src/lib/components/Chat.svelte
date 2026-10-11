<script lang="ts">
import type { Snippet } from "svelte";
import Avatar from "../ui/Avatar.svelte";

let {
    chatId,
    name = "",
    description,
    trailing,
    muted = false,
}: {
    chatId: number;
    name?: string;
    description?: Snippet;
    trailing?: Snippet;
    muted?: boolean;
} = $props();
</script>

<span class="chat" class:muted>
    <Avatar {chatId} {name} size="var(--ui-avatar)" />
    <span class="text">
        <span class="name">{name || "Unnamed chat"}</span>
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
.name {
    font-size: var(--ui-body);
    font-weight: var(--ui-weight-button);
    line-height: 1.3;
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
