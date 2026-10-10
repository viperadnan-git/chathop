<script lang="ts">
let {
    value = $bindable(""),
    placeholder = "",
    mono = false,
    // For a field whose stored form differs from what is typed — a list of
    // senders, say — where binding a string is not enough.
    oninput,
}: {
    value?: string;
    placeholder?: string;
    mono?: boolean;
    oninput?: (value: string) => void;
} = $props();
</script>

<div class="ui-field" class:mono>
    <input
        bind:value
        {placeholder}
        oninput={oninput ? (e) => oninput(e.currentTarget.value) : undefined}
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
    />
</div>

<style>
.ui-field {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: var(--ui-field);
    padding: 0 var(--ui-gutter);
}
.ui-field:not(:last-child) {
    box-shadow: inset 0 -1px 0 var(--ui-separator);
}
input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: none;
    color: var(--ui-text);
    font: inherit;
    font-size: var(--ui-body);
    padding: 12px 0;
}
.mono input {
    font-family: ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace;
    font-size: calc(var(--ui-body) - 1px);
}
input::placeholder {
    color: var(--ui-muted);
}
input:focus {
    outline: none;
}
</style>
