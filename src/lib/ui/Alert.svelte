<script lang="ts">
import type { Snippet } from "svelte";
import Icon from "./Icon.svelte";

/**
 * What a screen has to say before anything else. Tinted rather than loud;
 * the glyph is what separates it from a Note.
 *
 * Only the block margin is set — a `margin` shorthand here would cancel the
 * gutter the layout gives it.
 */
let {
    tone = "danger",
    children,
}: { tone?: "danger" | "info"; children: Snippet } = $props();
</script>

<div class="ui-alert {tone}" role={tone === "danger" ? "alert" : undefined}>
    <Icon name="info" size={17} />
    <p>{@render children()}</p>
</div>

<style>
.ui-alert {
    animation: alert-in var(--ui-swift) var(--ui-ease-out);
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-block: 0;
    padding: 11px 13px;
    border-radius: var(--ui-r-card);
    font-size: var(--ui-note);
    line-height: 1.45;
}
.ui-alert p {
    margin: 0;
    flex: 1;
    min-width: 0;
}
@keyframes alert-in {
    from {
        transform: translateY(-4px);
        opacity: 0;
    }
}
@media (prefers-reduced-motion: reduce) {
    .ui-alert {
        animation: none;
    }
}
.ui-alert :global(svg) {
    flex: none;
    margin-top: 1px;
}
.danger {
    background: color-mix(in srgb, var(--ui-danger) 16%, transparent);
    color: var(--ui-danger);
}
.info {
    background: color-mix(in srgb, var(--ui-accent) 14%, transparent);
    color: var(--ui-accent);
}
</style>
