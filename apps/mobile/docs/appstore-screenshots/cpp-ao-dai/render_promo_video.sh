#!/bin/zsh

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
IPHONE_DIR="$SCRIPT_DIR/iphone"
FONT_FILE="/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
OUTPUT_FILE="$SCRIPT_DIR/anyrent-cpp-ao-dai-promo-vertical.mp4"
SCENE_DIR=$(mktemp -d /tmp/anyrent-cpp-scenes.XXXXXX)

cleanup() {
  rm -rf "$SCENE_DIR"
}
trap cleanup EXIT

if [[ ! -f "$FONT_FILE" ]]; then
  echo "Font file not found: $FONT_FILE" >&2
  exit 1
fi

SCENE_DIR="$SCENE_DIR" IPHONE_DIR="$IPHONE_DIR" FONT_FILE="$FONT_FILE" python3 - <<'PY'
import os
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

WIDTH = 1080
HEIGHT = 1920
SCREEN_TOP = 310
SCREEN_HEIGHT = 1540
CARD_PADDING = 16
CARD_RADIUS = 42
TEXT_CARD = (48, 66, 1032, 296)
TITLE_COLOR = (17, 17, 17)
SUBTITLE_COLOR = (32, 58, 115)
CTA_COLOR = (32, 58, 115)
CTA_TEXT_COLOR = (255, 255, 255)

scene_dir = Path(os.environ["SCENE_DIR"])
iphone_dir = Path(os.environ["IPHONE_DIR"])
font_file = os.environ["FONT_FILE"]

scenes = [
    {
        "file": "01-products.png",
        "title": "Quản lý cửa hàng cho thuê",
        "subtitle": "Ngay trên điện thoại với AnyRent",
    },
    {
        "file": "02-cart-rent-dates.png",
        "title": "Tạo đơn thuê trong vài chạm",
        "subtitle": "Chọn khách, ngày lấy, ngày trả",
    },
    {
        "file": "03-order-preview.png",
        "title": "Kiểm tra đơn trước khi chốt",
        "subtitle": "Giảm nhầm lẫn và xử lý nhanh hơn",
    },
    {
        "file": "04-orders.png",
        "title": "Theo dõi mọi đơn hàng",
        "subtitle": "Trạng thái, ngày nhận, ngày trả",
    },
    {
        "file": "05-calendar.png",
        "title": "Nắm lịch thuê trong ngày",
        "subtitle": "Không bỏ sót việc cần xử lý",
    },
    {
        "file": "06-overview.png",
        "title": "Nắm doanh thu và vận hành",
        "subtitle": "AnyRent giúp cửa hàng gọn hơn mỗi ngày",
        "cta": "Xem demo ngay",
    },
]


