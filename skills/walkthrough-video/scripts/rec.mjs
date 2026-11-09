// Recorder: drives the real app, captures frames over CDP (thinking time cut out), gliding cursor, click ripples, zooms, markers.
import { chromium } from 'playwright'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
export const WEB = process.env.WEB_URL ?? 'http://localhost:3000', W = 1920, H = 1080
const ROOT = new URL('./clips/', import.meta.url).pathname
let browser
export async function launch() { browser = await chromium.launch(); return browser }
export async function close() { await browser?.close() }
const CSS = `#rc{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:transform var(--d,700ms) cubic-bezier(.45,.05,.25,1)}
#rc svg{width:26px;height:26px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
.rp{position:fixed;z-index:2147483646;pointer-events:none;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:rgba(79,70,229,.35);border:2px solid rgba(79,70,229,.7);animation:rr 520ms ease-out forwards}
@keyframes rr{to{transform:scale(4.2);opacity:0}}
body{transform-origin:0 0;transition:transform var(--zd,900ms) cubic-bezier(.45,.05,.25,1)}::-webkit-scrollbar{display:none}`

export class Clip {
  constructor(name) { this.name = name; this.dir = ROOT + name + '/'; this.frames = []; this.markers = {}; this.paused = true; this.pausedTotal = 0; this.z = { s: 1, tx: 0, ty: 0 } }
  /**
   * opts.profile  persistent browser profile: keeps a login to a third-party site (for example a CRM with 2FA)
   * opts.state    saved storage-state file: a saved login for your own app (see templates/auth.template.mjs)
   * opts.init     function run before every page load (set local storage, hide or blur something)
   * opts.ready    locator to wait for after the first page load (slow single-page apps)
   * opts.cover    { left, top, width, height, label }: paint over something private (an account name) on every page
   * opts.popups   button names to click away on each page load, for example ['Cancel', 'Got it']
   */
  async open(path, opts = {}) {
    fs.rmSync(this.dir, { recursive: true, force: true }); fs.mkdirSync(this.dir + 'f', { recursive: true })
    this.cover = opts.cover || null; this.popups = opts.popups || []
    const view = { width: W, height: H }
    if (opts.profile) this.ctx = await chromium.launchPersistentContext(opts.profile, { viewport: view, deviceScaleFactor: 1 })
    else this.ctx = await browser.newContext({ viewport: view, deviceScaleFactor: 1, ...(opts.state ? { storageState: opts.state } : {}) })
    if (opts.init) await this.ctx.addInitScript(opts.init)
    this.page = this.ctx.pages()[0] ?? await this.ctx.newPage(); this.page.setDefaultTimeout(30000)
    if (path) await this.goto(path, opts.ready)
    return this
  }
  async goto(url, ready) { await this.page.goto(url.startsWith('http') ? url : WEB + url, { waitUntil: 'domcontentloaded' }); if (ready) await ready.first().waitFor({ state: 'visible', timeout: 90000 }).catch(() => {}); else await this.page.waitForLoadState('networkidle').catch(() => {}); if (this.popups.length) await this.closePopups(); await this.decorate(); await this.page.waitForTimeout(800) }
  async closePopups() { await this.page.waitForTimeout(1500); for (const n of this.popups) await this.page.getByRole('button', { name: n }).first().click({ timeout: 2500 }).catch(() => {}); await this.page.waitForTimeout(600) }
  async decorate() {
    await this.page.addStyleTag({ content: CSS })
    await this.page.evaluate(() => { if (document.getElementById('rc')) return; const c = document.createElement('div'); c.id = 'rc'; c.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.6 14.8 L11.6 21.4 L14.4 20.2 L11.4 13.7 L17.6 13.7 Z" fill="#fff" stroke="#0f172a" stroke-width="1.4" stroke-linejoin="round"/></svg>'; document.documentElement.appendChild(c) })
    if (this.cover) await this.page.evaluate((c) => { if (document.getElementById('cover')) return; const d = document.createElement('div'); d.id = 'cover'; d.textContent = c.label || ''; d.style.cssText = `position:fixed;left:${c.left}px;top:${c.top}px;width:${c.width}px;height:${c.height}px;z-index:2147483645;background:#2b3649;color:#e5e9f0;border-radius:8px;font:600 14px sans-serif;display:flex;align-items:center;padding-left:14px;pointer-events:none`; document.body.appendChild(d) }, this.cover)
    this.z = { s: 1, tx: 0, ty: 0 }
    if (this.cursorAt) await this.page.evaluate(([x, y]) => { const c = document.getElementById('rc'); c.style.setProperty('--d', '0ms'); c.style.transform = `translate(${x}px,${y}px)` }, this.cursorAt)
  }
  async start() {
    this.cdp = await this.ctx.newCDPSession(this.page)
    this.cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
      this.cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
      if (this.paused || this.stopped) return
      const file = `${String(this.frames.length).padStart(5, '0')}.jpg`
      this.frames.push({ t: metadata.timestamp - this.pausedTotal, file }); fs.writeFile(this.dir + 'f/' + file, Buffer.from(data, 'base64'), () => {})
    })
    await this.cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 })
    await this.page.waitForTimeout(300); this.t0 = Date.now() / 1000; this.paused = false; await this.nudge()
  }
  now() { return Date.now() / 1000 - this.pausedTotal - this.t0 }
  mark(l) { this.markers[l] = +this.now().toFixed(3); console.log(`  [${this.name}] ${l} @ ${this.markers[l]}`) }
  pause() { if (!this.paused) { this.paused = true; this.ps = Date.now() / 1000 } }
  async resume() { if (this.paused) { this.pausedTotal += Date.now() / 1000 - this.ps; this.paused = false; await this.nudge() } }
  // Screencast frames are only sent when something on screen changes, so a static page would record nothing. Flip a 2px corner pixel (1% opacity) to force a frame.
  async nudge() { await this.page.evaluate(() => { let n = document.getElementById('rn'); if (!n) { n = document.createElement('div'); n.id = 'rn'; n.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;background:#000;opacity:.01;z-index:2147483647;pointer-events:none'; document.documentElement.appendChild(n) } n.style.opacity = n.style.opacity === '0.02' ? '0.01' : '0.02' }).catch(() => {}); await this.page.waitForTimeout(60) }
  async hold(ms) { const end = Date.now() + ms; while (Date.now() < end) { await this.nudge(); await this.page.waitForTimeout(Math.min(250, Math.max(0, end - Date.now()))) } }
  async stop() {
    await this.nudge(); this.endT = this.now(); this.stopped = true; await this.cdp.send('Page.stopScreencast').catch(() => {}); await new Promise(r => setTimeout(r, 400))
    const fr = this.frames.slice().sort((a, b) => a.t - b.t), base = this.t0; let list = ''
    for (let i = 0; i < fr.length; i++) { const tt = fr[i].t - base, nx = i + 1 < fr.length ? fr[i + 1].t - base : this.endT; list += `file 'f/${fr[i].file}'\nduration ${Math.max(0.001, nx - tt).toFixed(4)}\n` }
    list += `file 'f/${fr[fr.length - 1].file}'\n`; const lead = Math.max(0, fr[0].t - base)
    fs.writeFileSync(this.dir + 'list.txt', list); fs.writeFileSync(this.dir + 'meta.json', JSON.stringify({ markers: this.markers, end: this.endT }, null, 1))
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', this.dir + 'list.txt', '-vf', `tpad=start_duration=${lead.toFixed(3)}:start_mode=clone,fps=30,scale=${W}:${H}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', this.dir + 'clip.mp4'])
    console.log(`  [${this.name}] ${this.endT.toFixed(1)} s`); await this.ctx.close()
  }
  async box(t) { const loc = typeof t === 'string' ? this.page.locator(t).first() : t; await loc.waitFor({ state: 'visible' }); await loc.scrollIntoViewIfNeeded().catch(() => {}); return { loc, b: await loc.boundingBox() } }
  async moveTo(t) {
    const { loc, b } = await this.box(t); const x = b.x + b.width / 2, y = b.y + b.height / 2, f = this.cursorAt ?? [W * .6, H * .7]
    const d = Math.min(1000, Math.max(450, Math.hypot(x - f[0], y - f[1]) * .9))
    await this.page.evaluate(([x, y, d]) => { const c = document.getElementById('rc'); c.style.setProperty('--d', d + 'ms'); c.style.transform = `translate(${x}px,${y}px)` }, [x, y, d]); this.cursorAt = [x, y]; await this.hold(d + 120); return loc
  }
  async click(t) {
    const loc = await this.moveTo(t); const [x, y] = this.cursorAt
    await this.page.evaluate(([x, y]) => { const r = document.createElement('div'); r.className = 'rp'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.documentElement.appendChild(r); setTimeout(() => r.remove(), 700) }, [x, y])
    await loc.click({ force: true }); await this.hold(350); return loc
  }
  async type(t, text, delay = 42) { const loc = await this.click(t); await loc.pressSequentially(text, { delay }); await this.hold(250); return loc }
  async zoom(target, s, ms = 900, { cx: fx } = {}) {
    let tx = 0, ty = 0
    if (target && s > 1) {
      const { b } = await this.box(target); const cx = fx ?? (b.x + b.width / 2 - this.z.tx) / this.z.s, cy = (b.y + b.height / 2 - this.z.ty) / this.z.s
      tx = Math.min(0, Math.max(W - W * s, W / 2 - cx * s)); ty = Math.min(0, Math.max(H - H * s, H / 2 - cy * s))
    } else s = 1
    await this.page.evaluate(([s, tx, ty, ms]) => { document.body.style.setProperty('--zd', ms + 'ms'); document.body.style.transform = s === 1 ? '' : `translate(${tx}px,${ty}px) scale(${s})` }, [s, tx, ty, ms])
    if (this.cursorAt) {
      const nx = ((this.cursorAt[0] - this.z.tx) / this.z.s) * s + tx, ny = ((this.cursorAt[1] - this.z.ty) / this.z.s) * s + ty
      await this.page.evaluate(([x, y, d]) => { const c = document.getElementById('rc'); c.style.setProperty('--d', d + 'ms'); c.style.transform = `translate(${x}px,${y}px)` }, [nx, ny, ms]); this.cursorAt = [nx, ny]
    }
    this.z = { s, tx, ty }; await this.hold(ms + 100)
  }
  async think(waitFor, settle = 500) { await this.hold(400); this.pause(); try { await waitFor() } finally { await this.page.waitForTimeout(settle); await this.resume() } }
}
