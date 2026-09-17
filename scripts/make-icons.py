#!/usr/bin/env python3
"""Write PNG toolbar icons without third-party dependencies."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "icons"

BG = (13, 42, 38, 255)
SHIELD = (62, 224, 178, 255)
SLASH = (15, 20, 25, 255)
DOT = (248, 252, 250, 255)


def write_png(path: Path, width: int, height: int, pixels: bytes) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + pixels[y * width * 4 : (y + 1) * width * 4] for y in range(height))
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def draw(size: int) -> bytes:
    px = bytearray(size * size * 4)
    margin = size * 0.08
    radius = size * 0.18

    def set_px(x: int, y: int, color: tuple[int, int, int, int]) -> None:
        if 0 <= x < size and 0 <= y < size:
            i = (y * size + x) * 4
            px[i : i + 4] = bytes(color)

    def in_round_rect(x: float, y: float) -> bool:
        # Rounded square background.
        lx, rx = margin, size - 1 - margin
        ty, by = margin, size - 1 - margin
        if lx + radius <= x <= rx - radius and ty <= y <= by:
            return True
        if ty + radius <= y <= by - radius and lx <= x <= rx:
            return True
        corners = (
            (lx + radius, ty + radius),
            (rx - radius, ty + radius),
            (lx + radius, by - radius),
            (rx - radius, by - radius),
        )
        return any((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2 for cx, cy in corners)

    def in_shield(x: float, y: float) -> bool:
        # Classic heater-shield: straight sides, pointed bottom.
        cx = (size - 1) / 2
        top = size * 0.20
        bottom = size * 0.84
        width_top = size * 0.28
        if y < top or y > bottom:
            return False
        # Width tapers after the waist.
        waist = size * 0.52
        if y <= waist:
            half = width_top
        else:
            t = (y - waist) / (bottom - waist)
            half = width_top * (1 - t)
        return abs(x - cx) <= half

    def near_slash(x: float, y: float) -> bool:
        # Diagonal bar through the shield.
        # line from (0.32, 0.72) to (0.68, 0.30)
        x0, y0 = size * 0.30, size * 0.74
        x1, y1 = size * 0.70, size * 0.28
        dx, dy = x1 - x0, y1 - y0
        length = (dx * dx + dy * dy) ** 0.5
        if length == 0:
            return False
        t = ((x - x0) * dx + (y - y0) * dy) / (length * length)
        if t < 0 or t > 1:
            return False
        px_, py_ = x0 + t * dx, y0 + t * dy
        dist = ((x - px_) ** 2 + (y - py_) ** 2) ** 0.5
        return dist <= size * 0.07

    cx = (size - 1) / 2
    cy = size * 0.40
    for y in range(size):
        for x in range(size):
            if not in_round_rect(x, y):
                set_px(x, y, (0, 0, 0, 0))
                continue
            if in_shield(x, y):
                if near_slash(x, y):
                    set_px(x, y, SLASH)
                else:
                    set_px(x, y, SHIELD)
            else:
                set_px(x, y, BG)
            # small highlight dot
            if (x - cx) ** 2 + (y - cy + size * 0.04) ** 2 <= (size * 0.045) ** 2:
                if in_shield(x, y) and not near_slash(x, y):
                    set_px(x, y, DOT)
    return bytes(px)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for size in (16, 32, 48, 128):
        write_png(OUT / f"icon{size}.png", size, size, draw(size))
        print("wrote", OUT / f"icon{size}.png")


if __name__ == "__main__":
    main()
