// One-off: sign in once and save the session, so scenes can reuse it. The saved file is a secret: keep it out of git.
//   WEB_URL=http://localhost:3000 APP_EMAIL=... APP_PASSWORD=... node auth.mjs
import { chromium } from 'playwright'
const BASE = process.env.WEB_URL ?? 'http://localhost:3000'
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } }); const p = await ctx.newPage()
await p.goto(BASE + '/login')
await p.getByLabel('Email').fill(process.env.APP_EMAIL ?? ''); await p.getByLabel('Password').fill(process.env.APP_PASSWORD ?? '')
await p.getByRole('button', { name: /sign in|log in/i }).click(); await p.waitForTimeout(4000)
await ctx.storageState({ path: new URL('./.login.json', import.meta.url).pathname }); await b.close(); console.log('login saved')

// For a third-party site with 2FA, use a persistent profile instead and sign in once by hand:
//   const g = await chromium.launchPersistentContext('/path/to/profile', { headless: false })
//   ...then pass { profile: '/path/to/profile' } to Clip.open().
