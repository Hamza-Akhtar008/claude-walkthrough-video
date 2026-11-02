# Privacy policy

Last updated: 2026-11-02

`claude-walkthrough-video` is an open-source Claude Code plugin. It has no server, no account system and no analytics. The author receives no data from your use of it.

## What the plugin does with data

The plugin runs entirely on your own computer. It opens a web app that you choose in a browser, records the pages, and writes the results into a folder in your project: screen frames, clips, voice-over audio, captions and the finished video.

- **Personal data on screen.** Whatever your app shows while it records ends up in the recording. The plugin does not look for or collect personal data on purpose. Use a demo account and cover anything private (the plugin includes options to do this).
- **Saved sign-in session (optional).** If you choose to save a login so scenes can reuse it, it is kept in a local file in your project. The plugin never asks for, reads or stores passwords: you sign in yourself in a visible browser. Keep that file out of version control.
- **Local text-to-speech.** The narration is turned into audio by a model that runs on your machine. No text or audio is sent to a cloud speech service.

## What is sent over the network

Nothing you create is uploaded. The only network activity is downloading software you ask it to set up: the Playwright browser, Python packages and the Kokoro voice model files from GitHub. The plugin's own scripts make no outbound requests, and no data is shared with third parties.

## Retention

The author keeps no data. Files the plugin creates stay in your project folder until you delete them.

## Children

This is a developer tool and is not intended for people under 18.

## Changes and contact

If this policy changes, the new version will be published in this file with a new date. Questions or concerns: open an issue at https://github.com/Hamza-Akhtar008/claude-walkthrough-video/issues.
