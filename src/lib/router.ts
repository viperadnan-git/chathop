export type Pane = "allow" | "block" | "replace" | "text";

export type Loc =
    | { name: "settings" | "help" | "add" | "pick" | "bot" }
    | { name: "route"; id: string; pane: Pane | null };

const TOP = ["settings", "help", "add", "pick", "bot"] as const;

const PANES: readonly string[] = ["allow", "block", "replace", "text"];

export function parse(path: string = location.pathname): Loc {
    const parts = path
        .replace(/^\//, "")
        .replace(/\/$/, "")
        .split("/")
        .filter(Boolean);

    if (parts[0] === "route" && parts[1]) {
        return {
            name: "route",
            id: parts[1],
            pane: PANES.includes(parts[2]) ? (parts[2] as Pane) : null,
        };
    }
    if ((TOP as readonly string[]).includes(parts[0])) {
        return { name: parts[0] as (typeof TOP)[number] };
    }
    return { name: "settings" };
}

export function href(loc: Loc): string {
    const path =
        loc.name === "route"
            ? `/route/${loc.id}${loc.pane ? `/${loc.pane}` : ""}`
            : `/${loc.name}`;
    return `${path}${location.search}${location.hash}`;
}

export const needsRoutes = (loc: Loc) => loc.name !== "help";

export const isOverlay = (loc: Loc) =>
    loc.name !== "settings" && loc.name !== "help";

// The browser cannot restore scroll for content it did not navigate to, so the
// router owns it: each entry remembers where its screen was left.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

type Entry = { depth: number; scrollY: number };

// How many screens deep we are, so a back control only appears when there is
// somewhere to go. Kept in history state so it survives a popstate — and a
// reload, which would otherwise strand a sheet with no way back.
let depth: number = history.state?.depth ?? 0;

export const currentDepth = () => depth;

export function replace(loc: Loc) {
    history.replaceState({ depth, scrollY: 0 } satisfies Entry, "", href(loc));
}

export function push(loc: Loc) {
    history.replaceState(
        { depth, scrollY: window.scrollY } satisfies Entry,
        "",
    );
    depth += 1;
    history.pushState({ depth, scrollY: 0 } satisfies Entry, "", href(loc));
}

export const back = () => history.back();

export function onLocation(cb: (loc: Loc, scrollY: number) => void) {
    addEventListener("popstate", (event) => {
        const entry = event.state as Partial<Entry> | null;
        depth = entry?.depth ?? 0;
        cb(parse(), entry?.scrollY ?? 0);
    });
}
