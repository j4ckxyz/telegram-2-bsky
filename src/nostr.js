require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { finalizeEvent, generateSecretKey, getPublicKey } = require('nostr-tools/pure')
const { SimplePool } = require('nostr-tools/pool')
const nip19 = require('nostr-tools/nip19')

const nsecEnv = process.env.NOSTR_NSEC
const nsecFile = process.env.NOSTR_NSEC_FILE || './data/nostr_nsec.txt'
const relays = (process.env.NOSTR_RELAYS || 'wss://relay.damus.io').split(',')

function getSecretKey() {
  if (nsecEnv) return nip19.decode(nsecEnv).data
  if (fs.existsSync(nsecFile)) {
    const raw = fs.readFileSync(nsecFile, 'utf8').trim()
    if (!raw) return null
    try {
      return nip19.decode(raw).data
    } catch (e) {
      // maybe the file already contains hex
      return raw
    }
  }
  return null
}

async function ensureKey() {
  let sk = getSecretKey()
  if (sk) return sk
  // generate and store
  const newSk = generateSecretKey()
  const nsec = nip19.nsecEncode(newSk)
  fs.writeFileSync(nsecFile, nsec, { mode: 0o600 })
  console.log('Generated new nostr nsec and saved to', nsecFile)
  return newSk
}

async function post(content) {
  const sk = getSecretKey() || await ensureKey()
  if (!sk) throw new Error('nostr secret key not available')

  const pub = getPublicKey(typeof sk === 'string' ? sk : sk)

  const eventTemplate = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content,
  }

  const signed = finalizeEvent(eventTemplate, sk)

  const pool = new SimplePool({ enablePing: true, enableReconnect: true })
  // ensure node has ws available; on some node versions you might need to set ws
  try {
    await Promise.any(relays.map((r) => pool.publish([r], signed)))
    pool.close(relays)
    return { ok: true }
  } catch (e) {
    pool.close(relays)
    throw e
  }
}

module.exports = { post, ensureKey }
