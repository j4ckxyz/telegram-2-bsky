const fs = require('fs')
const path = require('path')
const Emusks = require('emusks')
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

  const client = new Emusks({ authToken: token })
  await client.login()
  return client
}

async function post(text) {
  const client = await loadClient()
  try {
    const res = await client.tweet({ text })
    return res
  } finally {
    // emusks doesn't require explicit destroy, but if needed, do cleanup here
  }
}

module.exports = { post }
