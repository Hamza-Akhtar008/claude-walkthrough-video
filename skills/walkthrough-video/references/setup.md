# Setup

## Tools

| Tool | Notes |
|---|---|
| Node.js 20+ | runs Playwright |
| Playwright | `npm install playwright dotenv && npx playwright install chromium` |
| FFmpeg and ffprobe | needs `xfade`, `zoompan`, `loudnorm`, `libx264`. Check: `ffmpeg -filters \| grep -E "xfade\|zoompan\|loudnorm"` |
| Python 3.11 or 3.12 | for the voice and assembly. Newer versions may lack wheels for `kokoro-onnx` |
| About 400 MB disk | the voice model files |

macOS and Linux work. On Windows use WSL.

## The voice (once, outside the repo)

Make a Python 3.11 virtual environment in `~/video-tools/.venv` and install two packages into it: `kokoro-onnx` and `soundfile`.

Then download the two model files (about 350 MB together) into `~/video-tools/kokoro/`:

- [kokoro-v1.0.onnx](https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx)
- [voices-v1.0.bin](https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin)

Run `speak.py` from the folder that holds `chunks.txt`, with that virtual environment active and the environment variable `KOKORO_DIR` set to `~/video-tools/kokoro`. Change the voice or speed with `VOICE` and `SPEED` (defaults `af_heart` and `0.95`).

If speech fails with `Error processing file ... espeakng_loader/phontab: No such file`, the espeak data folder is not next to the library. Link each item inside the package's `espeak-ng-data/` folder into the package folder itself (the package is `espeakng_loader`; find its folder with `os.path.dirname(espeakng_loader.__file__)`).

## Environment

- `WEB_URL` the app's address (default `http://localhost:3000`).
- `KOKORO_DIR` where the voice files are.
- `VIDEO_BRAND`, `VIDEO_MARK` the name and one-letter mark for title cards, if you use them.

## Licences

Playwright (Apache-2.0), Kokoro-82M (Apache-2.0), kokoro-onnx (MIT). FFmpeg is LGPL or GPL depending on how it was built: check your build if you redistribute it. Check the licence of any music or fonts you add.
