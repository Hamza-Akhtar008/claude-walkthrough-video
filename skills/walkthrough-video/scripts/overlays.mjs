// Title cards, captions and part labels for the plain walkthrough.
import { chromium } from 'playwright'
import fs from 'node:fs'
const here = new URL('./', import.meta.url).pathname
const spec = JSON.parse(fs.readFileSync(here + 'spec.json', 'utf8'))
fs.mkdirSync(here + 'build/ov', { recursive: true })
const base = `* { margin:0; padding:0; box-sizing:border-box; } html,body { width:1920px; height:1080px; font-family:-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif; }`
const card = (inner) => `<html><head><style>${base} body { background:#0f1630; color:#fff; position:relative; overflow:hidden }
  .g { position:absolute; inset:0; background-image:radial-gradient(rgba(165,180,252,.13) 1.4px, transparent 1.4px); background-size:38px 38px }
  .glow { position:absolute; width:1500px; height:1500px; left:-400px; top:-600px; border-radius:50%; background:radial-gradient(circle, rgba(79,70,229,.28), transparent 60%) }
  .c { position:absolute; left:0; right:0; top:0; bottom:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:0 200px }
  .logo { display:flex; align-items:center; gap:24px; font-size:70px; font-weight:760; } .logo i { width:96px; height:96px; border-radius:23px; background:#4f46e5; display:grid; place-items:center; font-style:normal; font-size:70px; font-weight:600; padding-bottom:6px }
  .logo em { font-style:normal; color:#8b93ff } h1 { font-size:66px; font-weight:760; letter-spacing:-.02em; line-height:1.15; margin-top:56px } p { font-size:34px; color:#cbd5e1; margin-top:26px; line-height:1.4 }</style></head>
  <body><div class="g"></div><div class="glow"></div><div class="c">${inner}</div></body></html>`
const logo = `<div class="logo"><i>${spec.brand?.mark ?? '+'}</i><div>${spec.brand?.name ?? 'Your Product'}</div></div>`
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
await p.setContent(card(`${logo}<h1>${spec.cards.intro.title}</h1><p>${spec.cards.intro.sub ?? ''}</p>`)); await p.screenshot({ path: here + 'build/card-intro.png' })
await p.setContent(card(`${logo}<h1>${spec.cards.end.title}</h1>`)); await p.screenshot({ path: here + 'build/card-end.png' })
const ov = `${base} body { background:transparent }
  .cap { position:absolute; left:50%; bottom:56px; transform:translateX(-50%); max-width:1400px; text-align:center; background:rgba(15,22,48,.82); color:#fff; font-size:36px; line-height:1.3; font-weight:550; padding:13px 30px 15px; border-radius:14px }
  .lab { position:absolute; left:34px; top:34px; display:flex; align-items:center; gap:12px; background:rgba(15,22,48,.9); color:#e0e7ff; border-radius:999px; padding:11px 26px 11px 14px; font-size:26px; font-weight:650; box-shadow:0 8px 24px rgba(0,0,0,.25) }
  .lab i { width:32px; height:32px; border-radius:9px; background:#4f46e5; display:grid; place-items:center; font-style:normal; color:#fff; font-size:22px; padding-bottom:2px }`
for (const o of spec.overlays) {
  await p.setContent(`<html><head><style>${ov}</style></head><body>${o.kind === 'cap' ? `<div class="cap">${o.text}</div>` : `<div class="lab"><i>+</i>${o.text}</div>`}</body></html>`)
  await p.screenshot({ path: here + 'build/ov/' + o.file, omitBackground: true })
}
await b.close(); console.log('overlays', spec.overlays.length)
