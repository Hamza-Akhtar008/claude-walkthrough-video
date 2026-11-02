# Toolkit reference: recorder, voice and assembler

Generate a narrated (or silent) walkthrough video of **your own web app**, from a script, with no screen-recording by hand.
It drives the real app in a browser, records it, adds a voice-over and captions, and produces a finished MP4 that you can regenerate whenever the app changes.

Everything runs locally. No video editor and no paid service is required.

## What it does

```
narration text ──► voice (Kokoro, local) ──► one WAV per scene + caption timings
                                                          │
real app ──► Playwright scripts ──► clips + "marker" times ┤
                                                          ▼
                              assemble.py: retime clips to the voice, add captions and labels,
                                           crossfade, mix audio  ──►  walkthrough.mp4 + .srt
```

Key ideas:
- **Real app, scripted.** Every click, answer and screen is genuine, and a re-record takes minutes.
- **Thinking time is cut.** Capture pauses while a slow step (for example an AI reply) loads, so the video never shows a wait.
- **Markers sync picture to voice.** A scene script logs when things happen ("answer appeared", "Confirm pressed"). The assembler stretches or holds the clip so each moment lands on the matching words.
- **Text is rendered as images.** Captions and labels are HTML screenshots (transparent PNG) overlaid by FFmpeg, so it works with any FFmpeg build, even without the `drawtext` filter.

## Requirements

| Tool | Version used | Notes |
|---|---|---|
| Node.js | 22+ | runs Playwright |
| Playwright | 1.60 (`npm run setup`) | installs Chromium |
| FFmpeg and ffprobe | any recent | needs `xfade`, `zoompan`, `loudnorm`, `libx264` |
| Python | 3.12 | for the voice and assembly scripts |
| `kokoro-onnx`, `soundfile` | latest | local text-to-speech (Apache-2.0) |
| About 400 MB disk | | Kokoro model files |

macOS and Linux work. On Windows use WSL.

## Setup

```bash
npm install playwright dotenv && npx playwright install chromium

# Voice (once)
python3 -m venv .venv && source .venv/bin/activate
pip install kokoro-onnx soundfile
mkdir kokoro && cd kokoro
curl -L -O https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -L -O https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
cd ..
export KOKORO_DIR=$PWD/kokoro
```

If speech fails with `Error processing file ... espeakng_loader/phontab: No such file`, link the data next to the library:
```bash
D=$(python -c "import espeakng_loader,os;print(os.path.dirname(espeakng_loader.__file__))")
cd $D && for f in espeak-ng-data/*; do [ -e "$(basename $f)" ] || ln -s "$f" "$(basename $f)"; done
```

## The workflow

### 1. Write the narration (`chunks.txt`)
One line per caption chunk, as `scene|text`. Chunks are what appear as captions, so keep them under about 12 words. A scene is one spoken block (about 10 to 25 seconds works well).

```
3|Here, a visitor signs up for a trial,
3|and the app confirms it straight away.
3|The confirmation email is sent while they read this.
```
See `templates/chunks.example.txt`. Put the file in the folder you run the scripts from.

Tune pronunciation in `speak.py` (`PRONOUNCE`), for example `('API', 'A.P.I.')`. The text on screen is not changed, only what is spoken.

```bash
python speak.py          # writes vo/vo-01.wav ... and vo/timings.json (caption timings)
```
Listen to the WAVs now. It is far cheaper to change wording before you record.

### 2. Record the app (`scenes.mjs`)
Copy `templates/scenes.template.mjs` and replace the scenes with your own. Each scene is a function that opens a clip, performs the flow, and logs markers:

```js
import { launch, close, Clip } from './rec.mjs'
await launch()
const c = await new Clip('checkout').open('/cart')   // clip name, start page
await c.start()                                  // begin capturing frames
await c.hold(600)
await c.type('#email', 'sam@example.com')        // gliding cursor, ripples, typing
await c.click(c.page.getByRole('button', { name: 'Pay' }))
await c.think(() => c.page.getByText('Order confirmed').waitFor())   // capture is PAUSED while this waits
c.mark('confirmed')                              // remember this moment for syncing
await c.zoom(c.page.getByText('Order confirmed'), 1.3, 800)         // gentle zoom on an element
await c.hold(2200)
await c.stop()                                   // writes clips/checkout/clip.mp4 + meta.json (markers)
await close()
```

Helpers on `Clip`: `click`, `type`, `moveTo`, `hold(ms)`, `zoom(target, scale, ms)`, `mark(name)`, `think(waitFn)`, `pause()` and `resume()`.
Set `WEB_URL` for your app. For a page behind a login, save the session once by signing in by hand (see `templates/auth.template.mjs`) and pass it as `opts.state`; the scripts never read or store passwords.

Record at 1920 by 1080 with a clean state: realistic data, no test names, no dates you do not want shown, no keys in view.

