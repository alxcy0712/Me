from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps, ImageStat


ROOT = Path(__file__).resolve().parents[1]
DESIGN = ROOT / "design"
PAPER = (243, 238, 229)
INK = (23, 23, 21)
DIVIDER = (160, 151, 136)
FONT = ImageFont.load_default(size=18)


def labeled_comparison(
    left: Image.Image,
    right: Image.Image,
    left_label: str,
    right_label: str,
    destination: Path,
) -> None:
    gap = 24
    label_height = 44
    canvas = Image.new(
        "RGB",
        (left.width + gap + right.width, label_height + max(left.height, right.height)),
        PAPER,
    )
    canvas.paste(left, (0, label_height))
    canvas.paste(right, (left.width + gap, label_height))
    draw = ImageDraw.Draw(canvas)
    draw.text((16, 13), left_label, fill=INK, font=FONT)
    draw.text((left.width + gap + 16, 13), right_label, fill=INK, font=FONT)
    draw.line((left.width + gap // 2, 0, left.width + gap // 2, canvas.height), fill=DIVIDER)
    canvas.save(destination)


reference = Image.open(DESIGN / "world-compiler-expanded.png").convert("RGB")
reference = reference.resize((1080, 720), Image.Resampling.LANCZOS)
current_a = Image.open(DESIGN / "qa-v11-motion-expanded.png").convert("RGB")
current_b = Image.open(DESIGN / "qa-v11-motion-expanded-b.png").convert("RGB")
baseline = Image.open(
    DESIGN / "audit-v9-bottom-occlusion" / "07-fixed-expanded.jpg"
).convert("RGB")

labeled_comparison(
    reference,
    current_a,
    "SOURCE - selected World Compiler direction",
    "IMPLEMENTATION - expanded state with internal cycles",
    DESIGN / "qa-v11-motion-reference-comparison.png",
)
labeled_comparison(
    baseline,
    current_a,
    "ACCEPTED BASELINE - expanded composition",
    "CURRENT - same composition, moving internals",
    DESIGN / "qa-v11-motion-baseline-comparison.png",
)

machine_crop = (495, 90, 1245, 600)
frame_a = current_a.crop(machine_crop)
frame_b = current_b.crop(machine_crop)
raw_diff = ImageChops.difference(frame_a, frame_b)
motion_diff = ImageOps.autocontrast(raw_diff).point(lambda value: min(255, value * 3))

contact = Image.new("RGB", (frame_a.width * 3 + 48, frame_a.height + 44), PAPER)
contact.paste(frame_a, (0, 44))
contact.paste(frame_b, (frame_a.width + 24, 44))
contact.paste(motion_diff, (frame_a.width * 2 + 48, 44))
draw = ImageDraw.Draw(contact)
draw.text((16, 13), "FRAME A", fill=INK, font=FONT)
draw.text((frame_a.width + 40, 13), "FRAME B - 1 second later", fill=INK, font=FONT)
draw.text((frame_a.width * 2 + 64, 13), "AMPLIFIED MOTION DIFFERENCE", fill=INK, font=FONT)
contact.save(DESIGN / "qa-v11-motion-contact-sheet.png")

for name, box in {
    "input": (600, 150, 785, 490),
    "rules": (775, 150, 920, 490),
    "state": (910, 150, 1075, 490),
    "output": (1060, 135, 1245, 500),
}.items():
    diff = ImageChops.difference(current_a.crop(box), current_b.crop(box)).convert("L")
    mean_delta = ImageStat.Stat(diff).mean[0]
    changed = sum(value > 3 for value in diff.getdata()) / (diff.width * diff.height)
    print(f"{name}: mean_delta={mean_delta:.3f}, changed={changed:.2%}")
