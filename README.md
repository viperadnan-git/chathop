<div align="center">

<img src="public/botpic.svg" width="112" height="112" alt="">

<h1>chathop</h1>

<p><b>One chat in, many chats out.</b><br>
Telegram forwarding, with its own filters and caption rules per destination.</p>

<p>
  <a href="https://t.me/chathopbot"><img src="https://img.shields.io/badge/try_it-%40chathopbot-0496fc?style=flat-square&labelColor=30404d&logo=telegram&logoColor=white" alt="@chathopbot on Telegram"></a>
  <a href="https://core.telegram.org/bots/serverless"><img src="https://img.shields.io/badge/runs_on-Telegram_Serverless-30404d?style=flat-square&labelColor=30404d" alt="Runs on Telegram Serverless"></a>
  <img src="https://img.shields.io/badge/built_with-Svelte_5-30404d?style=flat-square&labelColor=30404d&logo=svelte&logoColor=white" alt="Built with Svelte 5">
  <a href="LICENSE"><img src="https://img.shields.io/badge/licence-GPL--3.0-30404d?style=flat-square&labelColor=30404d" alt="GPL-3.0-or-later"></a>
</p>

</div>

Runs on [Telegram Serverless](https://core.telegram.org/bots/serverless) — no
host, no database to rent, nothing to keep alive.

## Commands

| | |
| --- | --- |
| `/set (source) (destination)` | Add a forward |
| `/get (source)` | List your destinations for a source, or all of them with `/get` |
| `/rm (source) (destination)` | Remove one of your destinations, or all with `/rm (source)` |
| `/reload` | Refresh the chat names shown in `/get` |
| `/cancel` | Stop a half-finished `/set` |
| `/settings` | Open the Mini App |
| `/help` | How it works |

Anyone can use it, and everyone's routes are their own. You must administer the
**destination** — posting into a chat is what needs authority. For a
**source**, you have to be in the chat yourself unless it is public, and the
bot has to be in it too — an administrator, in a channel — to see the messages
at all.

The first person to `/start` administers the bot and gets two more commands:

| | |
| --- | --- |
| `/private on\|off` | Keep the bot to yourself; everyone else's routes go quiet |
| `/transfer (user id)` | Hand the bot over, after confirming on a button |

Whoever deploys the bot takes charge of it with **`/claim`**, and can always
take it back with **`/claim (bot token)`** — holding the token from
[@BotFather](https://t.me/BotFather) *is* the proof of ownership, so there is
no secret to configure and no way to lock yourself out by mistyping an id in
`/transfer`. The message carrying the token is deleted on sight.

Anywhere a chat is expected you can pass a chat id, an `@username` or a t.me
link — including a message link, which yields the chat it belongs to. Invite
links carry no id and are rejected.

## Deploying your own

```sh
bun install
bunx tgcloud login     # paste the CLI token from @BotFather → your bot → Serverless
bun run deploy         # build the Mini App, push it and the bot's code
bunx tgcloud migrate   # create the tables
```

`push` prints the Mini App's address — `https://app<your bot id>.tgcloud.ai/`.
The bot id is the app id, so nothing needs configuring.

`deploy` ends by running `endpoints/setup`, which tells Telegram the bot's
command list, its description, and the menu button that opens the Mini App.
There is nothing to set by hand in @BotFather, and nothing to remember after
changing a command — it is applied on the next deploy, and skipped when
nothing changed.

### From CI

`.github/workflows/deploy.yml` does the same on every push to `main`. The one
thing it needs is a repository secret named `TGCLOUD_TOKEN` — the CLI access
token from @BotFather → your bot → Serverless, which the CLI reads instead of
`.tgcloud/credentials` and never writes to disk.

A fresh checkout has no `.tgcloud/`, so the workflow runs `tgcloud fetch`
first: that takes the cloud's revision without touching the working tree, and
the push that follows stays conditional — it aborts rather than overwriting a
deploy someone made in the meantime. Schema changes are applied with
`migrate --safe`, so a change the CLI warns about waits for a human.

## Known limits

- **Albums arrive as separate messages.** Parts land in different invocations
  and there is no process to hold them together.
- **Patterns run on native `RegExp`**, not RE2. A pattern with a repeated group
  inside a repeated group is refused at save time; that is a heuristic, not the
  linear-time guarantee RE2 gave.
- **One bot per project.** A project is tied to one bot, and only that bot
  can hold the webhook, so there is no way to run a second bot's updates here.
- **Commands work in a private chat with the bot**, not in groups.
- **Chat names and avatars are stored, not looked up.** They refresh when a
  chat announces itself — the bot added or removed, a rename — and on
  `/reload`. Avatars load after the list, never with it.

## Licence

GPL-3.0-or-later.

The icons are other people's work: the outline glyphs are
[Lucide](https://lucide.dev) (ISC, parts MIT), the bot's own mark is "send" by
Keval from the [Noun Project](https://thenounproject.com/) (CC BY), and
GitHub's mark comes from [Simple Icons](https://simpleicons.org) (CC0).
