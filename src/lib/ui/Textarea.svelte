<script lang="ts">
// Sizes itself with no JavaScript: an invisible ::after copy of the text
// shares the textarea's grid cell, so the cell is as tall as the content.
//
// No fallback on the bindable — Svelte refuses to bind undefined to a prop
// that has a default, and a caption's prepend is undefined when unset.
let {
    value = $bindable(),
    placeholder = "",
}: { value?: string; placeholder?: string } = $props();
</script>

<div class="ui-textarea" data-value={value ?? ""}>
    <textarea bind:value {placeholder} rows="1"></textarea>
</div>

<style>
.ui-textarea {
    display: grid;
    padding: 12px var(--ui-gutter);
    font-size: var(--ui-body);
    line-height: 1.4;
}
/* Stacked boxes in one card are divided, the same as stacked Fields. The
   separator is a shadow, not ::after — that is the autosizing ghost. */
.ui-textarea:not(:last-child) {
    box-shadow: inset 0 -1px 0 var(--ui-separator);
}
.ui-textarea::after,
textarea {
    grid-area: 1 / 1;
    font: inherit;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}
.ui-textarea::after {
    content: attr(data-value) " ";
    visibility: hidden;
}
textarea {
    border: 0;
    padding: 0;
    background: none;
    color: var(--ui-text);
    resize: none;
    overflow: hidden;
}
textarea::placeholder {
    color: var(--ui-muted);
}
textarea:focus {
    outline: none;
}
</style>
