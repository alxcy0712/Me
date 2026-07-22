from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import build_world_compiler_parts_v5 as build


DIAGNOSTIC_DIR = build.MASTER_DIR


def load_rgba(path: Path) -> Image.Image:
    assert path.exists(), f"missing asset: {path}"
    return Image.open(path).convert("RGBA")


def alpha_bbox(pixels: np.ndarray, threshold: int = build.MIN_ALPHA):
    ys, xs = np.where(pixels[:, :, 3] >= threshold)
    if not len(xs):
        return None
    return int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)


def assert_transparent_rgb_is_zero(name: str, pixels: np.ndarray) -> None:
    transparent = pixels[:, :, 3] == 0
    hidden_rgb = pixels[:, :, :3][transparent]
    assert not np.any(hidden_rgb), f"{name}: transparent pixels retain hidden RGB"


def expected_runtime(spec: build.AssetSpec) -> Image.Image:
    master = load_rgba(build.MASTER_DIR / spec.master_name)
    size = tuple(dimension * build.EXPORT_SCALE for dimension in spec.logical_size)
    result = build.premultiplied_resize(master, size)
    if spec.sharpen:
        result = build.lightly_sharpen_visible_rgb(result)
    return build.clean_rgba(result)


def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    width, height = size
    pixels = np.zeros((height, width, 4), dtype=np.uint8)
    colors = ((241, 236, 224, 255), (205, 199, 187, 255))
    y, x = np.ogrid[:height, :width]
    parity = ((x // cell) + (y // cell)) % 2
    pixels[parity == 0] = colors[0]
    pixels[parity == 1] = colors[1]
    return Image.fromarray(pixels, "RGBA")


def save_diagnostics(
    neutral: np.ndarray,
    detail: np.ndarray,
    face_mask: np.ndarray,
) -> None:
    neutral_image = Image.fromarray(neutral, "RGBA")
    neutral_preview = checkerboard(neutral_image.size)
    neutral_preview.alpha_composite(neutral_image)
    neutral_preview.convert("RGB").save(
        DIAGNOSTIC_DIR / "input-neutral-composite-check.png",
        "PNG",
        optimize=True,
    )

    axis_preview = neutral_preview.convert("RGBA")
    axis_x = (build.INPUT_AXIS[0] - build.INPUT_COMPONENT_CROP[0]) * build.MASTER_SCALE
    axis_y = (build.INPUT_AXIS[1] - build.INPUT_COMPONENT_CROP[1]) * build.MASTER_SCALE
    draw = ImageDraw.Draw(axis_preview)
    draw.line((axis_x, 0, axis_x, axis_preview.height - 1), fill=(178, 36, 36, 230), width=2)
    draw.line((0, axis_y, axis_preview.width - 1, axis_y), fill=(31, 91, 153, 230), width=2)
    draw.ellipse(
        (axis_x - 8, axis_y - 8, axis_x + 8, axis_y + 8),
        outline=(20, 20, 20, 255),
        width=2,
    )
    axis_preview.convert("RGB").save(
        DIAGNOSTIC_DIR / "input-axis-overlay-check.png",
        "PNG",
        optimize=True,
    )

    detail_image = Image.fromarray(detail, "RGBA")
    mask_image = Image.fromarray(face_mask, "RGBA")
    detail_preview = checkerboard(detail_image.size, cell=8)
    detail_preview.alpha_composite(detail_image)
    mask_preview = checkerboard(mask_image.size, cell=8)
    mask_tint = np.asarray(mask_image).copy()
    visible = mask_tint[:, :, 3] > 0
    mask_tint[visible, :3] = (174, 47, 36)
    mask_tint[visible, 3] = np.minimum(mask_tint[visible, 3], 180)
    mask_preview.alpha_composite(Image.fromarray(mask_tint, "RGBA"))

    edge_sheet = Image.new(
        "RGB",
        (detail_preview.width * 2, detail_preview.height),
        (238, 232, 220),
    )
    edge_sheet.paste(detail_preview.convert("RGB"), (0, 0))
    edge_sheet.paste(mask_preview.convert("RGB"), (detail_preview.width, 0))
    edge_sheet.resize(
        (edge_sheet.width * 4, edge_sheet.height * 4),
        Image.Resampling.NEAREST,
    ).save(
        DIAGNOSTIC_DIR / "input-alpha-edge-400-check.png",
        "PNG",
        optimize=True,
    )


def main() -> None:
    print("World Compiler v5 INPUT checks")

    decoded_memory = 0
    runtime_bytes = 0
    for name, spec in build.ASSET_SPECS.items():
        master_path = build.MASTER_DIR / spec.master_name
        runtime_path = build.OUTPUT_DIR / spec.runtime_name
        master = load_rgba(master_path)
        runtime = load_rgba(runtime_path)

        expected_master_size = tuple(
            dimension * build.MASTER_SCALE for dimension in spec.logical_size
        )
        expected_runtime_size = tuple(
            dimension * build.EXPORT_SCALE for dimension in spec.logical_size
        )
        assert master.size == expected_master_size, (
            f"{spec.master_name}: {master.size} != {expected_master_size}"
        )
        assert runtime.size == expected_runtime_size, (
            f"{spec.runtime_name}: {runtime.size} != {expected_runtime_size}"
        )

        master_pixels = np.asarray(master)
        runtime_pixels = np.asarray(runtime)
        assert_transparent_rgb_is_zero(spec.master_name, master_pixels)
        assert_transparent_rgb_is_zero(spec.runtime_name, runtime_pixels)
        assert np.array_equal(runtime_pixels, np.asarray(expected_runtime(spec))), (
            f"{spec.runtime_name}: runtime export is stale or non-deterministic"
        )

        bbox = alpha_bbox(runtime_pixels)
        assert bbox is not None, f"{spec.runtime_name}: empty alpha"
        left_gap = bbox[0]
        top_gap = bbox[1]
        right_gap = runtime.width - bbox[2]
        bottom_gap = runtime.height - bbox[3]
        assert min(left_gap, top_gap, right_gap, bottom_gap) >= (
            4 * build.EXPORT_SCALE
        ), (
            f"{spec.runtime_name}: alpha lacks physical safety padding; bbox={bbox}"
        )

        decoded_memory += runtime.width * runtime.height * 4
        runtime_bytes += runtime_path.stat().st_size
        print(
            f"- {spec.runtime_name}: crop={spec.crop}, natural={runtime.size}, "
            f"alpha_bbox={bbox}, bytes={runtime_path.stat().st_size}"
        )

    assert runtime_bytes < 700_000, f"INPUT runtime assets total {runtime_bytes}B"
    assert decoded_memory < 8 * 1024 * 1024, (
        f"INPUT decoded memory {decoded_memory}B exceeds 8MB"
    )

    component_size_4x = tuple(
        dimension * build.MASTER_SCALE
        for dimension in build.ASSET_SPECS["static_back"].logical_size
    )
    component_size_3x = tuple(
        dimension * build.EXPORT_SCALE
        for dimension in build.ASSET_SPECS["static_back"].logical_size
    )

    back_4x = np.asarray(
        load_rgba(build.MASTER_DIR / build.ASSET_SPECS["static_back"].master_name)
    )
    front_4x = np.asarray(
        load_rgba(build.MASTER_DIR / build.ASSET_SPECS["static_front"].master_name)
    )
    detail_face_4x = np.asarray(
        load_rgba(build.MASTER_DIR / build.ASSET_SPECS["detail"].master_name)
    )
    mask_4x = np.asarray(
        load_rgba(build.MASTER_DIR / build.ASSET_SPECS["face_mask"].master_name)
    )
    detail_4x = np.zeros((component_size_4x[1], component_size_4x[0], 4), dtype=np.uint8)
    detail_4x[: detail_face_4x.shape[0], : detail_face_4x.shape[1]] = detail_face_4x

    moving = detail_4x[:, :, 3] >= build.MIN_ALPHA
    fixed_front = front_4x[:, :, 3] >= build.MIN_ALPHA
    assert not np.any(moving & fixed_front), (
        "moving detail overlaps fixed shaft/hub/rim pixels"
    )
    assert np.all(mask_4x[:, :, 3][detail_face_4x[:, :, 3] >= build.MIN_ALPHA] >= 250), (
        "moving detail escapes the opaque face aperture"
    )

    local_axis_component = (
        build.INPUT_AXIS[0] - build.INPUT_COMPONENT_CROP[0],
        build.INPUT_AXIS[1] - build.INPUT_COMPONENT_CROP[1],
    )
    local_axis_face = (
        build.INPUT_AXIS[0] - build.INPUT_FACE_CROP[0],
        build.INPUT_AXIS[1] - build.INPUT_FACE_CROP[1],
    )
    assert local_axis_component == (33, 59)
    assert local_axis_face == (33, 59)
    assert local_axis_component == local_axis_face

    keyed_source = load_rgba(build.V4_SOURCE_DIR / "input-rotor-clean.webp")
    keyed_source_4x = np.asarray(
        build.scaled_crop(keyed_source, build.INPUT_COMPONENT_CROP)
    )
    approved, marker_alpha, keyed_alpha, marker_base_image = (
        build.approved_input_component()
    )
    approved_4x = np.asarray(approved)
    marker = marker_alpha >= build.MIN_ALPHA
    keyed_marker = keyed_alpha >= build.MIN_ALPHA
    marker_core = marker_alpha >= 250
    approved_delta = np.abs(
        approved_4x.astype(np.int16) - keyed_source_4x.astype(np.int16)
    )
    assert not np.any(approved_delta[~keyed_marker]), (
        "approved INPUT mother changes pixels outside the positioning mark"
    )
    assert 50 <= int(np.count_nonzero(marker_core)) <= 100, (
        "unexpected 4x INPUT positioning-mark area"
    )
    assert 250 <= int(np.count_nonzero(marker)) <= 320, (
        "unexpected feathered INPUT positioning-mark area"
    )
    assert np.all(detail_4x[:, :, 3][marker_core] >= 185), (
        "INPUT positioning mark is not fully owned by the moving detail"
    )
    marker_luminance = (
        approved_4x[:, :, :3].astype(np.float32)
        @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    )
    marker_mean_luminance = float(marker_luminance[marker_core].mean())
    assert 70.0 <= marker_mean_luminance <= 85.0, (
        "INPUT positioning mark must read as a deep-brass engraving"
    )
    detail_luminance = (
        detail_4x[:, :, :3].astype(np.float32)
        @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    )
    assert float(np.percentile(detail_luminance[marker], 99)) <= 85.0, (
        "INPUT positioning mark carries a bright moving fringe"
    )
    marker_base = np.asarray(marker_base_image)
    assert np.array_equal(back_4x[marker], marker_base[marker]), (
        "INPUT static base retains a positioning-mark ghost"
    )

    moving_nonmarker = moving & ~marker
    assert int(np.count_nonzero(moving_nonmarker)) <= 600, (
        "moving microtexture is too dense"
    )
    global_x, global_y = build.global_coordinates(
        build.INPUT_COMPONENT_CROP,
        build.MASTER_SCALE,
    )
    face_q = np.sqrt(
        ((global_x - build.INPUT_AXIS[0]) / 24.0) ** 2
        + ((global_y - build.INPUT_AXIS[1]) / 46.0) ** 2
    )
    assert float(np.percentile(face_q[moving_nonmarker], 95)) <= 0.71, (
        "moving microtexture reaches the fixed front-disc edge"
    )
    neutral_4x = build.source_over(back_4x, detail_4x)
    neutral_4x = build.source_over(neutral_4x, front_4x)
    master_difference = np.abs(
        neutral_4x.astype(np.int16) - approved_4x.astype(np.int16)
    )
    assert int(master_difference.max()) <= 2, (
        f"4x neutral composite max error {master_difference.max()}"
    )

    back_3x = np.asarray(
        load_rgba(build.OUTPUT_DIR / build.ASSET_SPECS["static_back"].runtime_name)
    )
    front_3x = np.asarray(
        load_rgba(build.OUTPUT_DIR / build.ASSET_SPECS["static_front"].runtime_name)
    )
    detail_face_3x = np.asarray(
        load_rgba(build.OUTPUT_DIR / build.ASSET_SPECS["detail"].runtime_name)
    )
    detail_3x = np.zeros((component_size_3x[1], component_size_3x[0], 4), dtype=np.uint8)
    detail_3x[: detail_face_3x.shape[0], : detail_face_3x.shape[1]] = detail_face_3x
    neutral_3x = build.source_over(back_3x, detail_3x)
    neutral_3x = build.source_over(neutral_3x, front_3x)

    approved_runtime = build.lightly_sharpen_visible_rgb(
        build.premultiplied_resize(
            approved,
            component_size_3x,
        )
    )
    approved_runtime = np.asarray(build.clean_rgba(approved_runtime))
    runtime_difference = np.abs(
        neutral_3x.astype(np.int16) - approved_runtime.astype(np.int16)
    )
    visible = approved_runtime[:, :, 3] >= build.MIN_ALPHA
    visible_difference = runtime_difference[visible]
    runtime_mae = float(visible_difference.mean())
    runtime_p99 = float(np.percentile(visible_difference, 99))
    assert runtime_mae <= 2.5, f"3x neutral visible MAE {runtime_mae:.3f}"
    assert runtime_p99 <= 32.0, f"3x neutral visible p99 {runtime_p99:.3f}"

    fixed_front_roi = front_3x[:, :, 3] >= 250
    fixed_front_difference = runtime_difference[fixed_front_roi]
    fixed_front_mae = float(fixed_front_difference.mean())
    fixed_front_p99 = float(np.percentile(fixed_front_difference, 99))
    assert fixed_front_mae <= 1.0, (
        f"fixed shaft/hub/rim ROI MAE {fixed_front_mae:.3f}"
    )
    assert fixed_front_p99 <= 18.0, (
        f"fixed shaft/hub/rim ROI p99 {fixed_front_p99:.3f}"
    )

    static_only_4x = build.source_over(back_4x, front_4x)
    assert alpha_bbox(static_only_4x) == alpha_bbox(approved_4x), (
        "moving layer owns part of the INPUT exterior silhouette"
    )

    moving_pixels = int(np.count_nonzero(detail_face_4x[:, :, 3] >= build.MIN_ALPHA))
    aperture_pixels = int(np.count_nonzero(mask_4x[:, :, 3] >= 250))
    moving_coverage = moving_pixels / aperture_pixels
    assert 0.02 <= moving_coverage <= 0.35, (
        f"moving detail coverage {moving_coverage:.3%} is outside the approved range"
    )

    save_diagnostics(neutral_4x, detail_face_4x, mask_4x)

    print(
        f"neutral 4x max={int(master_difference.max())}; "
        f"3x visible MAE={runtime_mae:.3f}, p99={runtime_p99:.3f}; "
        f"fixed ROI MAE={fixed_front_mae:.3f}, p99={fixed_front_p99:.3f}"
    )
    print(
        f"moving coverage={moving_coverage:.2%}; runtime total={runtime_bytes}B; "
        f"decoded RGBA={decoded_memory}B; marker core={np.count_nonzero(marker_core)}px"
    )
    print("passed")


if __name__ == "__main__":
    main()
