"""Plain technical walkthrough: footage retimed to the narration, captions and a small label per part, voice mixed in."""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); CL = os.path.join(HERE, 'clips'); B = os.path.join(HERE, 'build'); os.makedirs(B, exist_ok=True)
STEP = sys.argv[1] if len(sys.argv) > 1 else 'all'
X = .4; PRE = {1: 1.0}; POST = {}
pre = lambda i: PRE.get(i, .55); post = lambda i: POST.get(i, .75)
def run(a): subprocess.run(a, check=True)
meta = lambda n: json.load(open(f'{CL}/{n}/meta.json'))
mk = lambda n, k: meta(n)['markers'][k]; end = lambda n: meta(n)['end']
tm = json.load(open(f'{HERE}/vo/timings.json')); lens = {int(k): v for k, v in tm['lens'].items()}; chunks = tm['chunks']; N = max(lens); POST[N] = 2.0
L = {i: pre(i) + lens[i] + post(i) for i in range(1, N + 1)}; start, t = {}, 0.
for i in range(1, N + 1): start[i] = t; t += L[i]
TOTAL = t
ch = lambda sc: [c for c in chunks if c[0] == sc]; c = lambda sc, k: pre(sc) + ch(sc)[k][1]; mlen = lambda i: L[i] + (X if i < N else 0)
print('total', round(TOTAL, 1), {i: round(L[i], 1) for i in L})
clip = lambda n, a, b, an=None: ('clip', n, a, b, an or [])
def cl(n, a, b, an=None): return clip(n, max(0, a), min(end(n), b), an)
M = mk
# Default plan: scene N shows the whole clip "scene-N", stretched to the narration. Replace entries with several segments
# and marker anchors when a scene needs them (see references/toolkit-api.md, step 3):
#   2: [(0, cl('login', 0, M('login', 'shown') + 2, [(M('login', 'shown'), c(2, 1) + .5)])),
#       (c(2, 3) - .2, cl('dashboard', 0, end('dashboard')))],
PLAN = {i: [(0, cl(f'scene-{i}', 0, end(f'scene-{i}')))] for i in range(1, N + 1)}
# Slides or title cards instead of a clip:  1: [(0, ('still', 'slide-1.png'))]   (images live in build/)
LABEL = {}   # small corner label per scene, for example {2: 'Sign in', 3: 'Dashboard'}
spec = {'brand': {'name': os.environ.get('VIDEO_BRAND', 'Your Product'), 'mark': os.environ.get('VIDEO_MARK', '+')}, 'cards': {'intro': {'title': 'Your headline', 'sub': 'Your subtitle'}, 'end': {'title': 'Your closing line'}}, 'overlays': []}; OV = []
for sc, text in LABEL.items():
    f = f'lab-{sc}.png'; spec['overlays'].append({'kind': 'lab', 'text': text, 'file': f}); OV.append((f, start[sc] + .3, start[sc] + L[sc] - .1, 'lab'))
for k, (sc, a, b, text) in enumerate(chunks):
    f = f'cap-{k:02d}.png'; spec['overlays'].append({'kind': 'cap', 'text': text, 'file': f}); OV.append((f, start[sc] + pre(sc) + a, start[sc] + pre(sc) + b + .05, 'cap'))
json.dump(spec, open(f'{HERE}/spec.json', 'w'), indent=1, ensure_ascii=False)
if STEP in ('all', 'overlays'): run(['node', f'{HERE}/overlays.mjs'])
def retime(name, a, b, anchors, out_len, out):
    pts = [(a, 0.)] + [(s, d) for s, d in anchors if a < s < b and 0 < d < out_len] + [(b, out_len)]; parts, labels = [], []
    for k in range(len(pts) - 1):
        (sa, da), (sb, db) = pts[k], pts[k + 1]; sl, dl = max(.05, sb - sa), max(.05, db - da); f = dl / sl; hold = 0
        if f > 1.25: hold = dl - sl * 1.25; f = 1.25
        seg = f'[0:v]trim=start={sa:.3f}:end={sb:.3f},setpts=(PTS-STARTPTS)*{f:.4f}'
        if hold > .02: seg += f',tpad=stop_mode=clone:stop_duration={hold:.3f}'
        parts.append(seg + f',fps=30[v{k}]'); labels.append(f'[v{k}]')
    g = ';'.join(parts) + f';{"".join(labels)}concat=n={len(labels)}:v=1:a=0,tpad=stop_mode=clone:stop_duration=2,trim=duration={out_len:.3f},setpts=PTS-STARTPTS[out]'
    run(['ffmpeg', '-y', '-v', 'error', '-i', f'{CL}/{name}/clip.mp4', '-filter_complex', g, '-map', '[out]', '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', out])