### 3. Assemble (`assemble.py`)
Edit three things at the top of the file:
- `PLAN`: for each scene, which clip(s) to show and where its markers should land on the narration.
- `LABEL`: the small label shown in the corner for each scene.
- `spec['brand']` and `spec['cards']`: product name, intro and closing titles.

A `PLAN` entry reads like this:
```python
5: [(0, clip('checkout', 0, end('checkout'),
        [(mk('checkout', 'confirmed'), c(5, 2) + 0.5)]))]
#     scene   clip name   from  to       marker in clip  →  second in the scene where the voice says chunk 2, plus 0.5 s
```
`c(scene, k)` is the start time of narration chunk `k`. `mk(clip, name)` is the marker time. The assembler retimes the clip so the marker lands there (never faster than 1.25 times, and holds the last frame if the clip is short).

```bash
python assemble.py all   # overlays, clips, join, final
```
Output: `walkthrough.mp4` (H.264, AAC, normalised to -16 LUFS) and `walkthrough.srt`.
You can run stages separately: `overlays`, `clips`, `join`, `final`.

### 4. Review
Pull a frame from each scene and look at it before sharing:
```bash
ffmpeg -ss 30 -i walkthrough.mp4 -frames:v 1 frame.jpg
ffmpeg -nostats -i walkthrough.mp4 -af ebur128=framelog=quiet -f null - 2>&1 | grep " I:"   # loudness
```

## Making a silent version
Skip the voice. Replace each scene's narration with a short **slide** (title, two or three sentences, "what you will see" steps), hold it about 9 to 11 seconds so people can read it (about 2 to 3 words per second), then show the clip with short on-screen callouts. Do not add an audio track (`-an`). (Build the slides as HTML, render each with Playwright, and join them with FFmpeg the same way as the title cards in `overlays.mjs`.)

## Things we learned (read these)
- **Cut waits, not actions.** Use `think()` around anything slow. Keep the cursor still while it waits.
- **Re-record markers, do not guess them.** If you change a script, re-run it: marker times change.
- **Keep scenes self-contained.** Each clip should open the page fresh, so you can re-record one scene without the others.
- **Dates move.** Seed data tied to "today" goes stale the next day. Link straight to records (`?id=123`) rather than relying on today's list.
- **Rate limits.** If your API throttles, space the recording out or raise the limit in a dev environment.
- **Do not run waiting loops with `pgrep -f "node scenes.mjs"`** from a shell whose own command contains that text. It matches itself and waits forever.
- **Privacy.** Use synthetic data. Check frames for names, emails, tokens, URLs and notification pop-ups before publishing.
- **Voice.** Kokoro is natural but not human. For marketing, swap `speak.py` for a paid voice (ElevenLabs, a voice artist). The rest of the pipeline only needs one WAV per scene and `timings.json`.
- **Music.** Not included. Add a licensed track in `assemble.py` with one more `amix` input at about -18 dB under the voice.

## Files

| File | Purpose |
|---|---|
| `rec.mjs` | Recorder: frame capture, cursor, ripples, zoom, markers, pause while waiting |
| `speak.py` | Narration to WAVs and caption timings (Kokoro) |
| `overlays.mjs` | Renders title cards, captions and corner labels as images |
| `assemble.py` | Retimes clips, joins scenes, overlays, mixes audio, writes MP4 and SRT |
| `templates/scenes.template.mjs` | A starting point for your scenes |
| `templates/chunks.example.txt` | A neutral example of the narration file |

## Licences
Playwright (Apache-2.0), Kokoro-82M (Apache-2.0), kokoro-onnx (MIT). FFmpeg is LGPL or GPL depending on how it was built: check your build if you redistribute it. Check the licence of any music or fonts you add.

## Clip.open options

```js
// Clip.open(path, opts)   -- every option is optional
//   opts.state    storage-state file: a saved login for your own app (templates/auth.template.mjs)
//   opts.profile  persistent browser profile: keeps a login to a third-party site (for example a CRM with 2FA)
//   opts.init     a function run before every page load (set local storage, blur something private)
//   opts.ready    a locator to wait for after the first page load (slow single-page apps)
//   opts.cover    { left, top, width, height, label }: paint over something private on every page
//   opts.popups   button names to click away on each page load, for example ['Cancel', 'Got it']
// Clip.goto(url, ready)   wait for a locator that proves the page has drawn
```

Notes:
- Save the login once with a small script, then every scene reuses it. The saved login files are secrets: keep them out of git.
- A third-party site you do not control often shows pop-ups, remembers the last search, and loads slowly. Wait for a locator that proves the page drew, clear remembered filters before typing, and wrap non-essential flourishes so one failure cannot stop a scene.
- Python 3.11 or 3.12 works for the voice. Newer versions may not have wheels for `kokoro-onnx` yet.
