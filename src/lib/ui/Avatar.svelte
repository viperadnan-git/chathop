<script lang="ts" module>
// `module`: the palette, the segmenter and the id maths are the same for every
// avatar on the screen, so they are built once.

// The MTProto bare id: the Bot API prefixes channels with -100, which would
// land on a different colour.
const bare = (id: number) => Math.abs(Number(String(id).replace(/^-100/, "")));

// In accent-colour order, so the id indexes it directly.
const PALETTE: [string, string][] = [
    ["#FF845E", "#D45246"], // 0 red
    ["#FEBB5B", "#F68136"], // 1 orange
    ["#B694F9", "#6C61DF"], // 2 purple
    ["#9AD164", "#46BA43"], // 3 green
    ["#53EDD6", "#28C9B7"], // 4 cyan
    ["#5CAFFA", "#408ACF"], // 5 blue
    ["#FF8AAC", "#D95574"], //  6 pink
];

const segmenter =
    typeof Intl.Segmenter === "function" ? new Intl.Segmenter() : null;

/** First grapheme: a leading emoji must not be cut in half. */
const lead = (word: string) =>
    segmenter
        ? ([...segmenter.segment(word)][0]?.segment ?? "")
        : ([...word][0] ?? "");
</script>

<script lang="ts">
import { photos } from "../photos.svelte";

let {
    chatId,
    name = "",
    size,
}: {
    chatId: number;
    name?: string;
    /** Any CSS length — a token, so a row and its skeleton cannot disagree. */
    size?: string;
} = $props();

$effect(() => {
    photos.ensure(chatId);
});

const src = $derived(photos.get(chatId));

const initials = $derived.by(() => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "";
    const first = lead(words[0]);
    return (
        words.length === 1 ? first : first + lead(words[words.length - 1])
    ).toUpperCase();
});

const colors = $derived(PALETTE[bare(chatId) % 7]);
</script>

<span
    class="ui-avatar"
    style="background: {colors[1]}; background: linear-gradient({colors[0]}, {colors[1]}){size
        ? `; --ui-leading: ${size}`
        : ''}"
    aria-hidden="true"
>
    {initials}
    {#if src}<img {src} alt="" />{/if}
</span>

<style>
.ui-avatar {
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
    width: var(--ui-leading);
    height: var(--ui-leading);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: calc(var(--ui-leading) * 0.38);
    font-weight: var(--ui-weight-button);
}
img {
    animation: photo-in var(--ui-swift) var(--ui-ease-out);
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}
@keyframes photo-in {
    from {
        opacity: 0;
    }
}
@media (prefers-reduced-motion: reduce) {
    img {
        animation: none;
    }
}
</style>
