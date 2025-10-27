# telegram-2-bsky

Small Node.js Telegram bot for Raspberry Pi that accepts messages from a single Telegram user and crossposts them to Twitter (using emusks), Bluesky (using @atproto/api) and Nostr (using nostr-tools).

Why this project
- Single-user crossposter for fast, personal posting from Telegram to multiple social/protocol targets.
- Designed to run on low-powered devices (Raspberry Pi).

Quick start (recommended)
1. Clone this repo and cd into it:

```bash
git clone <repo-url> telegram-2-bsky
cd telegram-2-bsky
```

2. Run the interactive setup (it will run `npm install`, create `data/` with secure perms, and guide you through credentials):

```bash
node scripts/setup.js
```

3. Start the bot:

```bash
npm start
```

What the setup script asks for
- TELEGRAM_BOT_TOKEN — create a bot with BotFather on Telegram (steps below).
- TELEGRAM_ALLOWED_USER_ID — numeric id of your Telegram account; only this user can post through the bot.
- TWITTER_AUTH_TOKEN — X/Twitter `auth_token` cookie (paste from your browser) if you want Twitter posting enabled. emusks requires this.
- BLUESKY_IDENTIFIER & BLUESKY_PASSWORD — optional; setup will attempt to login and persist a session to `BLUESKY_SESSION_FILE`.
- NOSTR_NSEC — optional; leave empty to have the script generate and securely save one to `data/`.

Creating a Telegram bot (short)
1. Chat with @BotFather on Telegram and run `/newbot`.
2. Choose a name and username; BotFather returns `TELEGRAM_BOT_TOKEN`.
3. Start a conversation with your new bot from your personal Telegram account and note your numeric user id (use @userinfobot or call the Bot API `getUpdates` and read `from.id`). Put that id into `TELEGRAM_ALLOWED_USER_ID`.

Bluesky: PDS (service) support and link/hashtag faceting
- Use `BLUESKY_SERVICE` in `.env` to point to any AT Protocol-compatible PDS (for example `https://bsky.social` or `https://my-pds.example.com`). The code constructs the client with that service URL.
- The bot uses `@atproto/api`'s `RichText` helper to detect link and mention facets before posting. This ensures link preview facets (embed cards) are attached where the PDS supports them, and preserves hashtags in the text.

Implementation notes (hashtags & link cards)
- We create a `RichText` with the post text and run `await rt.detectFacets(agent)` before posting. That populates `rt.facets` with link/mention facets and normalizes text.
- The post record includes `text: rt.text` and `facets: rt.facets` so Bluesky clients can render link cards and highlight mentions. Hashtags (e.g. `#rust`) remain in the post text and are indexed/searchable by the PDS.

If you are running a private or third-party PDS, just set `BLUESKY_SERVICE` in `.env` before running `node scripts/setup.js`.

Twitter (emusks) notes
- emusks is reverse-engineered and requires an `auth_token` cookie from x.com. Manual cookie copy is the most robust approach. Automating login with Playwright is fragile when 2FA/CAPTCHAs are enabled.

Nostr notes
- The script will generate and store an `nsec` key if you don't provide one. The key file is written with `0600` perms. Keep it secret.

Running as a service (systemd)
- A template is included at `systemd/telegram-2-bsky.service`. Create a dedicated system user (e.g. `telegrambot`) and update `WorkingDirectory` in the unit file before enabling.

Pushing to GitHub
- Authenticate locally with the GH CLI (`gh auth login`) and use the included push helper or run:

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create my-telegram-2-bsky --public --source=. --remote=origin --push
```

Replace `my-telegram-2-bsky` with the repo name you want. The CLI will guide you through authentication and permissions.

Security
- Keep `.env`, `data/` and any secret files out of source control. The repo `.gitignore` excludes them by default.

Troubleshooting
- If Bluesky link previews don't appear: ensure `BLUESKY_SERVICE` points to a PDS that supports link resolution and that your session is authenticated. `RichText.detectFacets` will query the PDS while computing facets.

Extending the project
- Media uploads, richer command handling, and retry/queue logic can be added later. The code is intentionally small and focused on text crossposting.

