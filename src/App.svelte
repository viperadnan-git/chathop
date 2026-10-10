<script lang="ts">
import { tick } from "svelte";
import * as api from "./lib/api";
import { ApiError } from "./lib/api";
import { run } from "./lib/haptics";
import { until } from "./lib/poll";
import {
    back,
    currentDepth,
    isOverlay,
    type Loc,
    needsRoutes,
    onLocation,
    parse,
    push,
    replace,
} from "./lib/router";
import AddRoute from "./lib/screens/AddRoute.svelte";
import BotSettings from "./lib/screens/BotSettings.svelte";
import Help from "./lib/screens/Help.svelte";
import PickChats from "./lib/screens/PickChats.svelte";
import Private from "./lib/screens/Private.svelte";
import RouteEditor from "./lib/screens/RouteEditor.svelte";
import Routes from "./lib/screens/Routes.svelte";
import { cached, forget, remember } from "./lib/snapshot.svelte";
import { backButton, close, init, onBackButton } from "./lib/telegram";
import type { Route, RouteConfig } from "./lib/types";
import { isStopped } from "./lib/types";
import { alert, ask } from "./lib/ui/confirm.svelte";
import Dialog from "./lib/ui/Dialog.svelte";

let routes = $state<Route[]>(cached?.routes ?? []);
let loading = $state(true);
let settings = $state<api.Settings | null>(cached?.settings ?? null);
let error = $state("");
let locked = $state(false);

const initialLoc = parse();
let loc = $state<Loc>(initialLoc);
let depth = $state(0);
let editorDirty = $state(false);

// TS cannot narrow `loc` inside the closure, so pull the id out first.
const editing = $derived.by(() => {
    if (loc.name !== "route") return null;
    const id = loc.id;
    return routes.find((r) => r.id === id) ?? null;
});
const pane = $derived(loc.name === "route" ? loc.pane : null);
const manual = $derived(loc.name === "add");
const picking = $derived(loc.name === "pick");
const botSettings = $derived(loc.name === "bot");

let refreshing = $state(false);

// What the next launch paints. It follows the state rather than only the load
// that fetched it: a save or a delete otherwise leaves it a version behind,
// and a screen opening on it would save over newer settings.
$effect(() => {
    if (locked || !settings) return;
    remember({
        routes: $state.snapshot(routes),
        settings: $state.snapshot(settings),
    });
});

async function report(message: string) {
    if (isOverlay(loc)) await alert("That did not work", message);
    else error = message;
}

async function confirmRefresh() {
    const ok = await ask(
        "Refresh this forward?",
        [
            "I will ask Telegram for both chats' current names, and check whether a stopped forward works again.",
            "Doing this often slows the bot down, so use it when something looks out of date.",
        ],
        "Refresh",
        false,
    );
    if (ok) await refresh();
}

// Bumped by everything that writes `routes`, so a poll answer issued before a
// save or a delete cannot land on top of it.
let generation = 0;

async function recheck(id: string) {
    const mine = ++generation;
    refreshing = true;
    error = "";
    try {
        const healthy = (list: Route[]) => {
            // Superseded: stop, rather than overwrite what replaced us.
            if (mine !== generation) return true;
            routes = list;
            const route = list.find((r) => r.id === id);
            return !!route && !isStopped(route.status);
        };

        if (await until(() => api.listRoutes(), healthy)) return;
        if (mine !== generation) return;

        const forced = await api.refreshChatNames();
        if (!healthy(forced.routes)) {
            await report(
                "I still cannot post in that chat. Check my admin rights there.",
            );
        }
    } catch (e) {
        await report(api.message(e));
    } finally {
        refreshing = false;
    }
}

async function refresh() {
    generation++;
    refreshing = true;
    error = "";
    try {
        const result = await run(
            () => api.refreshChatNames(),
            (r) => (r.failed ? "warning" : "success"),
        );
        routes = result.routes;
        if (result.revived) {
            await alert(
                "Back on",
                result.revived === 1
                    ? "One stopped forward works again."
                    : `${result.revived} stopped forwards work again.`,
            );
        }
    } catch (e) {
        error = api.message(e);
    } finally {
        refreshing = false;
    }
}

let loaded = false;

function ensureRoutes(next: Loc) {
    if (!needsRoutes(next) || loaded) return;
    load();
}

