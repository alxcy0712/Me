from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
V4_SOURCE_DIR = ROOT / "design" / "world-compiler-parts-v4-sources"
MASTER_DIR = ROOT / "design" / "world-compiler-parts-v5-sources"
OUTPUT_DIR = ROOT / "public" / "world-compiler" / "parts-v5"
V4_OUTPUT_DIR = ROOT / "public" / "world-compiler" / "parts-v4"
LAYER_DIR = ROOT / "public" / "world-compiler" / "layers"

CANVAS_SIZE = (936, 660)
MASTER_SCALE = 4
EXPORT_SCALE = 3
MIN_ALPHA = 4

INPUT_AXIS = (201, 263)
INPUT_COMPONENT_CROP = (168, 204, 283, 316)
INPUT_FACE_CROP = (168, 204, 252, 316)
INPUT_MARKER_SEARCH = (203, 238, 219, 252)
INPUT_MARKER_RGB = (96, 70, 36)


@dataclass(frozen=True)
class AssetSpec:
    master_name: str
    runtime_name: str
    crop: tuple[int, int, int, int]
    sharpen: bool = True

    @property
    def logical_size(self) -> tuple[int, int]:
        left, top, right, bottom = self.crop
        return right - left, bottom - top


ASSET_SPECS = {
    "static_back": AssetSpec(
        "input-static-back-4x.png",
        "input-static-back-3x.webp",
        INPUT_COMPONENT_CROP,
    ),
    "detail": AssetSpec(
        "input-face-detail-4x.png",
        "input-face-detail-3x.webp",
        INPUT_FACE_CROP,
    ),
    "static_front": AssetSpec(
        "input-static-front-4x.png",
        "input-static-front-3x.webp",
        INPUT_COMPONENT_CROP,
    ),
    "face_mask": AssetSpec(
        "input-face-mask-4x.png",
        "input-face-mask-3x.webp",
        INPUT_FACE_CROP,
        sharpen=False,
    ),
    "frame": AssetSpec(
        "input-frame-4x.png",
        "input-frame-3x.webp",
        (155, 25, 331, 418),
    ),
    "guide": AssetSpec(
        "input-guide-4x.png",
        "input-guide-3x.webp",
        (269, 176, 312, 336),
    ),
    "shaft": AssetSpec(
        "shaft-4x.png",
        "shaft-3x.webp",
        (134, 241, 514, 276),
    ),
}


def clean_rgba(image: Image.Image, min_alpha: int = MIN_ALPHA) -> Image.Image:
    pixels = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    pixels[pixels[:, :, 3] < min_alpha] = 0
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA")


def premultiplied_resize(
    image: Image.Image,
    size: tuple[int, int],
) -> Image.Image:
    """Lanczos-resize RGBA without leaking hidden RGB through alpha edges."""

    source = np.asarray(image.convert("RGBA"), dtype=np.float32) / 255.0
    alpha = source[:, :, 3]
    premultiplied = source[:, :, :3] * alpha[:, :, None]

    resized_alpha = np.asarray(
        Image.fromarray(alpha, "F").resize(size, Image.Resampling.LANCZOS),
        dtype=np.float32,
    )
    resized_premultiplied = np.stack(
        [
            np.asarray(
                Image.fromarray(premultiplied[:, :, channel], "F").resize(
                    size,
                    Image.Resampling.LANCZOS,
                ),
                dtype=np.float32,
            )
            for channel in range(3)
        ],
        axis=2,
    )

    resized_alpha = np.clip(resized_alpha, 0.0, 1.0)
    straight_rgb = np.zeros_like(resized_premultiplied)
    visible = resized_alpha > 1e-6
    straight_rgb[visible] = (
        resized_premultiplied[visible] / resized_alpha[visible, None]
    )

    result = np.zeros((size[1], size[0], 4), dtype=np.uint8)
    result[:, :, :3] = np.rint(np.clip(straight_rgb, 0.0, 1.0) * 255).astype(
        np.uint8
    )
    result[:, :, 3] = np.rint(resized_alpha * 255).astype(np.uint8)
    result[result[:, :, 3] == 0, :3] = 0
    return Image.fromarray(result, "RGBA")


