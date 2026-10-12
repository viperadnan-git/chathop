export {
    defaultConfig,
    MATCH_TARGETS,
    MEDIA_KINDS,
    parseConfig,
    withDefaults,
} from "$config";
export { isStopped, ROUTE_STATUS, statusLabel, stuckReason } from "$status";

import type { RouteConfig } from "./config-types";

export type {
    MatchTarget,
    MediaKind,
    RouteConfig,
    RouteStatus,
    Rule,
} from "./config-types";

export type BrokenEnd = {
    end: "source" | "destination";
    chatId: number;
    name: string;
    type: string | null;
};

export type Replacement = RouteConfig["caption"]["replace"][number];

export type Route = {
    id: string;
    sourceChatId: number;
    destChatId: number;
    // "active" | "paused" | a stop reason.
    status: string;
    forwarded: number;
    lastForwardedAt?: string | null;
    config: RouteConfig;
    statusLabel?: string;
    sourceName: string;
    destName: string;
    broken?: BrokenEnd[];
    updatedAt?: string;
};

const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function relativeTime(iso?: string): string {
    if (!iso) return "";
    const then = Date.parse(iso);
    if (Number.isNaN(then)) return "";

    const seconds = Math.round((then - Date.now()) / 1000);
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
        ["year", 31536000],
        ["month", 2592000],
        ["week", 604800],
        ["day", 86400],
        ["hour", 3600],
        ["minute", 60],
    ];
    for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) {
            return RELATIVE.format(Math.round(seconds / size), unit);
        }
    }
    return RELATIVE.format(Math.round(seconds), "second");
}
