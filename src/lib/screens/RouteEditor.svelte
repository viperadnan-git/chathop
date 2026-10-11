<script lang="ts">
import { untrack } from "svelte";
import {
    defaultConfig,
    hasCaptionTransform,
    isBlankReplacement,
    isBlankRule,
    pruneConfig,
    replacementIssue,
    ruleIssue,
} from "$config";
import { isStopped, statusLabel } from "$status";
import * as api from "../api";
import Deliveries from "../components/Deliveries.svelte";
import RouteLink from "../components/RouteLink.svelte";
import RoutePath from "../components/RoutePath.svelte";
import RulePane from "../components/RulePane.svelte";
import type { Pane } from "../router";
import { requestChat, TOO_OLD } from "../telegram";
import {
    type Route,
    type RouteConfig,
    type Rule,
    relativeTime,
    withDefaults,
} from "../types";
import Alert from "../ui/Alert.svelte";
import Card from "../ui/Card.svelte";
import Choices from "../ui/Choices.svelte";
import { alert, ask } from "../ui/confirm.svelte";
import HeaderAction from "../ui/HeaderAction.svelte";
import Heading from "../ui/Heading.svelte";
import Icon from "../ui/Icon.svelte";
import IconButton from "../ui/IconButton.svelte";
import Note from "../ui/Note.svelte";
import Row from "../ui/Row.svelte";
import Segmented from "../ui/Segmented.svelte";
import Sheet from "../ui/Sheet.svelte";
import StableText from "../ui/StableText.svelte";
import Toggle from "../ui/Toggle.svelte";

let {
    route,
    pane,
    onpane,
    onsave,
    onclose,
    ondelete,
    ondirty,
    onrefresh,
    onfixed,
    refreshing,
}: {
    route: Route;
    pane: Pane | null;
    onpane: (pane: Pane | null) => void;
    onsave: (patch: { config: RouteConfig; status?: string }) => Promise<void>;
    onclose: () => void;
    ondelete: () => Promise<void>;
    ondirty: (dirty: boolean) => void;
    onrefresh: () => void;
    onfixed: () => Promise<void>;
    refreshing: boolean;
} = $props();

// Read once on purpose: the parent keys this component on route.id, so a
// different route remounts rather than reusing this state. untrack says so
// to the compiler, which otherwise warns about the one-time read.
const wasActive = untrack(() => route.status === "active");

const seed = untrack(() => withDefaults(route.config));
let openedConfig = $state<RouteConfig>(seed);
// Its own copy: withDefaults is deep, so editing one is not editing the other.
let config = $state<RouteConfig>(withDefaults(seed));
let saving = $state(false);

const changed = $derived(relativeTime(route.updatedAt));
const delivered = $derived(relativeTime(route.lastForwardedAt ?? undefined));

let serverActive = $state(wasActive);
let active = $state(wasActive);

$effect(() => {
    const now = route.status === "active";
    if (now === serverActive) return;
    serverActive = now;
    active = now;
});

// An empty box and an absent field are the same stored config, so typing a
// character and deleting it is not an edit.
const fingerprint = (config: RouteConfig, active: boolean) =>
    JSON.stringify({ config, active }, (_, v) => (v === "" ? undefined : v));

const snapshot = $derived($state.snapshot(config));
const opened = $derived(fingerprint(openedConfig, serverActive));
const dirty = $derived(fingerprint(snapshot, active) !== opened);

$effect(() => ondirty(dirty));

// A cached launch paints the list before the server answers, so this screen
// can open on a config that is already out of date. Re-seeded only while
// nothing is pending: a save then posts what the server holds, plus the edit.
$effect(() => {
    if (dirty) return;
    const fresh = withDefaults(route.config);
    if (fingerprint(fresh, serverActive) === opened) return;
    openedConfig = fresh;
    config = withDefaults(route.config);
});

const stopped = $derived(isStopped(route.status));

const FIXABLE = ["removed", "no_rights", "not_admin", "gone"];
const CHAT_KINDS = [
    { value: "channel", label: "Channel", icon: "channel" },
    { value: "group", label: "Group", icon: "group" },
];
const fixable = $derived(FIXABLE.includes(route.status));
let fixing = $state(false);

async function fix(kind: "channel" | "group") {
    if (fixing) return;
    fixing = true;
    try {
        const buttons = await api.pickButtons("fix");
        const picked = await requestChat(buttons[kind]);
        if (picked === "unsupported") await alert("Update Telegram", TOO_OLD);
        else if (picked === "picked") await onfixed();
    } catch (e) {
        await alert("That did not work", api.message(e));
    } finally {
        fixing = false;
    }
}

const transforms = $derived(hasCaptionTransform(config));
const conflict = $derived(
    config.mode === "forward" && (transforms || config.removeButtons),
);

const bad = (rules: Rule[]) =>
    rules.filter((r) => !isBlankRule(r) && ruleIssue(r)).length;