def lightly_sharpen_visible_rgb(image: Image.Image) -> Image.Image:
    source = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    sharpened_rgb = np.asarray(
        image.convert("RGB").filter(
            ImageFilter.UnsharpMask(radius=0.7, percent=110, threshold=2)
        ),
        dtype=np.uint8,
    )
    result = source.copy()
    # Very low-alpha edge colors stay untouched; sharpening there amplifies
    # chroma fringes even though their coverage is tiny.
    solid = source[:, :, 3] >= 32
    result[solid, :3] = sharpened_rgb[solid]
    result[result[:, :, 3] == 0, :3] = 0
    return Image.fromarray(result, "RGBA")


def premultiplied_gaussian_rgb(image: Image.Image, radius: float) -> np.ndarray:
    """Blur visible color while excluding transparent RGB from the kernel."""

    source = np.asarray(image.convert("RGBA"), dtype=np.float32)
    alpha = source[:, :, 3:4] / 255.0
    premultiplied = np.rint(source[:, :, :3] * alpha).astype(np.uint8)
    blurred_premultiplied = np.asarray(
        Image.fromarray(premultiplied, "RGB").filter(
            ImageFilter.GaussianBlur(radius=radius)
        ),
        dtype=np.float32,
    )
    blurred_alpha = np.asarray(
        Image.fromarray(np.rint(alpha[:, :, 0] * 255).astype(np.uint8), "L").filter(
            ImageFilter.GaussianBlur(radius=radius)
        ),
        dtype=np.float32,
    ) / 255.0
    result = np.zeros_like(blurred_premultiplied)
    visible = blurred_alpha > 1e-6
    result[visible] = (
        blurred_premultiplied[visible] / blurred_alpha[visible, None]
    )
    return np.clip(result, 0.0, 255.0)


def scaled_crop(source: Image.Image, crop: tuple[int, int, int, int]) -> Image.Image:
    width = (crop[2] - crop[0]) * MASTER_SCALE
    height = (crop[3] - crop[1]) * MASTER_SCALE
    return clean_rgba(premultiplied_resize(source.crop(crop), (width, height)))