async function show(next: Loc, scrollY: number) {
    loc = next;
    depth = currentDepth();
    ensureRoutes(next);
    if (isOverlay(next)) return;
    await tick();
    window.scrollTo(0, scrollY);
}

function go(next: Loc) {
    error = "";
    push(next);
    show(next, 0);
}

function land(next: Loc) {
    error = "";
    replace(next);
    show(next, 0);
}

onLocation(async (next, scrollY) => {
    if (
        loc.name === "route" &&
        next.name !== "route" &&
        editorDirty &&
        !(await ask(
            "Discard unsaved changes?",
            "Your changes here are not saved yet.",
            "Discard",
        ))
    ) {
        push(loc);
        depth = currentDepth();
        return;
    }
    error = "";
    show(next, scrollY);
});

onBackButton(back);

$effect(() => {
    backButton(depth > 0);
});

async function load() {
    loading = !loaded && !cached;
    error = "";
    try {
        const boot = await api.bootstrap();
        generation++;
        routes = boot.routes;
        settings = boot.settings;
        loaded = true;
        if (loc.name === "route") {
            const id = loc.id;
            if (!routes.some((r) => r.id === id)) land({ name: "settings" });
        }
    } catch (e) {
        if (e instanceof ApiError && e.code === "PRIVATE") {
            forget();
            routes = [];
            locked = true;
            return;
        }
        error = api.message(e);
    } finally {
        loading = false;
    }
}

async function setPrivate(on: boolean) {
    const was = settings;
    settings = settings && { ...settings, private: on };
    try {
        await run(() => api.setPrivate(on));
    } catch (e) {
        settings = was;
        error = api.message(e);
    }
}

async function save(
    id: string,
    patch: { config: RouteConfig; status?: string },
) {
    const updated = await run(() => api.updateRoute(id, patch));
    generation++;
    routes = routes.map((r) =>
        r.id === updated.id ? { ...r, ...updated } : r,
    );
    editorDirty = false;
}

async function remove(id: string) {
    const ok = await ask(
        "Delete this destination?",
        "The source keeps forwarding to its other chats.",
        "Delete",
    );
    if (!ok) return;
    await run(() => api.deleteRoute(id));
    generation++;
    routes = routes.filter((r) => r.id !== id);
    editorDirty = false;
    back();
}

// Last, so nothing in the Telegram handshake can stop the app wiring up.
init();

replace(initialLoc);
if (needsRoutes(initialLoc)) ensureRoutes(initialLoc);
else loading = false;
</script>

{#if locked}
    <Private />
{:else if loc.name === "help"}
    <Help
        onback={() => (depth > 0 ? back() : close())}
        backLabel={depth > 0 ? "Back" : "Close"}
    />
{:else}
    <Routes
        {routes}
        {loading}
        {error}
        onopen={(route) => go({ name: "route", id: route.id, pane: null })}
        onpick={() => go({ name: "pick" })}
        onmanual={() => go({ name: "add" })}
        onhelp={() => go({ name: "help" })}
        onbot={() => go({ name: "bot" })}
        {settings}
    />
{/if}

{#if !locked && editing}
    {#key editing.id}
        <RouteEditor
            route={editing}
            {pane}
            onpane={(next) =>
                next
                    ? go({ name: "route", id: editing.id, pane: next })
                    : back()}
            onsave={(patch) => save(editing.id, patch)}
            onclose={back}
            ondelete={() => remove(editing.id)}
            ondirty={(d) => (editorDirty = d)}
            onrefresh={confirmRefresh}
            onfixed={() => recheck(editing.id)}
            {refreshing}
        />
    {/key}

{/if}

{#if !locked && botSettings && settings}
    <BotSettings {settings} onclose={back} onprivate={setPrivate} />
{/if}

{#if !locked && picking}
    <PickChats
        onclose={back}
        oncreated={(route, all) => {
            routes = all;
            // Replaces the picker rather than popping it and pushing: the
            // popstate lands after the push and would undo it. Its own
            // settings are where anyone goes next anyway.
            land({ name: "route", id: route.id, pane: null });
        }}
    />
{/if}

{#if !locked && manual}
    <AddRoute
        onclose={back}
        oncreated={(_route, all) => {
            routes = all;
            back();
        }}
    />
{/if}

<Dialog />
