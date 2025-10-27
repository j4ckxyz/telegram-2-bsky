#!/usr/bin/env node
/*
 Interactive setup script:
 - Installs npm dependencies
 - Ensures data dir exists with secure permissions
 - Prompts for credentials for Telegram, Twitter, Bluesky and Nostr
 - Writes a `.env` file (keeps out of git via .gitignore)
 - Optionally attempts a Bluesky login to persist session
*/
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const readline = require('readline/promises')
const { stdin: input, stdout: output } = require('process')

const envExamplePath = path.join(__dirname, '..', '.env.example')
const envPath = path.join(__dirname, '..', '.env')
const dataDir = path.join(__dirname, '..', 'data')

async function run() {
  console.log('Running setup for telegram-2-bsky')

  // 1) npm install
  console.log('Installing npm dependencies (this may take a while)...')
  try {
    execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
  } catch (e) {
    console.error('npm install failed - please run `npm install` manually and re-run this script')
    process.exit(1)
  }

  // 2) ensure data dir exists and set secure permissions
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 })
  try { fs.chmodSync(dataDir, 0o700) } catch (e) { /* ignore */ }

  const rl = readline.createInterface({ input, output })

  // helper to prefill existing env values from .env if present
  let existing = {}
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8')
    raw.split('\n').forEach((line) => {
      const m = line.match(/^([^=]+)=([\s\S]*)$/)
      if (m) existing[m[1]] = m[2]
    })
  }

  function ask(question, envKey, mask=false) {
    const def = existing[envKey] || ''
    const q = def ? `${question} (leave empty to keep existing) ` : question + ' '
    if (!mask) return rl.question(q)
    // for masked input, use a simple approach: don't echo
    return rl.question(q, { hideEchoBack: true })
  }

  const telegramToken = await ask('Telegram bot token (TELEGRAM_BOT_TOKEN):', 'TELEGRAM_BOT_TOKEN')
  const telegramAllowed = await ask('Your Telegram user id (TELEGRAM_ALLOWED_USER_ID):', 'TELEGRAM_ALLOWED_USER_ID')

  console.log('\nTwitter/X: emusks requires the `auth_token` cookie from x.com.')
  console.log('Preferred: manually copy auth_token from browser devtools -> Application -> Cookies -> x.com -> auth_token')
  const twitterToken = await ask('Twitter auth token (paste auth_token cookie value) or leave empty to skip:', 'TWITTER_AUTH_TOKEN', true)

  console.log('\nBluesky: you can provide identifier + password to login and persist a session (or skip and login later).')
  const blueskyId = await ask('Bluesky identifier (email or handle) (BLUESKY_IDENTIFIER):', 'BLUESKY_IDENTIFIER')
  let blueskyPw = ''
  if (blueskyId) blueskyPw = await ask('Bluesky password (BLUESKY_PASSWORD) (input hidden):', 'BLUESKY_PASSWORD', true)

  console.log('\nNostr: you can provide an nsec (bech32) or let the script generate one and save to file with restricted perms.')
  const nostrNsec = await ask('Nostr nsec (nsec1...) or leave empty to generate:', 'NOSTR_NSEC', true)
  const nostrRelays = await ask('Nostr relays (comma separated) [default wss://relay.damus.io]:', 'NOSTR_RELAYS')

  // prepare env content
  const lines = []
  if (telegramToken) lines.push(`TELEGRAM_BOT_TOKEN=${telegramToken}`)
  else if (existing.TELEGRAM_BOT_TOKEN) lines.push(`TELEGRAM_BOT_TOKEN=${existing.TELEGRAM_BOT_TOKEN}`)
  if (telegramAllowed) lines.push(`TELEGRAM_ALLOWED_USER_ID=${telegramAllowed}`)
  else if (existing.TELEGRAM_ALLOWED_USER_ID) lines.push(`TELEGRAM_ALLOWED_USER_ID=${existing.TELEGRAM_ALLOWED_USER_ID}`)

  if (twitterToken) lines.push(`TWITTER_AUTH_TOKEN=${twitterToken}`)
  else if (existing.TWITTER_AUTH_TOKEN) lines.push(`TWITTER_AUTH_TOKEN=${existing.TWITTER_AUTH_TOKEN}`)

  if (blueskyId) lines.push(`BLUESKY_IDENTIFIER=${blueskyId}`)
  else if (existing.BLUESKY_IDENTIFIER) lines.push(`BLUESKY_IDENTIFIER=${existing.BLUESKY_IDENTIFIER}`)
  if (blueskyPw) lines.push(`BLUESKY_PASSWORD=${blueskyPw}`)
  else if (existing.BLUESKY_PASSWORD) lines.push(`BLUESKY_PASSWORD=${existing.BLUESKY_PASSWORD}`)

  if (nostrNsec) lines.push(`NOSTR_NSEC=${nostrNsec}`)
  else if (existing.NOSTR_NSEC) lines.push(`NOSTR_NSEC=${existing.NOSTR_NSEC}`)
  if (nostrRelays) lines.push(`NOSTR_RELAYS=${nostrRelays}`)
  else if (existing.NOSTR_RELAYS) lines.push(`NOSTR_RELAYS=${existing.NOSTR_RELAYS}`)

  // write .env
  fs.writeFileSync(envPath, lines.join('\n') + '\n', { mode: 0o600 })
  console.log('Wrote .env (kept secure mode 600)')

  // Nostr: if not provided and user chose to generate, use the ensureKey function
  if (!nostrNsec) {
    try {
      const { ensureKey } = require('../src/nostr')
      await ensureKey()
    } catch (e) {
      console.warn('Failed to auto-generate nostr key:', e.message)
    }
  }

  // Bluesky: if identifier+password provided, attempt to login and persist a session
  if (blueskyId && blueskyPw) {
    try {
      const { initAgent } = require('../src/bluesky')
      // initAgent will persist session to BLUESKY_SESSION_FILE
      await initAgent()
      console.log('Attempted Bluesky login; session will be saved if successful.')
    } catch (e) {
      console.warn('Bluesky login attempt failed:', e.message)
    }
  }

  rl.close()
  console.log('\nSetup complete. Start the bot with: npm start')
}

run().catch((e) => { console.error('Setup failed:', e); process.exit(1) })