const badAllow = $derived(bad(config.filters.whitelist));
const badBlock = $derived(bad(config.filters.blacklist));
const badRules = $derived(badAllow + badBlock);
const badReplacements = $derived(
    config.caption.replace.filter(
        (r) => !isBlankReplacement(r) && replacementIssue(r),
    ).length,
);
const incomplete = $derived(badRules + badReplacements > 0);

// Leaves the status alone: resuming a paused destination would start
// delivering, which is not what "reset the settings" implies.
const DEFAULTS = JSON.stringify(defaultConfig());
const isDefault = $derived(JSON.stringify(snapshot) === DEFAULTS);

async function reset() {
    const ok = await ask(
        "Reset to defaults?",
        [
            "Every filter and text rule here is cleared, and messages go back to a plain copy.",
            "Nothing is saved until you tap Save.",
        ],
        "Reset",
    );
    if (ok) config = defaultConfig();
}

async function save() {
    saving = true;
    try {
        await onsave({
            config: pruneConfig(snapshot as RouteConfig),
            // Only when the switch moved: sending "paused" for an untouched
            // stopped route would overwrite why it stopped.
            ...(active === serverActive
                ? {}
                : { status: active ? "active" : "paused" }),
        });
        // What was saved is the new baseline, or Save stays lit and
        // backing out asks about changes already written.
        openedConfig = withDefaults($state.snapshot(config));
    } catch (e) {
        await alert("Could not save", api.message(e));
    } finally {
        saving = false;
    }
}

const count = (n: number) => (n === 0 ? "None" : `${n}`);

const addedText = $derived(
    config.caption.prepend && config.caption.append
        ? "Above and below"
        : config.caption.prepend
          ? "Above"
          : config.caption.append
            ? "Below"
            : "None",
);
</script>

