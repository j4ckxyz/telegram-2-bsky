require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { AtpAgent } = require('@atproto/api')

const service = process.env.BLUESKY_SERVICE || 'https://bsky.social'
const sessionFile = process.env.BLUESKY_SESSION_FILE || './data/bluesky_session.json'

let agent = new AtpAgent({ service, persistSession: persistSessionHandler })

function persistSessionHandler(evt, sess) {
  // evt will be 'create' | 'update' | 'delete' as provided by the lib
  try {
    if (sess) {
      fs.writeFileSync(sessionFile, JSON.stringify(sess, null, 2), { mode: 0o600 })
    }
  } catch (e) {
    console.warn('Failed to persist Bluesky session:', e.message)
  }
}

function loadSavedSession() {
  if (!fs.existsSync(sessionFile)) return null
  try {
    return JSON.parse(fs.readFileSync(sessionFile, 'utf8'))
  } catch (e) {
    console.warn('Failed to read saved bluesky session:', e.message)
    return null
  }
}

async function initAgent() {
  const saved = loadSavedSession()
  if (saved) {
    try {
      await agent.resumeSession(saved)
      console.log('Resumed Bluesky session')
      return
    } catch (e) {
      console.warn('Failed to resume saved Bluesky session:', e.message)
    }
  }

  // No saved session -> try to login via identifier/password if provided
  const id = process.env.BLUESKY_IDENTIFIER
  const pw = process.env.BLUESKY_PASSWORD
  if (id && pw) {
    try {
      await agent.login({ identifier: id, password: pw })
      console.log('Logged into Bluesky via username/password')
      return
    } catch (e) {
      console.warn('Bluesky login failed:', e.message)
    }
  }

  console.warn('Bluesky is not authenticated. Set BLUESKY_IDENTIFIER & BLUESKY_PASSWORD or provide an OAuth session.')
}

// ensure agent initialized and schedule periodic refresh/resume
initAgent()
setInterval(() => {
  console.log('Refreshing Bluesky session from disk (if present)')
  const saved = loadSavedSession()
  if (saved) agent.resumeSession(saved).catch((e) => console.warn('refresh failed', e.message))
}, 1000 * 60 * 60 * 2) // every 2 hours

async function post(text) {
  if (!agent || !agent.session) {
    // try to initialize again
    await initAgent()
  }
  if (!agent.session) throw new Error('Bluesky not authenticated')

  const record = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
  }
  const res = await agent.post(record)
  return res
}

module.exports = { post, initAgent }

