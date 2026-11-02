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

```bash
python3.11 -m venv ~/video-tools/.venv && source ~/video-tools/.venv/bin/activate
pip install kokoro-onnx soundfile
mkdir -p ~/video-tools/kokoro && cd ~/video-tools/kokoro
curl -L -O https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -L -O https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
export KOKORO_DIR=~/video-tools/kokoro
```

Run `speak.py` from the folder that holds `chunks.txt`, with the virtual environment active and `KOKORO_DIR` set. Change the voice or speed with `VOICE` and `SPEED` (defaults `af_heart` and `0.95`).

If speech fails with `Error processing file ... espeakng_loader/phontab: No such file`, link the data next to the library:

```bash
D=$(python -c "import espeakng_loader,os;print(os.path.dirname(espeakng_loader.__file__))")
cd $D && for f in espeak-ng-data/*; do [ -e "$(basename $f)" ] || ln -s "$f" "$(basename $f)"; done
```

## Environment

- `WEB_URL` the app's address (default `http://localhost:3000`).
- `KOKORO_DIR` where the voice files are.
- `VIDEO_BRAND`, `VIDEO_MARK` the name and one-letter mark for title cards, if you use them.

## Licences

Playwright (Apache-2.0), Kokoro-82M (Apache-2.0), kokoro-onnx (MIT). FFmpeg is LGPL or GPL depending on how it was built: check your build if you redistribute it. Check the licence of any music or fonts you add.
