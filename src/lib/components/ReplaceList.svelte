<script lang="ts">
import { isBlankReplacement } from "$config";
import type { RouteConfig } from "../types";
import Card from "../ui/Card.svelte";
import Check from "../ui/Check.svelte";
import Field from "../ui/Field.svelte";
import Heading from "../ui/Heading.svelte";
import Icon from "../ui/Icon.svelte";
import IconButton from "../ui/IconButton.svelte";
import Note from "../ui/Note.svelte";
import Row from "../ui/Row.svelte";

let { rules = $bindable() }: { rules: RouteConfig["caption"]["replace"] } =
    $props();

const add = () =>
    (rules = [
        ...rules,
        { pattern: "", replacement: "", isRegex: false, caseSensitive: true },
    ]);

const remove = (i: number) => (rules = rules.filter((_, n) => n !== i));
</script>

{#each rules as rule, i (i)}
    <Heading title={`#${i + 1} ${rule.isRegex ? "Pattern" : "Text"}`}>
        {#snippet trailing()}
            <IconButton
                name="trash"
                tone="danger"
                label="Remove replacement {i + 1}"
                onclick={() => remove(i)}
            />
        {/snippet}
    </Heading>

    <Card>
        <Field bind:value={rule.pattern} mono={rule.isRegex} placeholder="Find" />
        <Field bind:value={rule.replacement} placeholder="Replace with" />
        <Row label="A regular expression">
            {#snippet trailing()}
                <Check bind:checked={rule.isRegex} label="Regex" />
            {/snippet}
        </Row>
        <!-- Stored as caseSensitive, shown as its inverse. -->
        <Row label="Ignore capitals">
            {#snippet trailing()}
                <Check
                    bind:checked={
                        () => !rule.caseSensitive,
                        (v) => (rule.caseSensitive = !v)
                    }
                    label="Case-insensitive"
                />
            {/snippet}
        </Row>
    </Card>

    {#if isBlankReplacement(rule)}
        <Note>Not filled in yet, so it is dropped when you save.</Note>
    {/if}
{/each}

<Heading title={rules.length ? "Add another replacement" : "Add a replacement"} />
<Card>
    <Row label="Add a replacement" tone="accent" onclick={add}>
        {#snippet leading()}<Icon name="plus" />{/snippet}
    </Row>
</Card>

