// One-off: sign in BY HAND in a visible browser window, then save the session so scenes can reuse it.
// No password is typed or stored by this script. The saved file is a secret: keep it out of git.
//   WEB_URL=http://localhost:3000 LOGIN_PATH=/login node auth.mjs
import { chromium } from 'playwright'
const BASE = process.env.WEB_URL ?? 'http://localhost:3000'
const LOGIN = process.env.LOGIN_PATH ?? '/login'
const b = await chromium.launch({ headless: false }); const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const p = await ctx.newPage()
await p.goto(BASE + LOGIN)
console.log('Sign in in the browser window (including any 2FA code). It saves and closes when you leave the login page.')
const deadline = Date.now() + 10 * 60_000
while (Date.now() < deadline && new URL(p.url()).pathname.startsWith(LOGIN)) await p.waitForTimeout(1500)
await p.waitForTimeout(3000)
await ctx.storageState({ path: new URL('./.login.json', import.meta.url).pathname }); await b.close(); console.log('login saved')

// For a third-party site that keeps its login in more than cookies (a CRM with 2FA), use a persistent profile instead:
//   const g = await chromium.launchPersistentContext('/path/to/profile', { headless: false })
//   ...sign in by hand once, close it, then pass { profile: '/path/to/profile' } to Clip.open().
