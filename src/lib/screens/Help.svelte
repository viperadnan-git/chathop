<script lang="ts">
import SyntaxList from "../components/SyntaxList.svelte";
import Card from "../ui/Card.svelte";
import Heading from "../ui/Heading.svelte";
import Hero from "../ui/Hero.svelte";
import Icon from "../ui/Icon.svelte";
import Note from "../ui/Note.svelte";
import Screen from "../ui/Screen.svelte";

let { onback, backLabel = "Back" }: { onback: () => void; backLabel?: string } =
    $props();

const chatFormats: [string, string][] = [
    ["-1001234567890", "Chat id"],
    ["@mychannel", "Username"],
    ["t.me/mychannel", "Link to a public chat"],
    ["t.me/mychannel/42", "Link to a message — the chat is taken from it"],
    ["t.me/c/1234567890/42", "Message link in a private chat"],
];

const commands: [string, string][] = [
    ["/settings", "Open this app"],
    ["/set", "Pick the two chats from a list"],
    ["/set (source) (destination)", "Add one without the picker"],
    ["/rm (source) (destination)", "Remove one destination"],
    ["/rm (source)", "Remove every destination for a source"],
    ["/get", "List everything"],
    ["/get (source)", "List one source's destinations"],
    ["/reload", "Refresh chat names, and restart anything that works again"],
    ["/cancel", "Stop a half-finished /set"],
    ["/claim", "Take charge of this bot, or take it back with its token"],
];

const adminCommands: [string, string][] = [
    [
        "/private on|off",
        "Keep the bot to yourself; everyone else's forwards pause",
    ],
    ["/transfer (user id)", "Hand the bot over, after confirming"],
];

const faq = [
    {
        q: "Nothing is being forwarded",
        a: "I have to be in the source chat, and in a channel I have to be an administrator to see posts at all. Check the destination has not stopped — a stopped forward says why on its own screen.",
    },
    {
        q: "An album arrived as separate messages",
        a: "Grouped media reaches me as one message per item, and there is no moment where I hold them all, so each is copied on its own.",
    },
    {
        q: "Who can see my forwards?",
        a: "Only you. Everyone using this bot has their own, and nobody else's are visible to you.",
    },
    {
        q: "What happens to formatting?",
        a: "Bold, links and the rest survive every caption edit — offsets are recomputed around each change rather than dropped.",
    },
];
</script>

<Screen {onback} {backLabel} title="Help" credit>
    <Hero title="Help">
        {#snippet glyph()}<Icon name="help" size={46} stroke={1.6} />{/snippet}
        {#snippet lede()}
            Forwarding messages between your chats, one source to many
            destinations.
        {/snippet}
    </Hero>

    <Heading title="Naming a chat" />
    <SyntaxList items={chatFormats} />
    <Note>Anywhere a chat is expected, any of these will do.</Note>

    <Heading title="Commands" />
    <SyntaxList items={commands} />
    <Note>
        Everyone has their own forwards. You must be an admin of the chat you
        forward into.
    </Note>

    <Heading title="If you run this bot" />
    <SyntaxList items={adminCommands} />
    <Note>Only whoever claimed the bot can use these.</Note>

    <Heading title="Questions" />
    <Card>
        {#each faq as item}
            <details>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
            </details>
        {/each}
    </Card>
</Screen>

<style>
details:not(:last-child) {
    box-shadow: inset 0 -1px 0 var(--ui-separator);
}
summary {
    list-style: none;
    padding: 15px var(--ui-gutter);
    font-size: var(--ui-body);
    cursor: pointer;
}
summary::-webkit-details-marker {
    display: none;
}
summary::after {
    content: "";
    float: right;
    width: 8px;
    height: 8px;
    margin-top: 6px;
    border-right: 2px solid var(--ui-muted);
    border-bottom: 2px solid var(--ui-muted);
    transform: rotate(-45deg);
}
details[open] summary::after {
    transform: rotate(45deg);
}
details p {
    margin: 0;
    padding: 0 var(--ui-gutter) 15px;
    font-size: var(--ui-note);
    line-height: 1.45;
    color: var(--ui-muted);
}
</style>
