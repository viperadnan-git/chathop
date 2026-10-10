<script lang="ts">
import type { Settings } from "../api";
import RouteLink from "../components/RouteLink.svelte";
import RouteSkeleton from "../components/RouteSkeleton.svelte";
import { project } from "../project";
import { type Route, withDefaults } from "../types";
import Alert from "../ui/Alert.svelte";
import Card from "../ui/Card.svelte";
import Heading from "../ui/Heading.svelte";
import Hero from "../ui/Hero.svelte";
import Icon from "../ui/Icon.svelte";
import Note from "../ui/Note.svelte";
import Row from "../ui/Row.svelte";
import Screen from "../ui/Screen.svelte";

let {
    routes,
    loading,
    error,
    onopen,
    onpick,
    onmanual,
    onhelp,
    onbot,
    settings,
}: {
    routes: Route[];
    loading: boolean;
    error: string;
    onopen: (route: Route) => void;
    onpick: () => void;
    onmanual: () => void;
    onhelp: () => void;
    onbot: () => void;
    settings: Settings | null;
} = $props();

const grouped = $derived.by(() => {
    const bySource = new Map<number, Route[]>();
    for (const route of routes) {
        const group = bySource.get(route.sourceChatId);
        if (group) group.push(route);
        else bySource.set(route.sourceChatId, [route]);
    }
    return [...bySource].sort(([a], [b]) => a - b);
});

function chips(route: Route): string[] {
    const c = withDefaults(route.config);
    const out: string[] = [];
    if (c.mode === "forward") out.push("forward");
    if (c.protectContent) out.push("protected");
    if (c.silent) out.push("silent");
    if (c.removeButtons) out.push("no buttons");
    if (c.filters.whitelist.length)
        out.push(`${c.filters.whitelist.length} allow`);
    if (c.filters.blacklist.length)
        out.push(`${c.filters.blacklist.length} block`);
    if (c.caption.strip) return [...out, "no caption"];
    if (c.caption.removeLinks) out.push("no links");
    if (c.caption.removeMentions) out.push("no mentions");
    if (c.caption.prepend || c.caption.append) out.push("signature");
    if (c.caption.replace.length)
        out.push(`${c.caption.replace.length} replace`);
    return out;
}

const plural = (n: number, one: string, many = `${one}s`) =>
    `${n} ${n === 1 ? one : many}`;
</script>

<Screen credit>
    <Hero title="chathop">
        {#snippet glyph()}<Icon name="mark" size={46} stroke={1.6} />{/snippet}
        {#snippet lede()}
            {#if loading}
                &nbsp;
            {:else if routes.length}
                {plural(grouped.length, "source")} · {plural(routes.length, "destination")}
            {:else}
                {project.tagline}
            {/if}
        {/snippet}
    </Hero>

    {#if error}
        <Alert>{error}</Alert>
    {/if}

    {#if loading}
        <RouteSkeleton destinations={2} />
        <RouteSkeleton />
    {:else if routes.length}
        {#each grouped as [source, dests] (source)}
            <RouteLink
                sourceChatId={source}
                sourceName={dests[0].sourceName}
                routes={dests}
                {chips}
                {onopen}
            />
        {/each}
    {/if}

<Heading title="Add forwarding" />
    <Card>
        <Row
            label="Pick from a list"
            description="Choose chats from Telegram's picker"
            chevron
            onclick={onpick}
        >
            {#snippet leading()}<Icon name="channel" size={22} />{/snippet}
        </Row>
        <Row
            label="Enter chats yourself"
            description="For a chat the list does not show"
            chevron
            onclick={onmanual}
        >
            {#snippet leading()}<Icon name="keyword" size={22} />{/snippet}
        </Row>
    </Card>

    <Heading title="This bot" />
    <Card>
        <Row label="How it works" chevron onclick={onhelp}>
            {#snippet leading()}<Icon name="help" size={22} />{/snippet}
        </Row>
        {#if settings?.isAdmin}
            <Row label="Bot settings" chevron onclick={onbot}>
                {#snippet leading()}<Icon name="gear" size={22} />{/snippet}
            </Row>
        {/if}
    </Card>

</Screen>
