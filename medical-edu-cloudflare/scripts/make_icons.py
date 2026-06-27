#!/usr/bin/env python3
"""Generate small PWA icons quickly using a minimal SVG-like approach."""
import struct, zlib, sys

def make_png(size: int) -> bytes:
    """Simple icon: solid brand gradient with a white EKG line."""
    # Build pixel rows directly using bytearray for speed
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter: none
        for x in range(size):
            # gradient: (3b82f6) -> (06b6d4) on diagonal
            t = (x + y) / (2 * size) if size > 0 else 0
            r = int(59 + (6 - 59) * t)
            g = int(130 + (182 - 130) * t)
            b = int(246 + (212 - 246) * t)

            # white circle
            cx = cy = size / 2
            dx = x - cx
            dy = y - cy
            d = (dx * dx + dy * dy) ** 0.5
            radius = size * 0.34
            if d <= radius:
                r, g, b = 255, 255, 255

            # EKG line in the middle (horizontal with one spike)
            mid_y = size // 2
            line_thick = max(1, size // 40)
            in_band = abs(y - mid_y) <= line_thick
            # spike region
            spike_w = size // 6
            spike_h = size // 5
            in_spike = abs(x - cx) <= spike_w and abs(y - mid_y) <= spike_h and (spike_h - abs(y - mid_y)) > (spike_w - abs(x - cx))

            if (in_band or in_spike) and d <= radius:
                r, g, b = 59, 130, 246  # brand color

            raw.append(r)
            raw.append(g)
            raw.append(b)
            raw.append(255)

    # PNG signature
    sig = b'\x89PNG\r\n\x1a\n'

    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)

    def chunk(name: bytes, data: bytes) -> bytes:
        c = name + data
        crc = zlib.crc32(c) & 0xffffffff
        return struct.pack('>I', len(data)) + c + struct.pack('>I', crc)

    idat = zlib.compress(bytes(raw), 6)
    return sig + chunk(b'IHDR', ihdr_data) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')


if __name__ == '__main__':
    import os
    out_dir = '/home/z/my-project/static'
    os.makedirs(out_dir, exist_ok=True)

    # only generate 192x192 for speed; create 512 as same bytes (will look fine)
    for size in [192, 192]:  # both same; for production use a real icon generator
        pass

    # 192 icon
    png = make_png(192)
    with open(os.path.join(out_dir, 'icon-192.png'), 'wb') as f:
        f.write(png)
    print(f'Created icon-192.png ({len(png)} bytes)')

    # 512 icon - generate separately
    png2 = make_png(512)
    with open(os.path.join(out_dir, 'icon-512.png'), 'wb') as f:
        f.write(png2)
    print(f'Created icon-512.png ({len(png2)} bytes)')
