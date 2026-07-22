from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps, ImageStat


ROOT = Path(__file__).resolve().parents[1]
DESIGN = ROOT / "design"
PAPER = (243, 238, 229)
INK = (23, 23, 21)
DIVIDER = (160, 151, 136)
AXIS_HORIZONTAL = (24, 122, 118)
AXIS_VERTICAL = (193, 67, 56)
FONT = ImageFont.load_default(size=18)


def parse_pair(value: str) -> tuple[int, int]:
    try:
        x, y = (int(component.strip()) for component in value.split(","))
    except ValueError as error:
        raise argparse.ArgumentTypeError("expected X,Y") from error
    return x, y


def parse_box(value: str) -> tuple[int, int, int, int]:
    try:
        left, top, right, bottom = (
            int(component.strip()) for component in value.split(",")
        )
    except ValueError as error:
        raise argparse.ArgumentTypeError("expected LEFT,TOP,RIGHT,BOTTOM") from error
    if left >= right or top >= bottom:
        raise argparse.ArgumentTypeError("crop must have positive width and height")
    return left, top, right, bottom


def load_rgb(path: Path) -> Image.Image:
    if not path.is_file():
        raise FileNotFoundError(f"missing QA input: {path}")
    return Image.open(path).convert("RGB")


def validate_inputs(
    images: dict[str, Image.Image], crop: tuple[int, int, int, int], axis: tuple[int, int]
) -> None:
    sizes = {image.size for image in images.values()}
    if len(sizes) != 1:
        dimensions = ", ".join(
            f"{name}={image.width}x{image.height}" for name, image in images.items()
        )
        raise ValueError(f"all browser captures must share one viewport: {dimensions}")

    width, height = next(iter(sizes))
    left, top, right, bottom = crop
    if left < 0 or top < 0 or right > width or bottom > height:
        raise ValueError(f"crop {crop} exceeds the {width}x{height} captures")

    axis_x, axis_y = axis
    if not (left <= axis_x < right and top <= axis_y < bottom):
        raise ValueError(f"axis {axis} must fall inside crop {crop}")


def crop_and_scale(
    image: Image.Image, crop: tuple[int, int, int, int], scale: int
) -> Image.Image:
    detail = image.crop(crop)
    if scale == 1:
        return detail
    return detail.resize(
        (detail.width * scale, detail.height * scale), Image.Resampling.NEAREST
    )


def labeled_strip(
    panels: list[tuple[str, Image.Image]], destination: Path, columns: int | None = None
) -> None:
    if not panels:
        raise ValueError("at least one panel is required")
    columns = columns or len(panels)
    rows = (len(panels) + columns - 1) // columns
    gap = 24
    label_height = 44
    panel_width = max(image.width for _, image in panels)
    panel_height = max(image.height for _, image in panels)
    canvas = Image.new(
        "RGB",
        (
            panel_width * columns + gap * (columns - 1),
            (label_height + panel_height) * rows + gap * (rows - 1),
        ),
        PAPER,
    )
    draw = ImageDraw.Draw(canvas)

    for index, (label, image) in enumerate(panels):
        row, column = divmod(index, columns)
        x = column * (panel_width + gap)
        y = row * (label_height + panel_height + gap)
        canvas.paste(image, (x, y + label_height))
        draw.text((x + 16, y + 13), label, fill=INK, font=FONT)
        if column:
            divider_x = x - gap // 2
            draw.line(
                (divider_x, y, divider_x, y + label_height + panel_height),
                fill=DIVIDER,
            )

    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination)


def amplified_difference(left: Image.Image, right: Image.Image) -> Image.Image:
    difference = ImageChops.difference(left, right)
    return ImageOps.autocontrast(difference).point(lambda value: min(255, value * 3))


def registration_overlay(left: Image.Image, right: Image.Image) -> Image.Image:
    left_red, _, _ = left.split()
    _, right_green, right_blue = right.split()
    return Image.merge("RGB", (left_red, right_green, right_blue))


def draw_axis(
    image: Image.Image,
    axis: tuple[int, int],
    crop: tuple[int, int, int, int],
    scale: int,
) -> Image.Image:
    overlay = image.copy()
    axis_x = (axis[0] - crop[0]) * scale
    axis_y = (axis[1] - crop[1]) * scale
    draw = ImageDraw.Draw(overlay)
    line_width = max(1, scale)
    radius = 7 * scale
    draw.line((0, axis_y, overlay.width, axis_y), fill=AXIS_HORIZONTAL, width=line_width)
    draw.line((axis_x, 0, axis_x, overlay.height), fill=AXIS_VERTICAL, width=line_width)
    draw.ellipse(
        (axis_x - radius, axis_y - radius, axis_x + radius, axis_y + radius),
        outline=AXIS_VERTICAL,
        width=line_width,
    )
    return overlay


