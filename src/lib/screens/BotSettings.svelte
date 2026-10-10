<script lang="ts">
import type { Settings } from "../api";
import Alert from "../ui/Alert.svelte";
import Card from "../ui/Card.svelte";
import Heading from "../ui/Heading.svelte";
import Hero from "../ui/Hero.svelte";
import Icon from "../ui/Icon.svelte";
import Note from "../ui/Note.svelte";
import Row from "../ui/Row.svelte";
import Sheet from "../ui/Sheet.svelte";
import Toggle from "../ui/Toggle.svelte";

let {
    settings,
    onprivate,
    onclose,
}: {
    settings: Settings;
    onprivate: (on: boolean) => void;
    onclose: () => void;
} = $props();
</script>

<Sheet title="Bot settings" onback={onclose}>
    <Hero title="@{settings.bot.username}">
        {#snippet glyph()}<Icon name="gear" size={46} stroke={1.6} />{/snippet}
        {#snippet lede()}You run this bot. Only you see this page.{/snippet}
    </Hero>

    {#if settings.private}
        <Alert tone="info">
            Only you can use this bot right now. Everyone else's forwards are
            paused, not deleted.
        </Alert>
    {/if}

    <Heading title="Who can use it" />
    <Card>
        <Row
            label="Keep it to myself"
            description="Nobody else can use it, and their forwards pause"
        >
            {#snippet leading()}<Icon name="owner" size={22} />{/snippet}
            {#snippet trailing()}
                <Toggle
                    checked={settings.private}
                    label="Keep it to myself"
                    onchange={onprivate}
                />
            {/snippet}
        </Row>
    </Card>
    <Note>
        Left open, anyone can use it, and each person sees only their own
        forwards.
    </Note>

    <Heading title="Handing it over" />
    <Card>
        <Row
            label="Give it to someone else"
            description="Send /transfer with their user id, then confirm"
        >
            {#snippet leading()}<Icon name="forward" size={22} />{/snippet}
        </Row>
        <Row
            label="Take it back"
            description="Send /claim with this bot's token from @BotFather"
        >
            {#snippet leading()}<Icon name="key" size={22} />{/snippet}
        </Row>
    </Card>
    <Note>
        Both happen in the chat, not here — a token should never be typed into
        a web page. Holding the token is the proof, so you cannot lock yourself
        out.
    </Note>
</Sheet>