{#snippet modeHint()}
    <StableText
        active={config.mode}
        options={{
            copy: "Sent as a new message",
            forward: "Shows “Forwarded from”"
        }}
    />
{/snippet}

{#snippet statusHint()}
    <StableText
        active={active ? "on" : stopped ? "stopped" : "paused"}
        options={{
            on: "New messages are copied to this destination",
            stopped: "Stopped because sending failed",
            paused: "Paused — nothing is sent to this destination"
        }}
    />
{/snippet}

{#snippet saveAction()}
    <HeaderAction
        label="Save"
        prominent
        disabled={saving || conflict || incomplete}
        onclick={save}
    >
        {#snippet leading()}
            <Icon name={saving ? "spinner" : "check"} size={16} />
        {/snippet}
    </HeaderAction>
{/snippet}

<Sheet title="Destination" onback={onclose} action={saveAction}>
    <RoutePath
        sourceChatId={route.sourceChatId}
        sourceName={route.sourceName}
        destChatId={route.destChatId}
        destName={String(route.destName || route.destChatId)}
        tone={serverActive ? "on" : stopped ? "bad" : "off"}
    />
    {@const from = route.sourceName || route.sourceChatId}
    {@const to = route.destName || route.destChatId}
    <p class="lede">
        {#if serverActive}
            Every new message in <b>{from}</b> is copied to <b>{to}</b>.
        {:else if stopped}
            {statusLabel(route.status)} — nothing goes from <b>{from}</b> to
            <b>{to}</b>.
        {:else}
            Paused — nothing goes from <b>{from}</b> to <b>{to}</b>.
        {/if}
    </p>

    <Heading title="Route">
        {#snippet trailing()}
            <IconButton
                name={refreshing ? "spinner" : "refresh"}
                label="Refresh chat names"
                disabled={refreshing}
                onclick={onrefresh}
            />
        {/snippet}
    </Heading>
    <RouteLink
        sourceChatId={route.sourceChatId}
        sourceName={route.sourceName}
        routes={[route]}
    />
    {#if changed}
        <Note>Changed {changed}.</Note>
    {/if}

    {#if stopped}
        <Alert>
            I stopped this forward: {statusLabel(route.status)}.
        </Alert>
        {#if fixable}
            <Heading title="Give me access" />
            <Card>
                <Choices
                    options={CHAT_KINDS}
                    disabled={fixing || refreshing}
                    onpick={(kind) => fix(kind as "channel" | "group")}
                />
            </Card>
            <Note>
                Telegram will ask which chat, and add me there with permission
                to post. Pick the one this forward uses.
            </Note>
        {:else}
            <Note>Fix it in Telegram, then switch it back on.</Note>
        {/if}
    {/if}

    <Heading title="Status" />
    <Card>
        <Row label="Forwarding active">
            {#snippet detail()}{@render statusHint()}{/snippet}
            {#snippet trailing()}<Toggle bind:checked={active} label="Forwarding active" />{/snippet}
        </Row>
        <Deliveries forwarded={route.forwarded} last={delivered} />
    </Card>

    <Heading title="Delivery" />
    <Card>
        <Row label="How to send">
            {#snippet detail()}{@render modeHint()}{/snippet}
            {#snippet trailing()}
                <Segmented
                    bind:value={config.mode}
                    options={[
                        { value: "copy", label: "Copy" },
                        { value: "forward", label: "Forward" }
                    ]}
                />
            {/snippet}
        </Row>
        <Row label="Restrict saving" description="Nobody can save the media or copy the text">
            {#snippet trailing()}<Toggle bind:checked={config.protectContent} label="Restrict saving" />{/snippet}
        </Row>
        <Row label="Send silently" description="Arrives without a notification sound">
            {#snippet trailing()}<Toggle bind:checked={config.silent} label="Send silently" />{/snippet}
        </Row>
        <Row label="Remove buttons" description="Drop the buttons under the original message">
            {#snippet trailing()}<Toggle bind:checked={config.removeButtons} label="Remove buttons" />{/snippet}
        </Row>
    </Card>

    {#if conflict}
        <Alert>
            Forward sends the original as it is, so it cannot change the text
            or drop buttons. Switch to Copy, or turn those off.
        </Alert>
    {/if}

    <Heading title="Filters" />
    <Card>
        <Row
            label="Allow only"
            value={count(config.filters.whitelist.length)}
            valueTone={badAllow ? "danger" : ""}
            chevron
            onclick={() => onpane("allow")}
        >
            {#snippet leading()}<Icon name="allow" size={22} />{/snippet}
        </Row>
        <Row
            label="Never forward"
            value={count(config.filters.blacklist.length)}
            valueTone={badBlock ? "danger" : ""}
            chevron
            onclick={() => onpane("block")}
        >
            {#snippet leading()}<Icon name="block" size={22} />{/snippet}
        </Row>
    </Card>
    <Note>
        With no allow rules everything gets through. Blocking always wins.
    </Note>

    <Heading title="Caption" />
    <Card>
        <Row label="Remove caption" description="Send the media with no text at all">
            {#snippet trailing()}<Toggle bind:checked={config.caption.strip} label="Remove caption" />{/snippet}
        </Row>
        {#if !config.caption.strip}
            <Row label="Remove links">
            {#snippet trailing()}<Toggle bind:checked={config.caption.removeLinks} label="Remove links" />{/snippet}
        </Row>
            <Row label="Remove @mentions">
            {#snippet trailing()}<Toggle bind:checked={config.caption.removeMentions} label="Remove @mentions" />{/snippet}
        </Row>
        {/if}
    </Card>

    {#if !config.caption.strip}
        <Card>
            <Row
                label="Added text"
                value={addedText}
                chevron
                onclick={() => onpane("text")}
            >
                {#snippet leading()}<Icon name="keyword" size={22} />{/snippet}
            </Row>
        </Card>
        <Note>
            Your own text above and below the caption, each on its own line.
        </Note>

        <Card>
            <Row
                label="Find and replace"
                value={count(config.caption.replace.length)}
                valueTone={badReplacements ? "danger" : ""}
                chevron
                onclick={() => onpane("replace")}
            >
                {#snippet leading()}<Icon name="replace" size={22} />{/snippet}
            </Row>
        </Card>
        <Note>
            Bold, links and other formatting are kept and re-aligned around your
            edits.
        </Note>
    {/if}

    {#if incomplete}
        <Alert>
            {#if badRules}
                {badRules === 1 ? "A rule needs" : `${badRules} rules need`}
                finishing.
            {/if}
            {#if badReplacements}
                {badReplacements === 1
                    ? "A replacement needs"
                    : `${badReplacements} replacements need`} finishing.
            {/if}
        </Alert>
    {/if}



    <Heading title="Actions" />
    <Card>
        <Row
            label="Save changes"
            tone="accent"
            disabled={saving || conflict || incomplete}
            onclick={save}
        >
            {#snippet leading()}
                <Icon name={saving ? "spinner" : "check"} size={22} />
            {/snippet}
        </Row>
        <Row
            label="Reset to defaults"
            disabled={isDefault || saving}
            onclick={reset}
        >
            {#snippet leading()}<Icon name="undo" size={22} />{/snippet}
        </Row>
        <Row label="Delete this destination" tone="danger" onclick={ondelete}>
            {#snippet leading()}<Icon name="trash" size={22} />{/snippet}
        </Row>
    </Card>
    <Note>
    Deleting leaves the source forwarding to its other destinations.
    </Note>
</Sheet>

{#if pane}
    <RulePane {pane} bind:config onclose={() => onpane(null)} />
{/if}

<style>
.lede {
    margin: -6px auto 0;
    max-width: min(18rem, 100% - 2.5rem);
    text-align: center;
    text-wrap: balance;
    font-size: var(--ui-note);
    line-height: 1.4;
    color: var(--ui-muted);
}
</style>
