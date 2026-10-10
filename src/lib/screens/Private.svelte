<script lang="ts">
import RepoCard from "../components/RepoCard.svelte";
import { project } from "../project";
import Alert from "../ui/Alert.svelte";
import Card from "../ui/Card.svelte";
import Heading from "../ui/Heading.svelte";
import Hero from "../ui/Hero.svelte";
import Icon from "../ui/Icon.svelte";
import Note from "../ui/Note.svelte";
import Row from "../ui/Row.svelte";
import Screen from "../ui/Screen.svelte";
</script>

<Screen credit>
    <Hero title={project.name}>
        {#snippet glyph()}<Icon name="mark" size={52} />{/snippet}
        {#snippet lede()}{project.tagline}{/snippet}
    </Hero>

    <Alert tone="info">
        This bot is private. Whoever runs it has kept it to themselves, so it
        will not forward anything for you.
    </Alert>

    <Heading title="Run your own" />
    <RepoCard />
    <Note>
        Free to copy, change and host. Make a bot with <b>@BotFather</b>, turn
        on Serverless, and deploy — the README has every command.
    </Note>

    <Heading title="What you get" />
    <Card>
        <Row
            label="Nothing to host"
            description="It runs inside Telegram. No server to rent, nothing to keep alive"
        >
            {#snippet leading()}<Icon name="channel" size={22} />{/snippet}
        </Row>
        <Row
            label="Different rules per chat"
            description="Allow or block by word, pattern, media type or sender"
        >
            {#snippet leading()}<Icon name="allow" size={22} />{/snippet}
        </Row>
        <Row
            label="Change the text on the way"
            description="Find and replace, strip links, add a line above or below"
        >
            {#snippet leading()}<Icon name="replace" size={22} />{/snippet}
        </Row>
        <Row
            label="Open to everyone"
            description="Each person sees only the forwards they added"
        >
            {#snippet leading()}<Icon name="group" size={22} />{/snippet}
        </Row>
    </Card>
</Screen>
