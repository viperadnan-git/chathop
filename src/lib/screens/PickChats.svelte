<script lang="ts">
import type { PickedChat } from "../api";
import * as api from "../api";
import Chat from "../components/Chat.svelte";
import CopyId from "../components/CopyId.svelte";
import { run } from "../haptics";
import { until } from "../poll";
import { requestChat, TOO_OLD } from "../telegram";
import type { Route } from "../types";
import ActionBar from "../ui/ActionBar.svelte";
import Alert from "../ui/Alert.svelte";
import Card from "../ui/Card.svelte";
import Choices from "../ui/Choices.svelte";
import HeaderAction from "../ui/HeaderAction.svelte";
import Heading from "../ui/Heading.svelte";
import Hero from "../ui/Hero.svelte";
import Icon from "../ui/Icon.svelte";
import Note from "../ui/Note.svelte";
import Row from "../ui/Row.svelte";
import Sheet from "../ui/Sheet.svelte";

let {
    onclose,
    oncreated,
}: {
    onclose: () => void;
    oncreated: (route: Route, routes: Route[]) => void;
} = $props();

type Role = "source" | "destination";
type Kind = "channel" | "group";

// The two kinds `request_chat` makes you choose between: chat_is_channel is
// required, so one prepared button cannot offer both.
const options = [
    { value: "channel", label: "Channel", icon: "channel" },
    { value: "group", label: "Group", icon: "group" },
];

let source = $state<PickedChat | null>(null);
let dest = $state<PickedChat | null>(null);
let asking = $state<Role | null>("source");
let waiting = $state<Role | null>(null);
let error = $state("");
let creating = $state(false);

const ready = $derived(
    !!source && !!dest && source.chatId !== dest.chatId && !waiting,
);

read();

async function read() {
    try {
        const state = await api.pickState();
        source = state.source;
        dest = state.dest;
        error = state.error ?? "";
        asking = source ? (dest ? null : "destination") : "source";
    } catch {}
}

async function choose(role: Role, kind: Kind) {
    if (waiting) return;
    error = "";
    waiting = role;
    try {
        // Opening the list forgets this end, on both sides, so the screen
        // shows what is true and the wait below has something to wait for.
        const buttons = await api.pickButtons(role);
        if (role === "source") source = null;
        else dest = null;

        const picked = await requestChat(buttons[kind]);
        if (picked === "unsupported") error = TOO_OLD;
        // `unknown` means Telegram never said: the server is the only witness.
        else if (picked !== "cancelled") await settle(role);
    } catch (e) {
        error = api.message(e);
    } finally {
        waiting = null;
        if (role === "source" ? source : dest)
            asking = dest ? null : "destination";
        else asking = role;
    }
}

async function settle(role: Role) {
    const landed = await until(
        () => api.pickState(),
        (state) => {
            if (state.error) {
                error = state.error;
                return true;
            }
            if (!(role === "source" ? state.source : state.dest)) return false;
            source = state.source;
            dest = state.dest;
            return true;
        },
        { tries: 15 },
    );
    if (!landed) {
        error =
            "Telegram has not confirmed that yet. Give it a moment and try again.";
    }
}

async function create() {
    const from = source;
    const to = dest;
    if (!ready || creating || !from || !to) return;
    creating = true;
    error = "";
    try {
        const made = await run(() => api.createRoute(from.chatId, to.chatId));
        await api.clearPicker().catch(() => {});
        oncreated(made.route, made.routes);
    } catch (e) {
        error = api.message(e);
    } finally {
        creating = false;
    }
}

async function startOver() {
    await run(() => api.clearPicker()).catch(() => {});
    source = dest = null;
    error = "";
    asking = "source";
}
</script>

{#snippet field(role: Role, chosen: PickedChat | null)}
    <Card>
        {#if waiting === role}
            <Row label="Waiting for Telegram…">
                {#snippet leading()}<Icon name="spinner" size={20} />{/snippet}
            </Row>
        {:else if chosen && asking !== role}
            <div class="chosen">
                <Chat chatId={chosen.chatId} name={chosen.name}>
                    {#snippet description()}<CopyId id={chosen.chatId} />{/snippet}
                    {#snippet trailing()}<Icon name="check" size={18} />{/snippet}
                </Chat>
            </div>
            <Row label="Choose a different chat" tone="accent" onclick={() => (asking = role)} />
        {:else}
            <Choices {options} onpick={(kind) => choose(role, kind as Kind)} />
        {/if}
    </Card>
{/snippet}

{#snippet clearAction()}
    <HeaderAction
        label="Clear"
        tone="danger"
        prominent
        disabled={!source && !dest}
        onclick={startOver}
    >
        {#snippet leading()}<Icon name="undo" size={16} />{/snippet}
    </HeaderAction>
{/snippet}

{#snippet footer()}
    <ActionBar
        label="Start forwarding"
        busyLabel="Setting it up…"
        busy={creating}
        disabled={!ready}
        onclick={create}
    />
{/snippet}

<Sheet
    onback={onclose}
    backLabel="Cancel"
    title="Add forwarding"
    action={clearAction}
    {footer}
>
    <Hero title="Choose two chats">
        {#snippet glyph()}<Icon name="forward" size={46} stroke={1.6} />{/snippet}
        {#snippet lede()}
            New messages in the first chat get copied into the second. Nothing
            happens until you tap <b>Start forwarding</b>.
        {/snippet}
    </Hero>

    {#if error}
        <Alert>{error}</Alert>
    {/if}

    <Heading title="Forward from" />
    {@render field("source", source)}
    <Note>
        Any chat you administer. Telegram adds me and makes me an admin, so I
        can read every message rather than just commands.
    </Note>

    <Heading title="Forward to" />
    {@render field("destination", dest)}
    <Note>
        Any chat you administer. Telegram adds me with permission to post.
    </Note>

    {#if source && dest && source.chatId === dest.chatId}
        <Note tone="danger">A chat cannot forward to itself.</Note>
    {/if}
</Sheet>

<style>
.chosen {
    display: flex;
    padding: 9px var(--ui-gutter);
    box-shadow: inset 0 -1px 0 var(--ui-separator);
}
</style>