def approved_input_component() -> tuple[
    Image.Image,
    np.ndarray,
    np.ndarray,
    Image.Image,
]:
    """Restore the source's keyed-out positioning mark in the 4x mother."""

    source = Image.open(V4_SOURCE_DIR / "input-rotor-clean.webp").convert("RGBA")
    component = scaled_crop(source, INPUT_COMPONENT_CROP)
    source_pixels = np.asarray(source, dtype=np.uint8)
    marker_left, marker_top, marker_right, marker_bottom = INPUT_MARKER_SEARCH
    marker_1x = np.zeros((CANVAS_SIZE[1], CANVAS_SIZE[0]), dtype=np.uint8)
    marker_region = (
        source_pixels[marker_top:marker_bottom, marker_left:marker_right, 3]
        < MIN_ALPHA
    )
    assert 50 <= int(np.count_nonzero(marker_region)) <= 90, (
        "unexpected INPUT positioning-mark key shape"
    )
    marker_1x[
        marker_top:marker_bottom,
        marker_left:marker_right,
    ] = marker_region.astype(np.uint8) * 255
    keyed_crop_1x = Image.fromarray(
        marker_1x[
            INPUT_COMPONENT_CROP[1] : INPUT_COMPONENT_CROP[3],
            INPUT_COMPONENT_CROP[0] : INPUT_COMPONENT_CROP[2],
        ],
        "L",
    )
    inpaint_crop_1x = keyed_crop_1x.filter(ImageFilter.MaxFilter(size=7))
    inpaint_alpha = np.asarray(
        inpaint_crop_1x.resize(component.size, Image.Resampling.LANCZOS),
        dtype=np.uint8,
    ).copy()
    inpaint_alpha[inpaint_alpha < MIN_ALPHA] = 0

    keyed_alpha = np.asarray(
        keyed_crop_1x.resize(component.size, Image.Resampling.LANCZOS),
        dtype=np.uint8,
    ).copy()
    keyed_alpha[keyed_alpha < MIN_ALPHA] = 0
    component_pixels = np.asarray(component, dtype=np.uint8).copy()
    marker_base_rgb = premultiplied_gaussian_rgb(
        component,
        radius=3.2 * MASTER_SCALE,
    )
    inpaint_weight = inpaint_alpha.astype(np.float32) / 255.0
    component_pixels[:, :, :3] = np.rint(
        component_pixels[:, :, :3].astype(np.float32)
        * (1.0 - inpaint_weight[:, :, None])
        + marker_base_rgb * inpaint_weight[:, :, None]
    ).astype(np.uint8)
    component_pixels[:, :, 3] = np.rint(
        component_pixels[:, :, 3].astype(np.float32) * (1.0 - inpaint_weight)
        + 255.0 * inpaint_weight
    ).astype(np.uint8)

    marker_mask = Image.new("L", component.size, 0)
    marker_draw = ImageDraw.Draw(marker_mask)
    marker_radius = 20.5
    marker_bounds = (
        (INPUT_AXIS[0] - marker_radius - INPUT_COMPONENT_CROP[0]) * MASTER_SCALE,
        (INPUT_AXIS[1] - marker_radius - INPUT_COMPONENT_CROP[1]) * MASTER_SCALE,
        (INPUT_AXIS[0] + marker_radius - INPUT_COMPONENT_CROP[0]) * MASTER_SCALE,
        (INPUT_AXIS[1] + marker_radius - INPUT_COMPONENT_CROP[1]) * MASTER_SCALE,
    )
    marker_draw.arc(
        marker_bounds,
        start=285,
        end=310,
        fill=255,
        width=round(1.25 * MASTER_SCALE),
    )
    marker_alpha = np.asarray(
        marker_mask.filter(ImageFilter.GaussianBlur(radius=0.55)),
        dtype=np.uint8,
    ).copy()
    marker_alpha[marker_alpha < MIN_ALPHA] = 0
    aperture = face_aperture_alpha(INPUT_FACE_CROP, MASTER_SCALE)
    aperture_component = np.zeros_like(marker_alpha)
    aperture_component[:, : aperture.shape[1]] = np.rint(aperture * 255).astype(
        np.uint8
    )
    marker_alpha[aperture_component < 250] = 0
    marker_x, marker_y = global_coordinates(INPUT_COMPONENT_CROP, MASTER_SCALE)
    fixed_geometry = ellipse(marker_x, marker_y, INPUT_AXIS, (10.5, 20.0))
    fixed_geometry |= np.abs(marker_y - INPUT_AXIS[1]) <= 6.5
    marker_alpha[fixed_geometry] = 0
    component_pixels[marker_alpha >= MIN_ALPHA, 3] = 255

    marker = np.zeros((component.height, component.width, 4), dtype=np.uint8)
    marker[:, :, :3] = INPUT_MARKER_RGB
    marker[:, :, 3] = marker_alpha
    approved = source_over(
        component_pixels,
        marker,
    )
    return (
        clean_rgba(Image.fromarray(approved, "RGBA")),
        marker_alpha,
        inpaint_alpha,
        clean_rgba(Image.fromarray(component_pixels, "RGBA")),
    )


def global_coordinates(
    crop: tuple[int, int, int, int],
    scale: int,
) -> tuple[np.ndarray, np.ndarray]:
    left, top, right, bottom = crop
    xs = left + (np.arange((right - left) * scale) + 0.5) / scale
    ys = top + (np.arange((bottom - top) * scale) + 0.5) / scale
    return np.meshgrid(xs, ys)


def ellipse(
    x: np.ndarray,
    y: np.ndarray,
    center: tuple[float, float],
    radii: tuple[float, float],
) -> np.ndarray:
    return ((x - center[0]) / radii[0]) ** 2 + (
        (y - center[1]) / radii[1]
    ) ** 2 <= 1.0


