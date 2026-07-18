from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DESIGN = ROOT / "design"
PAPER = (243, 238, 229)


for state in ("collapsed", "expanded"):
    reference = Image.open(DESIGN / f"world-compiler-{state}.png").convert("RGB")
    prototype = Image.open(DESIGN / f"prototype-final-{state}.png").convert("RGB")

    reference_page = reference.resize((1080, 720), Image.Resampling.LANCZOS)
    page_comparison = Image.new("RGB", (2380, 720), PAPER)
    page_comparison.paste(reference_page, (0, 0))
    page_comparison.paste(prototype, (1100, 0))
    page_comparison.save(DESIGN / f"qa-layered-comparison-{state}.png")

    machine_source = Image.open(
        ROOT / "public" / "world-compiler" / f"motion-{state}.webp"
    ).convert("RGB")
    reference_machine = Image.new("RGB", (710, 650), PAPER)
    reference_machine.paste(
        machine_source.resize((710, 500), Image.Resampling.LANCZOS),
        (0, 75),
    )
    prototype_machine = prototype.crop((532, 35, 1242, 685))

    machine_comparison = Image.new("RGB", (1440, 650), PAPER)
    machine_comparison.paste(reference_machine, (0, 0))
    machine_comparison.paste(prototype_machine, (730, 0))
    machine_comparison.save(DESIGN / f"qa-layered-machine-{state}.png")
