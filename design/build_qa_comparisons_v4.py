from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DESIGN = ROOT / "design"
PAPER = (243, 238, 229)
INK = (23, 23, 21)
FONT = ImageFont.load_default(size=18)


for source_state, prototype_state in (
    ("collapsed", "compact"),
    ("expanded", "expanded"),
):
    source = Image.open(
        ROOT / "public" / "world-compiler" / f"motion-{source_state}.webp"
    ).convert("RGB")
    prototype = Image.open(
        DESIGN / f"prototype-v4-final-{prototype_state}.png"
    ).convert("RGB")

    reference_panel = Image.new("RGB", (710, 650), PAPER)
    reference_panel.paste(
        source.resize((710, 500), Image.Resampling.LANCZOS),
        (0, 75),
    )
    prototype_panel = prototype.crop((532, 35, 1242, 685))

    comparison = Image.new("RGB", (1440, 700), PAPER)
    comparison.paste(reference_panel, (0, 50))
    comparison.paste(prototype_panel, (730, 50))
    draw = ImageDraw.Draw(comparison)
    draw.text((20, 18), "REFERENCE — original base/support geometry", fill=INK, font=FONT)
    draw.text(
        (750, 18),
        "IMPLEMENTATION — base removed; persistent one-to-one parts",
        fill=INK,
        font=FONT,
    )
    draw.line((720, 0, 720, 700), fill=(160, 151, 136), width=1)
    comparison.save(DESIGN / f"qa-v4-{prototype_state}-comparison.png")
