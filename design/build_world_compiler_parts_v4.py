from pathlib import Path
import shutil

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public" / "world-compiler" / "layers"
OUTPUT_DIR = ROOT / "public" / "world-compiler" / "parts-v4"
SOURCE_ASSET_DIR = ROOT / "design" / "world-compiler-parts-v4-sources"
CANVAS_SIZE = (936, 660)
MIN_ALPHA = 32

def cleaned_alpha(alpha):
    return alpha if alpha >= MIN_ALPHA else 0


def save_part(image, mask, output_name):
    pixels = []
    for index, (red, green, blue, alpha) in enumerate(image.getdata()):
        x = index % image.width
        y = index // image.width
        pixels.append(
            (red, green, blue, cleaned_alpha(alpha) if mask(x, y) else 0)
        )

    part = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    part.putdata(pixels)
    part.save(OUTPUT_DIR / output_name, "WEBP", lossless=True, method=6)


OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

for obsolete_name in (
    "input-core.webp",
    "rules-core.webp",
    "state-core.webp",
    "output-core.webp",
    "output-core-alpha.png",
    "output-core-chroma.png",
):
    (OUTPUT_DIR / obsolete_name).unlink(missing_ok=True)

for source_name in (
    "casing-left.webp",
    "casing-right.webp",
    "rules-core-clean.webp",
    "state-core-clean.webp",
    "output-core-clean.webp",
):
    shutil.copy2(SOURCE_ASSET_DIR / source_name, OUTPUT_DIR / source_name)

for source_name, output_name in (
    ("input-rotor-clean.webp", "input-rotor.webp"),
    ("input-guide-clean.webp", "input-guide.webp"),
    ("input-frame-closed.webp", "input-frame.webp"),
    ("rules-frame-closed.webp", "rules-frame.webp"),
    ("rules-core-front.webp", "rules-core-front.webp"),
    ("rules-gear-outer.webp", "rules-gear-outer.webp"),
    ("rules-gear-inner.webp", "rules-gear-inner.webp"),
    ("rules-gear-outer-mask.webp", "rules-gear-outer-mask.webp"),
    ("rules-gear-inner-mask.webp", "rules-gear-inner-mask.webp"),
    ("state-frame-closed.webp", "state-frame.webp"),
    ("output-frame-closed.webp", "output-frame.webp"),
):
    shutil.copy2(SOURCE_ASSET_DIR / source_name, OUTPUT_DIR / output_name)

# The clean mechanism cores already own every visible shaft section. Fill only
# the ten-pixel RULES→STATE gap by interpolating their matching edge texture.
rules_core = np.array(
    Image.open(OUTPUT_DIR / "rules-core-clean.webp").convert("RGBA")
)
state_core = np.array(
    Image.open(OUTPUT_DIR / "state-core-clean.webp").convert("RGBA")
)
shaft_pixels = np.zeros_like(rules_core)

input_source = np.array(
    Image.open(SOURCE_DIR / "canvas-input.webp").convert("RGBA")
)
left_shaft = input_source[260:268, 141:175].copy()
left_shaft_paper = (
    (left_shaft[:, :, 0] > 205)
    & (left_shaft[:, :, 1] > 195)
    & (left_shaft[:, :, 2] > 175)
)
left_shaft[:, :, 3] = np.where(
    left_shaft_paper,
    0,
    left_shaft[:, :, 3],
)
shaft_pixels[260:268, 141:175] = left_shaft

left_edge = rules_core[:, 493].astype(float)
right_edge = state_core[:, 507].astype(float)
for x in range(497, 507):
    progress = (x - 496) / 11
    shaft_pixels[:, x] = (
        left_edge * (1 - progress) + right_edge * progress
    ).astype(np.uint8)
shaft_pixels[:, :, 3] = np.where(
    shaft_pixels[:, :, 3] >= MIN_ALPHA,
    shaft_pixels[:, :, 3],
    0,
)
Image.fromarray(shaft_pixels, "RGBA").save(
    OUTPUT_DIR / "shaft.webp",
    "WEBP",
    lossless=True,
    method=6,
)

rock = Image.open(SOURCE_DIR / "canvas-rock.webp").convert("RGBA")
save_part(rock, lambda _x, _y: True, "rock.webp")


# The compact enclosure needs a real smoked-glass back plane so the expanded
# parts remain present at frame zero and are revealed by the opening shell.
# ImageGen supplied a clean empty pane; crop away its generated surround and
# fit only the glass surface behind the source enclosure's inner bezel.
backplate_source = Image.open(
    ROOT / "design" / "world-compiler-backplate-key.png"
).convert("RGB")
backplate_glass = backplate_source.crop((456, 335, 1021, 725)).resize(
    (297, 205), Image.Resampling.LANCZOS
)
backplate_mask = Image.new("L", backplate_glass.size, 0)
ImageDraw.Draw(backplate_mask).rounded_rectangle(
    (0, 0, backplate_glass.width - 1, backplate_glass.height - 1),
    radius=14,
    fill=255,
)
backplate = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
backplate.paste(backplate_glass, (329, 226), backplate_mask)

for name, horizontal_range in {
    "backplate-left": (0, 460),
    "backplate-right": (460, CANVAS_SIZE[0]),
}.items():
    left, right = horizontal_range
    half = np.array(backplate)
    half[:, :left, 3] = 0
    half[:, right:, 3] = 0
    Image.fromarray(half, "RGBA").save(
        OUTPUT_DIR / f"{name}.webp",
        "WEBP",
        lossless=True,
        method=6,
    )


# A three-pixel overlap prevents a hairline seam when the two enclosure halves
# land on fractional CSS pixels at responsive widths.
for name, source_slice, target_slice in (
    ("backplate-left", slice(457, 460), slice(460, 463)),
    ("backplate-right", slice(460, 463), slice(457, 460)),
):
    path = OUTPUT_DIR / f"{name}.webp"
    if not path.exists():
        continue
    pixels = np.array(Image.open(path).convert("RGBA"))
    pixels[:, target_slice] = pixels[:, source_slice]
    Image.fromarray(pixels, "RGBA").save(
        path,
        "WEBP",
        lossless=True,
        method=6,
    )
