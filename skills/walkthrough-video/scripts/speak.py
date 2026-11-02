import json, os, soundfile as sf
from kokoro_onnx import Kokoro
VOICE, SPEED, OUT = os.environ.get('VOICE', 'af_heart'), float(os.environ.get('SPEED', 0.95)), 'vo'
# Respellings so the voice says what you mean. Add your product and term names here.
PRONOUNCE = [('AI', 'A.I.'), ('“', ''), ('”', '')]   # add product and term respellings, for example ('API', 'A.P.I.')
def voiced(t):
    for a, b in PRONOUNCE: t = t.replace(a, b)
    return t
chunks = [l.rstrip('\n').split('|', 1) for l in open('chunks.txt') if l.strip()]
k = Kokoro(os.environ.get('KOKORO_DIR', '.') + '/kokoro-v1.0.onnx', os.environ.get('KOKORO_DIR', '.') + '/voices-v1.0.bin'); os.makedirs(OUT, exist_ok=True)
lens, out = {}, []
for sc in sorted({int(s) for s, _ in chunks}):
    cs = [c for s, c in chunks if int(s) == sc]
    a, r = k.create(voiced(' '.join(cs)), voice=VOICE, speed=SPEED, lang='en-us'); sf.write(f'{OUT}/vo-{sc:02d}.wav', a, r); lens[sc] = len(a) / r
    ds = [len(k.create(voiced(c), voice=VOICE, speed=SPEED, lang='en-us')[0]) / r for c in cs]; sc_ = lens[sc] / sum(ds); t = 0
    for c, d in zip(cs, ds): out.append([sc, round(t, 3), round(t + d * sc_, 3), c]); t += d * sc_
    print(f'scene {sc}: {lens[sc]:.1f}s')
json.dump({'lens': lens, 'chunks': out}, open(f'{OUT}/timings.json', 'w'), ensure_ascii=False, indent=1)