def motion_metrics(left: Image.Image, right: Image.Image) -> tuple[float, float]:
    difference = ImageChops.difference(left, right).convert("L")
    mean_delta = ImageStat.Stat(difference).mean[0]
    changed = sum(value > 3 for value in difference.getdata()) / (
        difference.width * difference.height
    )
    return mean_delta, changed


def default_path(name: str) -> Path:
    return DESIGN / name


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Build the four browser-rendered INPUT motion QA sheets for Pass 22."
    )
    parser.add_argument(
        "--before", type=Path, default=default_path("qa-v12-input-before.png")
    )
    parser.add_argument(
        "--after", type=Path, default=default_path("qa-v12-input-after.png")
    )
    parser.add_argument(
        "--phase-0", type=Path, default=default_path("qa-v12-input-phase-0.png")
    )
    parser.add_argument(
        "--phase-90", type=Path, default=default_path("qa-v12-input-phase-90.png")
    )
    parser.add_argument(
        "--phase-180", type=Path, default=default_path("qa-v12-input-phase-180.png")
    )
    parser.add_argument(
        "--phase-270", type=Path, default=default_path("qa-v12-input-phase-270.png")
    )
    parser.add_argument(
        "--motion-a", type=Path, default=default_path("qa-v12-motion-a.png")
    )
    parser.add_argument(
        "--motion-b", type=Path, default=default_path("qa-v12-motion-b.png")
    )
    parser.add_argument(
        "--crop",
        type=parse_box,
        default=parse_box("600,150,785,490"),
        metavar="LEFT,TOP,RIGHT,BOTTOM",
        help="INPUT close-up in 1280x720 browser screenshot coordinates",
    )
    parser.add_argument(
        "--axis",
        type=parse_pair,
        default=parse_pair("642,348"),
        metavar="X,Y",
        help="measured INPUT shaft axis in browser screenshot coordinates",
    )
    parser.add_argument(
        "--detail-scale",
        type=int,
        choices=(1, 2, 3, 4),
        default=2,
        help="integer close-up scale; nearest-neighbor keeps rendered pixels inspectable",
    )
    parser.add_argument("--output-dir", type=Path, default=DESIGN)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    paths = {
        "before": args.before,
        "after": args.after,
        "phase-0": args.phase_0,
        "phase-90": args.phase_90,
        "phase-180": args.phase_180,
        "phase-270": args.phase_270,
        "motion-a": args.motion_a,
        "motion-b": args.motion_b,
    }
    images = {name: load_rgb(path) for name, path in paths.items()}
    validate_inputs(images, args.crop, args.axis)

    details = {
        name: crop_and_scale(image, args.crop, args.detail_scale)
        for name, image in images.items()
    }
    output_dir = args.output_dir.resolve()

    labeled_strip(
        [
            ("BEFORE - Phase 0 baseline", details["before"]),
            ("AFTER - Phase 1 INPUT sample", details["after"]),
        ],
        output_dir / "qa-v12-input-before-after.png",
    )

    axis_after = draw_axis(details["after"], args.axis, args.crop, args.detail_scale)
    registered = registration_overlay(details["motion-a"], details["motion-b"])
    axis_registered = draw_axis(registered, args.axis, args.crop, args.detail_scale)
    labeled_strip(
        [
            ("MEASURED SHAFT AXIS", axis_after),
            ("A/B REGISTRATION (RED/CYAN)", axis_registered),
        ],
        output_dir / "qa-v12-input-axis-overlay.png",
    )

    labeled_strip(
        [
            ("0°", details["phase-0"]),
            ("90°", details["phase-90"]),
            ("180°", details["phase-180"]),
            ("270°", details["phase-270"]),
        ],
        output_dir / "qa-v12-input-four-phases.png",
    )

    motion_a = images["motion-a"].crop(args.crop)
    motion_b = images["motion-b"].crop(args.crop)
    labeled_strip(
        [
            ("FRAME A", motion_a),
            ("FRAME B (+1 SECOND)", motion_b),
            ("AMPLIFIED DIFF", amplified_difference(motion_a, motion_b)),
        ],
        output_dir / "qa-v12-motion-contact-sheet.png",
    )

    mean_delta, changed = motion_metrics(motion_a, motion_b)
    print(f"capture_size={images['after'].width}x{images['after'].height}")
    print(f"input_crop={args.crop} axis={args.axis} detail_scale={args.detail_scale}x")
    print(f"motion: mean_delta={mean_delta:.3f}, changed={changed:.2%}")
    for name in (
        "qa-v12-input-before-after.png",
        "qa-v12-input-axis-overlay.png",
        "qa-v12-input-four-phases.png",
        "qa-v12-motion-contact-sheet.png",
    ):
        print(output_dir / name)


if __name__ == "__main__":
    main()
