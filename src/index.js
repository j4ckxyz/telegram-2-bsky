require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Telegraf } = require('telegraf')

const allowedId = parseInt(process.env.TELEGRAM_ALLOWED_USER_ID || '0', 10)
const botToken = process.env.TELEGRAM_BOT_TOKEN
if (!botToken) {
  console.error('TELEGRAM_BOT_TOKEN not set in env')
  process.exit(1)
}

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 })
}

const twitter = require('./twitter')
const bluesky = require('./bluesky')
const nostr = require('./nostr')

const bot = new Telegraf(botToken)

bot.start((ctx) => ctx.reply('Hello — send me a message and I will crosspost it (only from the configured Telegram user).'))

bot.on('text', async (ctx) => {
  try {
    const fromId = ctx.from && ctx.from.id
    if (fromId !== allowedId) {
      console.warn('Unauthorized user', fromId)
      return ctx.reply('Sorry, you are not allowed to use this bot.')
    }

    const text = ctx.message.text.trim()
    if (!text) return ctx.reply('Empty message — nothing posted.')

    ctx.reply('Posting to configured networks...')

    // Post concurrently
    const results = await Promise.allSettled([
      twitter.post(text),
      bluesky.post(text),
      nostr.post(text),
    ])

    let reply = ''
    results.forEach((r, i) => {
      const name = ['Twitter', 'Bluesky', 'Nostr'][i]
      if (r.status === 'fulfilled') reply += `${name}: OK\n`
      else reply += `${name}: ERROR - ${r.reason ? r.reason.message || r.reason : r.reason}\n`
    })

    ctx.reply(reply)
  } catch (err) {
    console.error('Error handling message:', err)
    ctx.reply('Unexpected error: ' + (err.message || err))
  }
})

bot.launch().then(() => {
  console.log('Telegram bot started')
})

// graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
