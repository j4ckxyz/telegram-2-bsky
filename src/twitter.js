const fs = require('fs')
const path = require('path')
// emusks may export a default property when imported via CommonJS; handle both shapes
const EmusksModule = require('emusks')
const Emusks = EmusksModule && EmusksModule.default ? EmusksModule.default : EmusksModule
require('dotenv').config()

const authToken = process.env.TWITTER_AUTH_TOKEN
const authFile = process.env.TWITTER_AUTH_TOKEN_FILE || './data/twitter_auth.json'

async function loadClient() {
  let token = authToken
  if (!token && fs.existsSync(authFile)) {
    try {
      const raw = fs.readFileSync(authFile, 'utf8')
      const json = JSON.parse(raw)
      token = json.auth_token || json.authToken
    } catch (e) {
      console.warn('Failed to load twitter auth file:', e.message)
    }
  }

  if (!token) {
    throw new Error('No Twitter auth token available. Set TWITTER_AUTH_TOKEN or run the login helper to extract auth_token cookie.')
  }

  if (typeof Emusks !== 'function') {
    throw new Error('emusks import is not a constructor — unexpected module shape. Make sure the package is installed correctly.')
  }

  const client = new Emusks({ authToken: token })
  if (typeof client.login === 'function') {
    await client.login()
  }
  return client
}

async function post(text) {
  const client = await loadClient()
  try {
    if (typeof client.tweet !== 'function') throw new Error('emusks client does not implement tweet()')
    const res = await client.tweet({ text })
    return res
  } finally {
    // emusks doesn't require explicit destroy, but if needed, do cleanup here
  }
}

module.exports = { post }