def face_aperture_alpha(
    crop: tuple[int, int, int, int],
    scale: int,
) -> np.ndarray:
    x, y = global_coordinates(crop, scale)
    axis_x, axis_y = INPUT_AXIS

    outer_q = np.sqrt(((x - axis_x) / 24.0) ** 2 + ((y - axis_y) / 46.0) ** 2)
    hub_q = np.sqrt(((x - axis_x) / 9.5) ** 2 + ((y - axis_y) / 18.5) ** 2)

    # Signed distances are expressed in physical pixels. A three-pixel ramp
    # becomes roughly a two-pixel feather after the 4x -> 3x export.
    outer_distance = (1.0 - outer_q) * 24.0 * scale
    hub_distance = (hub_q - 1.0) * 9.5 * scale
    shaft_distance = (np.abs(y - axis_y) - 5.5) * scale
    signed_distance = np.minimum.reduce(
        [outer_distance, hub_distance, shaft_distance]
    )
    return np.clip((signed_distance + 1.5) / 3.0, 0.0, 1.0)


def source_over(background: np.ndarray, foreground: np.ndarray) -> np.ndarray:
    """Composite uint8 straight-alpha arrays and return uint8 RGBA."""

    back = background.astype(np.float32) / 255.0
    front = foreground.astype(np.float32) / 255.0
    back_alpha = back[:, :, 3:4]
    front_alpha = front[:, :, 3:4]
    out_alpha = front_alpha + back_alpha * (1.0 - front_alpha)
    out_premultiplied = (
        front[:, :, :3] * front_alpha
        + back[:, :, :3] * back_alpha * (1.0 - front_alpha)
    )
    out_rgb = np.zeros_like(out_premultiplied)
    visible = out_alpha[:, :, 0] > 1e-6
    out_rgb[visible] = out_premultiplied[visible] / out_alpha[visible]

    result = np.concatenate((out_rgb, out_alpha), axis=2)
    result = np.rint(np.clip(result, 0.0, 1.0) * 255).astype(np.uint8)
    result[result[:, :, 3] == 0, :3] = 0
    return result


