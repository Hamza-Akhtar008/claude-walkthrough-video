---
name: walkthrough-video
description: Make a narrated walkthrough or demo video of a web app. Playwright drives the real app, a local voice (Kokoro) reads the script, and FFmpeg adds captions, opening slides and a 1080p MP4 plus an .srt. Use this whenever the user wants a product demo video, a narrated screen recording, an explainer or onboarding video, a feature tour, or a case-study video of an app or CRM, even if they never mention Playwright, voice-over or captions. Also use it to re-record or edit a walkthrough made with this toolkit.
---

# Walkthrough video

Turns a running web app into a finished, narrated video that can be regenerated whenever the app changes. Everything runs locally: no video editor, no paid service.

```
narration text -> local voice -> one WAV per scene + caption timings
real app -> Playwright scenes -> clips + marker times   -> assemble.py -> walkthrough.mp4 + .srt
```

Why it works this way: the footage is the real app, so it is always true; slow steps (an AI reply, a page load) are cut out while recording; and "markers" logged by each scene let the assembler land the key moment on the matching words.

## Before you start

1. Ask only for what is missing: what the app is and what the video must show, who watches it, the target length (2 to 4 minutes works well), the tone.
2. Check the tools (details in `references/setup.md`): Node 20+, Playwright with Chromium, FFmpeg with `xfade`, `zoompan`, `loudnorm`, `libx264`, and Python 3.11 or 3.12 with `kokoro-onnx`. Install the voice (about 350 MB) outside the repo, for example in `~/video-tools`.
3. Copy the working files into the user's project and keep generated output out of git:
   ```bash
   mkdir -p e2e/video-kit && cp -R <this skill>/scripts/. e2e/video-kit/ && cp <this skill>/templates/*.mjs e2e/video-kit/
   printf '\ne2e/video-kit/clips/\ne2e/video-kit/vo/\ne2e/video-kit/build/\ne2e/video-kit/*.mp4\ne2e/video-kit/*.srt\ne2e/video-kit/spec.json\ne2e/video-kit/.*.json\n' >> .gitignore
   ```
   The scripts write their output next to themselves, which is why they are copied rather than run from here.
4. Read `references/toolkit-api.md` once. It documents the recorder helpers and the `PLAN` syntax. Do not rewrite `rec.mjs`, `speak.py`, `overlays.mjs` or `assemble.py`; edit only the parts the guide names.

## The workflow: three gates

Stop at each gate and wait for the user. Wording and structure are cheap to change before recording and expensive after.

**Gate 1: storyboard.** Look at the project (its docs, routes, existing Playwright tests) and propose 8 to 12 scenes. For each: what is on screen, the narration (20 to 35 words, plain), and how it will be recorded. Include opening slides if the user wants context: the problem, what was done or audited, the solution and the stack. Do not describe anything the app does not really do; ask when unsure.

**Gate 2: wording and voice.** Write `chunks.txt` as `scene|text` lines, under about 12 words each (each line becomes one caption). Add product names and acronyms to `PRONOUNCE` in `speak.py`. Run `python speak.py` and report each scene's length. The user listens and approves before any recording.

**Gate 3: record, assemble, check.**
1. Write the scenes in `scenes.mjs` (start from `scenes.template.mjs`), one clip per scene, named `scene-N` to match the default plan. Record one scene at a time in the background: `node scenes.mjs <name>`. Re-record only the ones that fail.
2. Render slides if used (`slides.template.mjs`), then fill in `PLAN` and `LABEL` in `assemble.py`: which clip shows in which scene, and which marker lands on which narration line.
3. Run `python assemble.py all`. It writes `walkthrough.mp4` and `walkthrough.srt`.
4. Check the result from one contact sheet (a frame or two per scene, tiled) rather than many separate images: names, dates, captions, nothing cut off, nothing private. Fix, reassemble, deliver.

## Rules that matter

- **Privacy.** Use a demo or test account. Blur or cover anything showing real people, emails, phone numbers, account names, keys, IDs, tokens or billing (`opts.cover`, `opts.init`). Never type or show passwords or 2FA codes on camera. Keep `.env`, saved logins and browser profiles out of git.
- **Do not act on real accounts.** Never click anything that sends, publishes, schedules or deletes on live accounts. Hover over the button and say what it does.
- **No invented features.** Describe only what the code and the running app do.
- **Voice and microphone audio cannot be captured by the browser.** Show the interface and say what happens.
- **Check ports before starting servers; stop whatever you started.** Run anything over a minute (recording, voice, assembly) in the background and wait for it rather than polling in a loop.
- **Keep replies short.** Report what you did, file paths and anything you could not verify.

## Lessons from real use

Read `references/lessons.md` before writing scenes. The short version: verify that seeded data really exists (random test data can collide with older data); wait for a locator that proves a slow page has drawn; clear remembered search filters before typing; close pop-ups; link straight to records; wrap non-essential flourishes so one failure cannot stop a scene; and keep the bottom 200px of slides clear for captions.

## Files

- `scripts/rec.mjs` recorder: gliding cursor, click ripples, zoom, markers, `think()` to cut waits.
- `scripts/speak.py` narration to WAVs and caption timings.
- `scripts/overlays.mjs` captions, labels and title cards as images.
- `scripts/assemble.py` retimes clips to the voice, joins, overlays, mixes audio, writes MP4 and SRT.
- `templates/` starting points for scenes, a saved login, slides and the narration file.
- `references/` the toolkit guide, setup, and lessons.

## When something fails

- Speech fails with `espeakng_loader/phontab: No such file`: see `references/setup.md`.
- A scene times out waiting for text: the page may not have finished drawing, or a remembered filter is hiding the item. Take a screenshot at the failure and look.
- The video shows a wait: wrap the slow step in `think()`.
- The picture and voice drift: re-record the scene, because marker times change whenever a script changes.
