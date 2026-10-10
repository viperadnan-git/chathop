<script lang="ts">
import type { Pane } from "../router";
import type { RouteConfig } from "../types";
import ActionBar from "../ui/ActionBar.svelte";
import Card from "../ui/Card.svelte";
import Heading from "../ui/Heading.svelte";
import Hero from "../ui/Hero.svelte";
import Icon from "../ui/Icon.svelte";
import Note from "../ui/Note.svelte";
import Sheet from "../ui/Sheet.svelte";
import Textarea from "../ui/Textarea.svelte";
import ReplaceList from "./ReplaceList.svelte";
import RuleList from "./RuleList.svelte";

let {
    pane,
    config = $bindable(),
    onclose,
}: { pane: Pane; config: RouteConfig; onclose: () => void } = $props();

const META: Record<Pane, { title: string; icon: string; lede: string }> = {
    allow: {
        title: "Allow only",
        icon: "allow",
        lede: "Only messages matching one of these rules are forwarded. With no rules, everything is.",
    },
    block: {
        title: "Never forward",
        icon: "block",
        lede: "Messages matching any rule here are dropped, even when an allow rule matched them.",
    },
    replace: {
        title: "Find and replace",
        icon: "replace",
        lede: "Rewrites the caption before it is sent. Formatting is kept and re-aligned around your edits.",
    },
    text: {
        title: "Added text",
        icon: "keyword",
        lede: "Text of your own around the caption. Each part goes on its own line.",
    },
};

const meta = $derived(META[pane]);
</script>

{#snippet done()}
    <ActionBar label="Done" onclick={onclose} />
{/snippet}

<Sheet title={meta.title} onback={onclose} footer={done}>
    <Hero title={meta.title}>
        {#snippet glyph()}<Icon name={meta.icon} size={46} stroke={1.6} />{/snippet}
        {#snippet lede()}{meta.lede}{/snippet}
    </Hero>

    {#if pane === "text"}
        <Heading title="Around the caption" />
        <Card>
            <Textarea
                bind:value={config.caption.prepend}
                placeholder="Line above the caption"
            />
            <Textarea
                bind:value={config.caption.append}
                placeholder="Line below the caption"
            />
        </Card>
        <Note>
            Spacing is kept exactly as you type it. Leave a box empty to add
            nothing there.
        </Note>
    {:else if pane === "replace"}
        <ReplaceList bind:rules={config.caption.replace} />
    {:else if pane === "allow"}
        <RuleList bind:rules={config.filters.whitelist} />
    {:else}
        <RuleList bind:rules={config.filters.blacklist} />
    {/if}
</Sheet>
