import type { Settings } from "./api";
import { slot } from "./store.svelte";
import type { Route } from "./types";

export type Snapshot = {
    routes: Route[];
    settings: Settings | null;
};

// Bumped when the shape changes: a cached settings object from before `bot`
// existed would be read as if it had one.
const EMPTY: Snapshot = { routes: [], settings: null };
const store = slot<Snapshot>("chathop:snapshot:2", EMPTY);

const held = store.read();
export const cached = Array.isArray(held.routes) && held.settings ? held : null;

export const remember = (value: Snapshot) => store.write(value);
export const forget = () => store.clear();