def decompose_input() -> dict[str, Image.Image]:
    source_image, marker_alpha, _inpaint_alpha, marker_base_image = (
        approved_input_component()
    )
    source = np.asarray(source_image, dtype=np.uint8)
    marker_base = np.asarray(marker_base_image, dtype=np.uint8)
    source_rgb = source[:, :, :3].astype(np.float32)
    source_alpha = source[:, :, 3]

    x, y = global_coordinates(INPUT_COMPONENT_CROP, MASTER_SCALE)
    axis_x, axis_y = INPUT_AXIS

    outer_rim = ellipse(x, y, INPUT_AXIS, (27.5, 50.5)) & ~ellipse(
        x,
        y,
        INPUT_AXIS,
        (23.5, 46.0),
    )
    hub = ellipse(x, y, INPUT_AXIS, (10.5, 20.0))
    horizontal_shaft = np.abs(y - axis_y) <= 6.5
    right_shaft_and_bearing = x >= 228.0
    front_owner = (
        outer_rim | hub | horizontal_shaft | right_shaft_and_bearing
    ) & (source_alpha >= MIN_ALPHA)

    # Preserve low-frequency illumination and brass shading in the fixed base.
    # The rotating overlay owns only high-frequency, asymmetric face evidence.
    blurred_rgb = premultiplied_gaussian_rgb(
        source_image,
        radius=3.2 * MASTER_SCALE,
    )
    luminance_weights = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    safe_face = ellipse(x, y, INPUT_AXIS, (20.5, 40.5))
    safe_face &= ~ellipse(x, y, INPUT_AXIS, (11.5, 22.0))
    safe_face &= np.abs(y - axis_y) >= 7.0
    source_luminance = source_rgb @ luminance_weights
    blurred_luminance = blurred_rgb @ luminance_weights
    face_q = np.sqrt(
        ((x - axis_x) / 24.0) ** 2 + ((y - axis_y) / 46.0) ** 2
    )
    dark_microtexture = (blurred_luminance - source_luminance) >= 18.0
    microtexture_owner = (
        safe_face
        & (source_alpha == 255)
        & dark_microtexture
        & (face_q >= 0.45)
        & (face_q <= 0.70)
    )
    marker_owner = marker_alpha >= MIN_ALPHA
    detail_owner = microtexture_owner | marker_owner
    assert np.any(detail_owner), "INPUT detail extraction produced an empty layer"
    assert not np.any(detail_owner & front_owner), (
        "moving detail intersects the fixed shaft/hub/rim ownership"
    )

    static_back = source.copy()
    static_front = np.zeros_like(source)
    static_front[front_owner] = source[front_owner]
    static_back[front_owner] = 0

    # Build the smallest-alpha overlay that reconstructs the approved pixel
    # over the blurred fixed base. At neutral phase the composite is exact;
    # away from neutral only the photographic microtexture and marker travel.
    base_rgb = np.rint(np.clip(blurred_rgb, 0.0, 255.0))
    delta = source_rgb - base_rgb
    positive_limit = np.divide(
        np.maximum(delta, 0.0),
        np.maximum(255.0 - base_rgb, 1e-6),
    )
    negative_limit = np.divide(
        np.maximum(-delta, 0.0),
        np.maximum(base_rgb, 1e-6),
    )
    overlay_alpha = np.max(
        np.maximum(positive_limit, negative_limit),
        axis=2,
    )
    overlay_alpha = np.clip(np.maximum(overlay_alpha + 0.015, 0.22), 0.0, 1.0)
    overlay_alpha[~detail_owner] = 0.0

    overlay_alpha_u8 = np.rint(overlay_alpha * 255.0).astype(np.uint8)
    quantized_alpha = overlay_alpha_u8.astype(np.float32) / 255.0
    overlay_rgb = np.zeros_like(source_rgb)
    overlay_rgb[detail_owner] = np.clip(
        base_rgb[detail_owner]
        + delta[detail_owner] / quantized_alpha[detail_owner, None],
        0.0,
        255.0,
    )

    static_back[detail_owner, :3] = np.rint(base_rgb[detail_owner]).astype(
        np.uint8
    )
    static_back[detail_owner, 3] = 255

    detail_component = np.zeros_like(source)
    detail_component[detail_owner, :3] = np.rint(
        overlay_rgb[detail_owner]
    ).astype(np.uint8)
    detail_component[detail_owner, 3] = overlay_alpha_u8[detail_owner]
    static_back[marker_owner] = marker_base[marker_owner]
    detail_component[marker_owner, :3] = INPUT_MARKER_RGB
    detail_component[marker_owner, 3] = marker_alpha[marker_owner]

    face_width = (INPUT_FACE_CROP[2] - INPUT_FACE_CROP[0]) * MASTER_SCALE
    face_height = (INPUT_FACE_CROP[3] - INPUT_FACE_CROP[1]) * MASTER_SCALE
    detail = detail_component[:face_height, :face_width]

    mask_alpha = face_aperture_alpha(INPUT_FACE_CROP, MASTER_SCALE)
    face_mask = np.zeros((face_height, face_width, 4), dtype=np.uint8)
    face_mask[:, :, :3] = 255
    face_mask[:, :, 3] = np.rint(mask_alpha * 255).astype(np.uint8)
    face_mask[face_mask[:, :, 3] == 0, :3] = 0

    assert not np.any(
        (detail[:, :, 3] >= MIN_ALPHA) & (face_mask[:, :, 3] < 250)
    ), "moving detail reaches the feathered/outside mask region"

    neutral = source_over(static_back, detail_component)
    neutral = source_over(neutral, static_front)
    difference = np.abs(neutral.astype(np.int16) - source.astype(np.int16))
    max_index = np.unravel_index(int(np.argmax(difference)), difference.shape)
    assert int(difference.max()) <= 2, (
        f"neutral INPUT reconstruction max error is {difference.max()} "
        f"at {max_index}; source={source[max_index[:2]]}, "
        f"neutral={neutral[max_index[:2]]}"
    )

    return {
        "static_back": clean_rgba(Image.fromarray(static_back, "RGBA")),
        "detail": clean_rgba(Image.fromarray(detail, "RGBA")),
        "static_front": clean_rgba(Image.fromarray(static_front, "RGBA")),
        "face_mask": clean_rgba(Image.fromarray(face_mask, "RGBA")),
    }


