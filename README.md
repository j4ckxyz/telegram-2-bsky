# telegram-2-bsky

Small Node.js Telegram bot for Raspberry Pi that accepts commands from a single Telegram user and crossposts messages to Twitter (using emusks), Bluesky (using @atproto/api) and Nostr (using nostr-tools).

Overview
- Telegram bot that only accepts messages from your Telegram user id
- Posts text messages to: Twitter (emusks), Bluesky (AT Protocol) and Nostr relays
- Session persistence for Bluesky and Twitter (auth token). Nostr private key stored in file with restricted permissions.

Quick start
1. Clone this repo
2. Copy `.env.example` to `.env` and populate environment variables
3. Create the `data/` directory and ensure it's writable by the bot process but not world-readable: `mkdir -p data && chmod 700 data`
4. Install deps: `npm install`
5. Run the interactive setup script which installs deps, secures `data/`, and helps you set credentials:

```bash
npx node scripts/setup.js
```

	- The script will prompt for Telegram token and user id, Twitter auth_token (recommended to paste manually), Bluesky identifier/password (optional), and Nostr nsec (or it will generate one and save it securely).
	- The script will attempt a Bluesky login when identifier/password are provided and persist the session to disk.

6. Start the bot: `npm start`

Security notes
- The Twitter solution (emusks) expects a valid `auth_token` cookie; this can be fragile and may require manual extraction.
- Bluesky sessions are persisted to disk; keep `data/` secure and only readable by the bot user.
- Nostr private key (nsec) is stored in `NOSTR_NSEC_FILE` and created with `chmod 600` — keep it secret.

Raspberry Pi / systemd
Create a systemd service that runs `npm start` under a dedicated user and sets the working directory to the project folder. Ensure the user has access only to the minimal files and `data/`.

Further customization
- The project is intentionally small and opinionated; feel free to extend the crossposter to handle images and scheduling.
