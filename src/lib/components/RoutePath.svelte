<script lang="ts">
import Avatar from "../ui/Avatar.svelte";
import Icon from "../ui/Icon.svelte";

let {
    sourceChatId,
    sourceName,
    destChatId,
    destName,
    tone,
}: {
    sourceChatId: number;
    sourceName?: string;
    destChatId: number;
    destName: string;
    /** on: running. off: paused by the owner. bad: stopped by a failure. */
    tone: "on" | "off" | "bad";
} = $props();

const ARROWS = [0, 1, 2];
</script>

<div class="ends {tone}" aria-hidden="true">
    <Avatar chatId={sourceChatId} name={sourceName ?? ""} size="var(--ui-avatar-lg)" />

    <span class="path">
        {#if tone === "bad"}
            <Icon name="onward" size={19} stroke={2.8} />
            <span class="mark"><Icon name="block" size={17} stroke={2.4} /></span>
            <Icon name="onward" size={19} stroke={2.8} />
        {:else}
            {#each ARROWS as i (i)}
                <span class="chevron" style="--i: {i}">
                    <Icon name="onward" size={19} stroke={2.8} />
                </span>
            {/each}
        {/if}
    </span>

    <Avatar chatId={destChatId} name={destName} size="var(--ui-avatar-lg)" />
</div>

<style>
.ends {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px var(--ui-gutter);
    color: var(--ui-muted);
}
.on {
    color: var(--ui-accent);
}
.bad {
    color: var(--ui-danger);
}
.path {
    display: flex;
    align-items: center;
    gap: 0;
    flex: none;
}
.chevron {
    display: flex;
    opacity: 0.4;
}
.on .chevron {
    animation: chase 1.1s linear infinite;
    animation-delay: calc(var(--i) * 0.16s);
}
@keyframes chase {
    0%,
    60%,
    100% {
        opacity: 0.4;
    }
    22% {
        opacity: 1;
    }
}
.mark {
    display: flex;
    margin: 0 3px;
}
.bad .path :global(svg:not(.mark svg)) {
    opacity: 0.5;
}
@media (prefers-reduced-motion: reduce) {
    .on .chevron {
        animation: none;
        opacity: 0.85;
    }
}
</style>