def fit_cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize(
        (int(round(image.width * scale)), int(round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    left = max((resized.width - target_w) // 2, 0)
    top = max((resized.height - target_h) // 2, 0)
    return resized.crop((left, top, left + target_w, top + target_h))


def fit_inside(image: Image.Image, max_w: int, max_h: int) -> Image.Image:
    scale = min(max_w / image.width, max_h / image.height)
    return image.resize(
        (int(round(image.width * scale)), int(round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_centered_lines(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    top: int,
    line_gap: int,
) -> int:
    y = top
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        draw.text(((WIDTH - w) / 2, y), line, font=font, fill=fill)
        y += h + line_gap
    return y


for index, spec in enumerate(scenes, start=1):
    screenshot = Image.open(iphone_dir / spec["file"]).convert("RGBA")

    background = fit_cover(screenshot, (WIDTH, HEIGHT)).filter(ImageFilter.GaussianBlur(24))
    tint = Image.new("RGBA", (WIDTH, HEIGHT), (241, 244, 251, 84))
    canvas = Image.alpha_composite(background, tint)

    screen = fit_inside(screenshot, 860, SCREEN_HEIGHT).convert("RGBA")

    card_size = (screen.width + CARD_PADDING * 2, screen.height + CARD_PADDING * 2)
    card = Image.new("RGBA", card_size, (255, 255, 255, 232))
    card_mask = rounded_mask(card_size, CARD_RADIUS)
    card.putalpha(card_mask)

    shadow = Image.new("RGBA", (card_size[0] + 42, card_size[1] + 42), (0, 0, 0, 0))
    shadow_layer = Image.new("RGBA", card_size, (17, 24, 39, 120))
    shadow.paste(shadow_layer, (21, 21), card_mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))

    card_x = (WIDTH - card.width) // 2
    card_y = SCREEN_TOP
    canvas.alpha_composite(shadow, (card_x - 21, card_y - 8))
    canvas.alpha_composite(card, (card_x, card_y))

    screen_mask = rounded_mask(screen.size, 34)
    screen.putalpha(screen_mask)
    canvas.alpha_composite(screen, (card_x + CARD_PADDING, card_y + CARD_PADDING))

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.rounded_rectangle(TEXT_CARD, radius=42, fill=(255, 255, 255, 178))

    if "cta" in spec:
        overlay_draw.rounded_rectangle((180, 1770, 900, 1858), radius=44, fill=CTA_COLOR + (235,))

    canvas = Image.alpha_composite(canvas, overlay)
    draw = ImageDraw.Draw(canvas)

    title_font = ImageFont.truetype(font_file, 70)
    subtitle_font = ImageFont.truetype(font_file, 38)
    cta_font = ImageFont.truetype(font_file, 40)

    title_lines = wrap_text(draw, spec["title"], title_font, 900)
    subtitle_lines = wrap_text(draw, spec["subtitle"], subtitle_font, 880)

    next_y = draw_centered_lines(draw, title_lines, title_font, TITLE_COLOR, 94, 8)
    draw_centered_lines(draw, subtitle_lines, subtitle_font, SUBTITLE_COLOR, next_y + 12, 6)

    if "cta" in spec:
        cta_bbox = draw.textbbox((0, 0), spec["cta"], font=cta_font)
        cta_w = cta_bbox[2] - cta_bbox[0]
        cta_h = cta_bbox[3] - cta_bbox[1]
        draw.text(((WIDTH - cta_w) / 2, 1770 + (88 - cta_h) / 2 - 4), spec["cta"], font=cta_font, fill=CTA_TEXT_COLOR)

    canvas.convert("RGB").save(scene_dir / f"scene-{index:02d}.png", quality=95)
PY

ffmpeg -y \
  -loop 1 -t 4.0 -i "$SCENE_DIR/scene-01.png" \
  -loop 1 -t 3.8 -i "$SCENE_DIR/scene-02.png" \
  -loop 1 -t 3.5 -i "$SCENE_DIR/scene-03.png" \
  -loop 1 -t 4.0 -i "$SCENE_DIR/scene-04.png" \
  -loop 1 -t 3.5 -i "$SCENE_DIR/scene-05.png" \
  -loop 1 -t 5.0 -i "$SCENE_DIR/scene-06.png" \
  -f lavfi -t 20.8 -i anullsrc=channel_layout=stereo:sample_rate=44100 \
  -filter_complex "\
[0:v]format=yuv420p[s0]; \
[1:v]format=yuv420p[s1]; \
[2:v]format=yuv420p[s2]; \
[3:v]format=yuv420p[s3]; \
[4:v]format=yuv420p[s4]; \
[5:v]format=yuv420p[s5]; \
[s0][s1]xfade=transition=fade:duration=0.6:offset=3.4[x1]; \
[x1][s2]xfade=transition=fade:duration=0.6:offset=6.6[x2]; \
[x2][s3]xfade=transition=fade:duration=0.6:offset=9.5[x3]; \
[x3][s4]xfade=transition=fade:duration=0.6:offset=12.9[x4]; \
[x4][s5]xfade=transition=fade:duration=0.6:offset=15.8[video]" \
  -map "[video]" \
  -map 6:a \
  -c:v libx264 \
  -c:a aac \
  -b:a 128k \
  -pix_fmt yuv420p \
  -r 30 \
  -shortest \
  -movflags +faststart \
  "$OUTPUT_FILE"

echo "Video rendered to: $OUTPUT_FILE"