def still(path, dur, out):
    n = int(round(dur * 30)); run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-framerate', '30', '-t', f'{dur:.3f}', '-i', f'{B}/{path}', '-vf', f"scale=2112:-1,zoompan=z='1+0.03*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,format=yuv420p", '-frames:v', str(n), '-c:v', 'libx264', '-crf', '14', out])
if STEP in ('all', 'clips'):
    for sc, segs in PLAN.items():
        files = []
        for k, (s0, seg) in enumerate(segs):
            s1 = segs[k + 1][0] if k + 1 < len(segs) else mlen(sc); out = f'{B}/seg-{sc}-{k}.mp4'
            if seg[0] == 'still': still(seg[1], s1 - s0, out)
            else: _, n, a, b, an = seg; retime(n, a, b, [(s, d - s0) for s, d in an], s1 - s0, out)
            files.append(out)
        open(f'{B}/s{sc}.txt', 'w').write(''.join(f"file '{f}'\n" for f in files)); run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', f'{B}/s{sc}.txt', '-c', 'copy', f'{B}/scene-{sc}.mp4']); print('scene', sc)
if STEP in ('all', 'join'):
    ins = sum((['-i', f'{B}/scene-{i}.mp4'] for i in range(1, N + 1)), []); g, prev, acc = [], '[0:v]', 0.
    for i in range(2, N + 1): acc += L[i - 1]; g.append(f'{prev}[{i-1}:v]xfade=transition=fade:duration={X}:offset={acc:.3f}[x{i}]'); prev = f'[x{i}]'
    run(['ffmpeg', '-y', '-v', 'error', *ins, '-filter_complex', ';'.join(g), '-map', prev, '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', f'{B}/base.mp4'])
if STEP in ('all', 'final'):
    ins = ['-i', f'{B}/base.mp4'] + sum((['-i', f'{HERE}/vo/vo-{i:02d}.wav'] for i in range(1, N + 1)), []); g, prev = [], '[0:v]'
    for k, (f, a, b, kind) in enumerate(OV):
        idx = N + 1 + k; dur = max(.5, b - a); fd = .3 if kind == 'lab' else .12
        ins += ['-loop', '1', '-framerate', '30', '-t', f'{dur + .1:.3f}', '-i', f'{B}/ov/{f}']
        g.append(f'[{idx}:v]format=rgba,fade=t=in:st=0:d={fd}:alpha=1,fade=t=out:st={dur - fd:.3f}:d={fd}:alpha=1,setpts=PTS-STARTPTS+{a:.3f}/TB[o{k}]'); g.append(f'{prev}[o{k}]overlay=0:0:eof_action=pass[b{k}]'); prev = f'[b{k}]'
    am = []
    for i in range(1, N + 1): g.append(f'[{i}:a]aresample=48000,aformat=channel_layouts=mono,adelay={int((start[i] + pre(i)) * 1000)}:all=1[a{i}]'); am.append(f'[a{i}]')
    g.append(f'{"".join(am)}amix=inputs={N}:normalize=0,apad=whole_dur={TOTAL:.3f},loudnorm=I=-16:TP=-1.5:LRA=11,volume=-2.8dB,aresample=48000,pan=stereo|c0=c0|c1=c0[aout]')
    out = f'{HERE}/walkthrough.mp4'
    run(['ffmpeg', '-y', '-v', 'error', *ins, '-filter_complex', ';'.join(g), '-map', prev, '-map', '[aout]', '-t', f'{TOTAL:.3f}', '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out])
    ts = lambda x: f'{int(x//3600):02d}:{int(x%3600//60):02d}:{int(x%60):02d},{int(round((x-int(x))*1000)):03d}'
    with open(f'{HERE}/walkthrough.srt', 'w') as fh:
        for n, (sc, a, b, text) in enumerate(chunks, 1): fh.write(f'{n}\n{ts(start[sc]+pre(sc)+a)} --> {ts(start[sc]+pre(sc)+b)}\n{text}\n\n')
    print('done', round(TOTAL, 1))
