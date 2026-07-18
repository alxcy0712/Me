from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
LAYER_DIR = ROOT / "public" / "world-compiler" / "layers"
PANEL_NAMES = ("input", "rules", "state", "output")
PANEL_BOTTOM = 411
MIN_VISIBLE_ALPHA = 32
PAPER_KEY_LAYERS = {"rules", "state"}
OUTPUT_LEG_BANDS = ((722, 730), (835, 849))
OUTPUT_LEG_START = 372
COLLAPSED_BASE_TOP = 445
CASING_X_RANGE = (252, 669)


def is_paper_background(red, green, blue):
    return red > 205 and green > 195 and blue > 175


for name in PANEL_NAMES:
    source = Image.open(LAYER_DIR / f"canvas-{name}.webp").convert("RGBA")
    visible_panel = source.crop((0, 0, source.width, PANEL_BOTTOM))
    cleaned_pixels = []
    for index, (red, green, blue, alpha) in enumerate(visible_panel.getdata()):
        x = index % visible_panel.width
        y = index // visible_panel.width
        low_alpha = alpha < MIN_VISIBLE_ALPHA
        paper_background = name in PAPER_KEY_LAYERS and is_paper_background(
            red, green, blue
        )
        output_bottom_artifact = (
            name == "output"
            and y >= OUTPUT_LEG_START
            and not any(start <= x < end for start, end in OUTPUT_LEG_BANDS)
        )
        cleaned_pixels.append(
            (
                red,
                green,
                blue,
                0
                if low_alpha or paper_background or output_bottom_artifact
                else alpha,
            )
        )
    visible_panel.putdata(cleaned_pixels)
    panel = Image.new("RGBA", source.size, (0, 0, 0, 0))
    panel.paste(visible_panel, (0, 0))
    panel.save(
        LAYER_DIR / f"canvas-{name}-panel-v3.webp",
        "WEBP",
        lossless=True,
        method=6,
    )


collapsed_base = Image.open(
    LAYER_DIR / "canvas-base-collapsed.webp"
).convert("RGBA")
collapsed_pixels = []
for index, (red, green, blue, alpha) in enumerate(collapsed_base.getdata()):
    x = index % collapsed_base.width
    y = index // collapsed_base.width
    collapsed_pixels.append(
        (
            red,
            green,
            blue,
            0
            if y < COLLAPSED_BASE_TOP
            and CASING_X_RANGE[0] <= x < CASING_X_RANGE[1]
            else alpha,
        )
    )
collapsed_base.putdata(collapsed_pixels)
collapsed_base.save(
    LAYER_DIR / "canvas-base-collapsed-v3.webp",
    "WEBP",
    lossless=True,
    method=6,
)
