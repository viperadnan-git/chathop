<script lang="ts">
let {
    width = "100%",
    height = "var(--ui-body)",
    radius = "6px",
}: { width?: string; height?: string; radius?: string } = $props();
</script>

<span
    class="ui-shimmer"
    style="width: {width}; height: {height}; border-radius: {radius}"
    aria-hidden="true"
></span>

<style>
.ui-shimmer {
    display: block;
    flex-shrink: 0;
    background: var(--ui-inset);
    background-image: linear-gradient(
        90deg,
        transparent 0%,
        var(--ui-press) 50%,
        transparent 100%
    );
    background-size: 220% 100%;
    background-repeat: no-repeat;
    animation: shimmer 1.4s linear infinite;
}

@keyframes shimmer {
    from {
        background-position: 160% 0;
    }
    to {
        background-position: -60% 0;
    }
}

@media (prefers-reduced-motion: reduce) {
    .ui-shimmer {
        animation: none;
        background-image: none;
    }
}
</style>
