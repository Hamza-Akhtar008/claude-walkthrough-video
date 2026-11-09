// A starting point for your scenes. Run one at a time:  node scenes.mjs <name>
// Each scene opens its own browser context, so one scene can be re-recorded without the others.
// Write your own selectors; the ones below are placeholders for an imaginary sign-up page.
import { launch, close, Clip } from './rec.mjs'
import fs from 'node:fs'

const STATE = new URL('./.state.json', import.meta.url).pathname          // values shared between scenes
const load = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {})
const save = (patch) => fs.writeFileSync(STATE, JSON.stringify({ ...load(), ...patch }, null, 1))
const LOGIN = { state: new URL('./.login.json', import.meta.url).pathname } // created by auth.template.mjs; omit for public pages

// scene-1: a public page, no login.
async function intro() {
  const c = await new Clip('scene-1').open('/')                               // clip name; start page (relative to WEB_URL)
  await c.start(); await c.hold(2500)                                      // start() begins capturing frames
  c.mark('shown')                                                          // markers let assemble.py line the picture up with the voice
  await c.stop()                                                           // writes clips/scene-1/clip.mp4 and meta.json
}

// scene-2: type into a form and wait for a slow reply. think() pauses capture, so the video never shows the wait.
async function signup() {
  const email = `demo${Math.floor(Math.random() * 1000)}@example.com`
  const c = await new Clip('scene-2').open('/signup')
  await c.start(); await c.hold(800)
  await c.type('#email', email)                                            // gliding cursor, click ripple, typing
  await c.type('#password', '<demo-password>')
  await c.click(c.page.getByRole('button', { name: 'Create account' }))
  await c.think(() => c.page.getByText('Welcome').waitFor({ timeout: 60000 }))
  c.mark('confirmed'); await c.zoom(c.page.getByText('Welcome'), 1.3, 800); await c.hold(2500)
  save({ email })                                                          // later scenes can read this
  await c.stop()
}

// scene-3: a page behind a login (uses the saved login), opened on a record you created earlier.
async function firstNote() {
  const { email } = load()
  const c = await new Clip('scene-3').open('/notes', LOGIN)
  await c.start(); await c.hold(1500)
  await c.type('.note-editor', `Welcome, ${email}!`, 36); c.mark('typed'); await c.hold(2500)
  await c.stop()
}

const scenes = { intro, signup, firstNote }
const want = process.argv[2]
if (!scenes[want]) { console.log('scenes:', Object.keys(scenes).join(', ')); process.exit(1) }
await launch()
try { await scenes[want]() } finally { await close() }
console.log('SCENE_DONE', want)
