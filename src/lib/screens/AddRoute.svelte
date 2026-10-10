<script lang="ts">
import * as api from "../api";
import { run } from "../haptics";
import type { Route } from "../types";
import ActionBar from "../ui/ActionBar.svelte";
import Alert from "../ui/Alert.svelte";
import Card from "../ui/Card.svelte";
import Field from "../ui/Field.svelte";
import Hero from "../ui/Hero.svelte";
import Icon from "../ui/Icon.svelte";
import Note from "../ui/Note.svelte";
import Sheet from "../ui/Sheet.svelte";

let {
    onclose,
    oncreated,
}: {
    onclose: () => void;
    oncreated: (route: Route, all: Route[]) => void;
} = $props();

let source = $state("");
let dest = $state("");
let adding = $state(false);
let error = $state("");

const ready = $derived(
    source.trim() !== "" && dest.trim() !== "" && source.trim() !== dest.trim(),
);

async function add() {
    if (!ready || adding) return;
    adding = true;
    error = "";
    try {
        const created = await run(async () => {
            const [from, to] = await Promise.all([
                api.resolveChat(source.trim()),
                api.resolveChat(dest.trim()),
            ]);
            return api.createRoute(from.chatId, to.chatId);
        });
        oncreated(created.route, created.routes);
    } catch (e) {
        error = api.message(e);
    } finally {
        adding = false;
    }
}
</script>

{#snippet submit()}
    <ActionBar
        label="Add forwarding"
        busyLabel="Adding…"
        busy={adding}
        disabled={!ready}
        onclick={add}
    />
{/snippet}

<Sheet title="Add forwarding" onback={onclose} backLabel="Cancel" footer={submit}>
    <Hero title="Enter chats yourself">
        {#snippet glyph()}<Icon name="plus" size={46} stroke={1.6} />{/snippet}
        {#snippet lede()}
            For chats the list does not show. I must already be in both.
        {/snippet}
    </Hero>

    {#if error}
        <Alert>{error}</Alert>
    {/if}

    <Card>
        <Field bind:value={source} placeholder="Source" />
        <Field bind:value={dest} placeholder="Destination" />
    </Card>
    <Note>
        A chat id, an @username or a t.me link. Both are checked when you tap
        Add. In a channel I have to be an admin.
    </Note>
</Sheet>
