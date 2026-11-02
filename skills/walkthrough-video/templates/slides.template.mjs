// Opening slides, rendered as 1920x1080 images in build/. In assemble.py use:  1: [(0, ('still', 'slide-1.png'))]
// Keep the bottom 200px clear: the captions sit there. Edit the three slides below.
import { chromium } from 'playwright'
import fs from 'node:fs'
const here = new URL('./', import.meta.url).pathname
fs.mkdirSync(here + 'build', { recursive: true })
const base = `* { margin:0; padding:0; box-sizing:border-box } html,body { width:1920px; height:1080px }
body { background:#0F1C2B; color:#F3EFE6; font-family:-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif; position:relative; overflow:hidden }
.w { position:absolute; left:140px; right:140px; top:70px; bottom:230px; display:flex; flex-direction:column; justify-content:center }
.e { font-size:30px; font-weight:700; letter-spacing:.2em; color:#E0A93B; margin-bottom:22px }
h1 { font-size:78px; line-height:1.1; font-weight:760; letter-spacing:-.02em; margin-bottom:44px; max-width:1500px }
ul { list-style:none } li { font-size:44px; line-height:1.3; margin-bottom:22px; padding-left:46px; position:relative; color:#D6DEE6 }
li::before { content:""; position:absolute; left:0; top:20px; width:16px; height:16px; border-radius:50%; background:#E0A93B } li b { color:#fff }`
const slides = {
  1: `<div class="e">THE PROBLEM</div><h1>One sentence that names the problem</h1><ul><li>A short point, with a <b>key phrase</b> in bold</li><li>Another short point</li><li>A third point</li></ul>`,
  2: `<div class="e">WHAT WE DID</div><h1>One sentence about the approach</h1><ul><li>What you looked at</li><li>What you found</li><li>What you decided</li></ul>`,
  3: `<div class="e">THE SOLUTION</div><h1>One sentence about the solution</h1><ul><li><b>Part one:</b> what it is</li><li><b>Part two:</b> what it is</li><li><b>Part three:</b> what it is</li></ul>`,
}
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
for (const [n, inner] of Object.entries(slides)) { await p.setContent(`<html><head><style>${base}</style></head><body><div class="w">${inner}</div></body></html>`); await p.screenshot({ path: `${here}build/slide-${n}.png` }) }
await b.close(); console.log('slides', Object.keys(slides).length)
