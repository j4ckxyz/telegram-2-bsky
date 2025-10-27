#!/usr/bin/env node
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { ensureKey } = require('../src/nostr')

async function main() {
  const sk = await ensureKey()
  console.log('Nostr key available (nsec stored in file or provided via NOSTR_NSEC). Keep it secret.')
}

main().catch((e) => { console.error(e); process.exit(1) })
