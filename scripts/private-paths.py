# Keep private things out of the public repo (and so off the website):
#   - images of moodboards not marked public (vault/_系统/灵感板.json)
#   - notes with `draft: true` in their properties
# They go into .git/info/exclude (local only) and are untracked if they were published before.
import json, os, re, subprocess

os.chdir(os.path.join(os.path.dirname(__file__), '..'))
private = []

try: boards = json.load(open('vault/_系统/灵感板.json')).get('boards', {})
except (OSError, ValueError): boards = {}
base = 'vault/灵感板/图片'
if os.path.isdir(base):
    private += sorted(f'{base}/{n}/' for n in os.listdir(base) if not boards.get(n, {}).get('public'))

for d, dirs, files in os.walk('vault'):
    dirs[:] = [x for x in dirs if not x.startswith('.') and x not in ('附件', '私密')]
    for f in files:
        if not f.endswith('.md'): continue
        p = os.path.join(d, f)
        try: head = open(p, encoding='utf-8').read(3000)
        except OSError: continue
        m = re.match(r'---\n(.*?)\n---', head, re.S)
        if m and re.search(r'^draft:\s*(true|yes)\s*$', m.group(1), re.M | re.I):
            private.append(p)

path = '.git/info/exclude'
lines = open(path).read().split('\n') if os.path.exists(path) else []
start = '# 不公开（scripts/private-paths.py 自动生成）'
for old in (start, '# 灵感板（不公开）'):
    if old in lines: lines = lines[:lines.index(old)]
lines = [l for l in lines if l] + [start] + ['/' + p.replace('[', '\\[').replace('*', '\\*').replace('?', '\\?') for p in sorted(private)]
open(path, 'w').write('\n'.join(lines) + '\n')
for p in private:
    subprocess.run(['git', 'rm', '-r', '--cached', '--quiet', '--ignore-unmatch', '--', p])
print(f'不公开：{len(private)} 项')
