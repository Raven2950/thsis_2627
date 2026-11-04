# Remove EXIF (GPS, camera, time) from JPEG photos without re-encoding them.
# If a photo is stored rotated (orientation ≠ 1) it is turned upright first with sips,
# so it still shows the right way up once the orientation tag is gone.
# Usage: python3 strip_photo_meta.py file.jpg …   or   --changed (photos about to be published; originals
# are copied to vault/私密/原图/ first). Prints what it did; files without EXIF are left alone.
import struct, subprocess, sys

def exif_info(data):
    i = data.find(b'Exif\x00\x00')
    if i < 0: return None
    t = data[i + 6:]; le = t[:2] == b'II'
    u16 = lambda o: struct.unpack('<H' if le else '>H', t[o:o + 2])[0]
    u32 = lambda o: struct.unpack('<I' if le else '>I', t[o:o + 4])[0]
    off = u32(4); n = u16(off); orient = 1; gps = False
    for k in range(n):
        e = off + 2 + 12 * k; tag = u16(e)
        if tag == 0x0112: orient = u16(e + 8)
        if tag == 0x8825: gps = True
    return {'orientation': orient, 'gps': gps}

def strip(data):
    out, i = bytearray(data[:2]), 2           # keep SOI
    while i < len(data) - 1 and data[i] == 0xFF:
        marker = data[i + 1]
        if marker == 0xDA: out += data[i:]; return bytes(out)      # start of scan: rest is image data
        size = struct.unpack('>H', data[i + 2:i + 4])[0]
        seg = data[i:i + 2 + size]
        if not (marker == 0xE1 and (seg[4:10] == b'Exif\x00\x00' or seg[4:33].startswith(b'http://ns.adobe.com/xap'))):
            out += seg                         # drop EXIF and XMP, keep everything else
        i += 2 + size
    return bytes(out)

ROT = {3: '180', 6: '90', 8: '270'}

def changed_photos():
    # New or modified JPEGs under vault/ that git would publish (private folders are ignored by git).
    out = subprocess.run(['git', 'ls-files', '--others', '--modified', '--exclude-standard', '-z', 'vault'], capture_output=True).stdout
    return [p for p in out.decode().split('\0') if p.lower().endswith(('.jpg', '.jpeg'))]

args = sys.argv[1:]
if args == ['--changed']:
    import os, shutil
    os.chdir(os.path.join(os.path.dirname(__file__), '..'))
    args = changed_photos()
    for p in args:   # keep the untouched original privately before changing anything
        if exif_info(open(p, 'rb').read(200000) + b''):
            dst = os.path.join('vault/私密/原图', os.path.basename(p))
            if not os.path.exists(dst): os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy2(p, dst)
for path in args:
    data = open(path, 'rb').read()
    if data[:2] != b'\xff\xd8': continue
    info = exif_info(data)
    if not info: continue
    if info['orientation'] in ROT:
        subprocess.run(['sips', '-r', ROT[info['orientation']], path], capture_output=True)
        data = open(path, 'rb').read()
    open(path, 'wb').write(strip(data))
    print(f"{path}: removed metadata{' (had GPS)' if info['gps'] else ''}{', turned upright' if info['orientation'] in ROT else ''}")
