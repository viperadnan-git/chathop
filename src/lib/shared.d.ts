// The `$config` and `$status` aliases point at the bot's own JavaScript
// modules, so the config shape is defined once. These declarations give them
// types on the front-end side; the shapes live in ./config-types.
declare module "$config" {
    import type {
        MatchTarget,
        MediaKind,
        Replacement,
        RouteConfig,
        Rule,
    } from "./config-types";

    export const MEDIA_KINDS: readonly MediaKind[];
    export const MATCH_TARGETS: readonly MatchTarget[];
    export function defaultConfig(): RouteConfig;
    export function parseConfig(raw: unknown): RouteConfig;
    export function withDefaults(config: Partial<RouteConfig>): RouteConfig;
    export function pruneConfig(config: RouteConfig): RouteConfig;
    export function hasCaptionTransform(c: RouteConfig): boolean;
    export function isBlankRule(rule: Rule): boolean;
    export function isBlankReplacement(rule: Replacement): boolean;
    export function ruleIssue(rule: Rule): string | null;
    export function configIssue(config: RouteConfig): string | null;
    export function replacementIssue(rule: Replacement): string | null;
}

declare module "$status" {
    export const ROUTE_STATUS: Record<string, string>;
    export function statusLabel(status: string): string;
    export function isStopped(status: string): boolean;
}
