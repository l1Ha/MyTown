"""Crop / zoom a screenshot for close inspection.

Usage:
  python tools/crop.py shots/sat.jpg shots/_crop_village.jpg 300 150 376 304
  python tools/crop.py shots/sat.jpg shots/_crop_village.jpg 300 150 376 304 --zoom 3
"""
import sys
from PIL import Image

args = [a for a in sys.argv[1:] if not a.startswith('--')]
zoom = 3
if '--zoom' in sys.argv:
    zoom = float(sys.argv[sys.argv.index('--zoom') + 1])

src, dst = args[0], args[1]
x, y, w, h = (int(float(v)) for v in args[2:6])

im = Image.open(src).convert('RGB')
box = (x, y, x + w, y + h)
crop = im.crop(box)
if zoom != 1:
    crop = crop.resize((int(crop.width * zoom), int(crop.height * zoom)), Image.LANCZOS)
crop.save(dst, quality=95)
print('saved', dst, crop.size)