def build_shaft_source() -> Image.Image:
    rules_core = np.asarray(
        Image.open(V4_OUTPUT_DIR / "rules-core-clean.webp").convert("RGBA"),
        dtype=np.uint8,
    )
    state_core = np.asarray(
        Image.open(V4_OUTPUT_DIR / "state-core-clean.webp").convert("RGBA"),
        dtype=np.uint8,
    )
    shaft = np.zeros((CANVAS_SIZE[1], CANVAS_SIZE[0], 4), dtype=np.uint8)

    input_source = np.asarray(
        Image.open(LAYER_DIR / "canvas-input.webp").convert("RGBA"),
        dtype=np.uint8,
    )
    left_shaft = input_source[260:268, 141:175].copy()
    paper = (
        (left_shaft[:, :, 0] > 205)
        & (left_shaft[:, :, 1] > 195)
        & (left_shaft[:, :, 2] > 175)
    )
    left_shaft[paper] = 0
    shaft[260:268, 141:175] = left_shaft

    left_edge = rules_core[:, 493].astype(np.float32)
    right_edge = state_core[:, 507].astype(np.float32)
    for column in range(497, 507):
        progress = (column - 496) / 11.0
        shaft[:, column] = np.rint(
            left_edge * (1.0 - progress) + right_edge * progress
        ).astype(np.uint8)

    shaft[shaft[:, :, 3] < MIN_ALPHA] = 0
    shaft[shaft[:, :, 3] == 0, :3] = 0
    return Image.fromarray(shaft, "RGBA")


def write_master(spec: AssetSpec, image: Image.Image) -> None:
    expected_size = tuple(dimension * MASTER_SCALE for dimension in spec.logical_size)
    assert image.size == expected_size, (
        f"{spec.master_name}: expected {expected_size}, got {image.size}"
    )
    cleaned = clean_rgba(image)
    cleaned.save(MASTER_DIR / spec.master_name, "PNG", optimize=True)


def export_runtime(spec: AssetSpec) -> tuple[int, int]:
    master = Image.open(MASTER_DIR / spec.master_name).convert("RGBA")
    runtime_size = tuple(dimension * EXPORT_SCALE for dimension in spec.logical_size)
    runtime = premultiplied_resize(master, runtime_size)
    if spec.sharpen:
        runtime = lightly_sharpen_visible_rgb(runtime)
    runtime = clean_rgba(runtime)
    runtime.save(
        OUTPUT_DIR / spec.runtime_name,
        "WEBP",
        lossless=True,
        method=6,
        exact=True,
    )

    decoded = Image.open(OUTPUT_DIR / spec.runtime_name).convert("RGBA")
    assert decoded.size == runtime_size
    assert np.array_equal(np.asarray(decoded), np.asarray(runtime)), (
        f"{spec.runtime_name}: lossless round-trip changed RGBA pixels"
    )
    return runtime_size


def main() -> None:
    MASTER_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    input_layers = decompose_input()
    for key, image in input_layers.items():
        write_master(ASSET_SPECS[key], image)

    support_sources = {
        "frame": Image.open(
            V4_SOURCE_DIR / "input-frame-closed.webp"
        ).convert("RGBA"),
        "guide": Image.open(
            V4_SOURCE_DIR / "input-guide-clean.webp"
        ).convert("RGBA"),
        "shaft": build_shaft_source(),
    }
    for key, source in support_sources.items():
        spec = ASSET_SPECS[key]
        write_master(spec, scaled_crop(source, spec.crop))

    print("World Compiler v5 INPUT assets")
    for key, spec in ASSET_SPECS.items():
        runtime_size = export_runtime(spec)
        master_path = MASTER_DIR / spec.master_name
        runtime_path = OUTPUT_DIR / spec.runtime_name
        local_axis = (
            INPUT_AXIS[0] - spec.crop[0],
            INPUT_AXIS[1] - spec.crop[1],
        )
        axis_note = (
            f", local axis={local_axis}"
            if key in {"static_back", "detail", "static_front", "face_mask"}
            else ""
        )
        print(
            f"- {spec.runtime_name}: crop={spec.crop}, natural={runtime_size}, "
            f"master={master_path.stat().st_size}B, runtime={runtime_path.stat().st_size}B"
            f"{axis_note}"
        )


if __name__ == "__main__":
    main()
