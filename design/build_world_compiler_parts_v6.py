"""World Compiler v6 rigid-body motion assets.

Rebuilds RULES gears and the STATE drum as physically layered sprites:

- rotating ring: in-plane face content (teeth, rim, spokes, rings,
  graduations) with the measured angular lighting field divided out, so the
  world highlight stays fixed while the texture rotates;
- static layer: hub discs, axle corridors, 3D thickness, barrel slivers;
- shading overlay: a smooth, purely angular RGBA gradient that re-applies
  most of the measured lighting field as a fixed screen-space layer. Because
  it carries no per-pixel texture, it cannot ghost when the ring rotates.
- masks: existing gear apertures upsampled to 3x.

Splits happen on the 4x masters (premultiplied-alpha Lanczos upscaled from
the 1x sources) with feathered boundaries, and runtime sprites export as 3x
lossless WebP, matching the v5 pipeline conventions.
"""

from pathlib import Path
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public" / "world-compiler" / "parts-v4"
MASTER_DIR = ROOT / "design" / "world-compiler-parts-v6-sources"
OUTPUT_DIR = ROOT / "public" / "world-compiler" / "parts-v5"
MASTER_SCALE = 4
EXPORT_SCALE = 3

GEARS = {
    "outer": {
        "sprite": "rules-gear-outer.webp",
        "mask": "rules-gear-outer-mask.webp",
        "center": (44.0, 85.0),
        "face": (42.5, 85.0),
        "hub_ratio": 0.42,
        "axle_side": +1,  # axle corridor extends toward +x
        "axle_half_height": 12.0,
        "field_band": (0.50, 0.95),
        "blur_radius": 20,
    },
    "inner": {
        "sprite": "rules-gear-inner.webp",
        "mask": "rules-gear-inner-mask.webp",
        "center": (42.0, 72.0),
        "face": (37.06, 72.0),
        "hub_ratio": 0.42,
        "axle_side": -1,
        "axle_half_height": 11.0,
        "field_band": (0.50, 0.95),
        "blur_radius": 18,
    },
}

STATE = {
    "sprite": "state-rotor-cycle.webp",
    "center": (36.0, 68.0),
    "face": (24.0, 64.0),
    "field_band": (0.35, 0.98),
}

BRASS_DARK = (88, 62, 30)
BRASS_DEEP = (70, 48, 24)
BRASS_LIGHT = (232, 214, 178)
LIGHT_TINT = (255, 244, 220)
SHADOW_TINT = (46, 32, 16)
FIELD_CLAMP = (0.70, 1.45)
SHADING_STRENGTH = 0.7


def premultiplied_upscale(image, scale):
    arr = np.array(image).astype(np.float64)
    alpha = arr[:, :, 3:4] / 255.0
    premul = arr.copy()
    premul[:, :, :3] *= alpha
    resized = Image.fromarray(premul.astype(np.uint8), "RGBA").resize(
        (image.width * scale, image.height * scale), Image.Resampling.LANCZOS
    )
    out = np.array(resized).astype(np.float64)
    new_alpha = out[:, :, 3:4] / 255.0
    safe = np.where(new_alpha > 1e-4, new_alpha, 1.0)
    out[:, :, :3] = np.clip(out[:, :, :3] / safe, 0, 255)
    out[new_alpha[:, :, 0] <= 1e-4, :3] = 0
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def unsharp(image, radius=0.7, percent=110, threshold=2):
    arr = np.array(image).astype(np.int16)
    alpha = arr[:, :, 3]
    rgb = Image.fromarray(arr[:, :, :3].astype(np.uint8), "RGB").filter(
        ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=threshold)
    )
    out = arr.copy()
    out[:, :, :3] = np.array(rgb).astype(np.int16)
    out[:, :, :3] = np.clip(out[:, :, :3], 0, 255)
    out[alpha == 0, :3] = 0
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def ellipse_maps(shape, center, face):
    h, w = shape
    cx, cy = center
    a, b = face
    y, x = np.mgrid[0:h, 0:w].astype(np.float64)
    rho = np.sqrt(((x - cx) / a) ** 2 + ((y - cy) / b) ** 2)
    theta = np.arctan2((y - cy) / b, (x - cx) / a)
    return rho, theta


def angular_field(sprite, rho, theta, band, sigma_bins=10):
    """Smoothed median luminance field g(theta) over the annulus band."""
    alpha = sprite[:, :, 3]
    rgb = sprite[:, :, :3].astype(np.float64)
    lum = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
    inner, outer = band
    region = (rho >= inner) & (rho <= outer) & (alpha >= 128)
    bins = 120
    edges = np.linspace(-np.pi, np.pi, bins + 1)
    field = np.zeros(bins)
    for index in range(bins):
        mask = region & (theta >= edges[index]) & (theta < edges[index + 1])
        if mask.any():
            field[index] = np.median(lum[mask])
    missing = field == 0
    if not missing.all():
        field[missing] = np.interp(
            np.flatnonzero(missing), np.flatnonzero(~missing), field[~missing]
        )
    kernel_radius = sigma_bins * 3
    x = np.arange(-kernel_radius, kernel_radius + 1)
    kernel = np.exp(-0.5 * (x / sigma_bins) ** 2)
    kernel /= kernel.sum()
    wrapped = np.r_[field, field, field]
    smooth = np.convolve(wrapped, kernel, mode="same")[bins : 2 * bins]
    centers = (edges[:-1] + edges[1:]) / 2
    per_pixel = np.interp(theta, centers, smooth, period=2 * np.pi)
    gain = per_pixel / per_pixel.mean()
    gain = np.clip(gain, *FIELD_CLAMP)
    print(
        f"    field gain min={gain.min():.3f} max={gain.max():.3f} dev={gain.max() - gain.min():.3f}"
    )
    return gain


def upsample_field(gain, shape):
    image = Image.fromarray(
        (np.clip(gain - 0.5, 0, 1) * 255).astype(np.uint8), "L"
    ).resize((shape[1], shape[0]), Image.Resampling.BILINEAR)
    return np.array(image).astype(np.float64) / 255.0 + 0.5


def solved_shading(flat_rgb, gain, annulus_alpha, blur_radius, strength=0.85):
    """Static shading overlay: per-pixel solved correction (so the rest pose
    reproduces the source), heavily blurred so no tooth- or spoke-frequency
    structure survives. What remains is the smooth angular lighting field,
    which cannot ghost when the ring rotates beneath it."""
    h, w = gain.shape
    overlay = np.zeros((h, w, 4), dtype=np.float64)
    amount = np.minimum(np.abs(gain - 1.0) * strength, 0.5)
    safe = np.maximum(amount, 1e-4)
    for channel in range(3):
        color = flat_rgb[:, :, channel] * (gain - 1.0 + safe) / safe
        overlay[:, :, channel] = np.clip(color, 0, 255)
    overlay[:, :, 3] = amount * (annulus_alpha / 255.0) * 255.0
    overlay[overlay[:, :, 3] <= 0, :3] = 0
    blurred = np.array(
        Image.fromarray(overlay.astype(np.uint8), "RGBA").filter(
            ImageFilter.GaussianBlur(blur_radius)
        )
    ).astype(np.float64)
    blurred[:, :, 3] = np.minimum(blurred[:, :, 3], 0.5 * 255)
    blurred[blurred[:, :, 3] <= 2] = 0
    blurred[blurred[:, :, 3] <= 0, :3] = 0
    return blurred


def field_shading(gain, annulus_alpha, strength=0.9):
    """Pure angular-field shading: color and alpha derive only from the
    smoothed g(theta) field, never from per-pixel texture, so the overlay is
    structurally incapable of ghosting. Used for the gears, whose strong
    directional lighting would otherwise print rest-pose teeth over rotated
    ones."""
    h, w = gain.shape
    overlay = np.zeros((h, w, 4), dtype=np.float64)
    dev = gain - 1.0
    amount = np.minimum(np.abs(dev) * strength, 0.5)
    for channel in range(3):
        overlay[:, :, channel] = np.where(
            dev >= 0, LIGHT_TINT[channel], SHADOW_TINT[channel]
        )
    overlay[:, :, 3] = amount * (annulus_alpha / 255.0) * 255.0
    overlay[overlay[:, :, 3] <= 2] = 0
    overlay[overlay[:, :, 3] <= 0, :3] = 0
    return overlay


def feathered_zone(rho, inner, outer, feather):
    """1 inside [inner, outer], 0 outside, linear ramps at both edges."""
    zone = np.ones_like(rho)
    zone[rho < inner - feather] = 0
    zone[rho > outer + feather] = 0
    rise = (rho >= inner - feather) & (rho < inner)
    zone[rise] = (rho[rise] - (inner - feather)) / feather
    fall = (rho > outer) & (rho <= outer + feather)
    zone[fall] = ((outer + feather) - rho[fall]) / feather
    return zone


def export_layers(name, layers, mask_name=None, mask=None):
    h, w = next(iter(layers.values())).shape[:2]
    for layer_name, layer in layers.items():
        image = Image.fromarray(layer.astype(np.uint8), "RGBA")
        image.save(MASTER_DIR / f"{layer_name}-4x.png")
        runtime = image.resize(
            (w // MASTER_SCALE * EXPORT_SCALE, h // MASTER_SCALE * EXPORT_SCALE),
            Image.Resampling.LANCZOS,
        )
        runtime = unsharp(runtime)
        # PIL's WebP encoder rewrites fully transparent RGB for compression;
        # cwebp -exact preserves it, keeping transparent edges haze-free.
        temp_png = OUTPUT_DIR / f".{layer_name}-tmp.png"
        runtime.save(temp_png, "PNG")
        subprocess.run(
            [
                "cwebp",
                "-exact",
                "-lossless",
                "-z",
                "9",
                str(temp_png),
                "-o",
                str(OUTPUT_DIR / f"{layer_name}-3x.webp"),
            ],
            check=True,
            capture_output=True,
        )
        temp_png.unlink()
    if mask is not None:
        mask_3x = mask.resize(
            (w // MASTER_SCALE * EXPORT_SCALE, h // MASTER_SCALE * EXPORT_SCALE),
            Image.Resampling.LANCZOS,
        )
        mask_3x.save(OUTPUT_DIR / mask_name, "WEBP", lossless=True, method=6)
    print(
        f"[{name}] exported {len(layers)} layers at "
        f"{w // MASTER_SCALE * EXPORT_SCALE}x{h // MASTER_SCALE * EXPORT_SCALE}"
    )


def split_gear(name, config):
    source = Image.open(SOURCE_DIR / config["sprite"]).convert("RGBA")
    sprite = np.array(source).astype(np.float64)
    h, w = sprite.shape[:2]
    cx, cy = config["center"]
    rho, theta = ellipse_maps((h, w), config["center"], config["face"])
    gain_1x = angular_field(sprite, rho, theta, config["field_band"])

    flat = sprite.copy()
    safe_gain = np.maximum(gain_1x, 1e-3)
    for channel in range(3):
        flat[:, :, channel] = np.clip(sprite[:, :, channel] / safe_gain, 0, 255)
    flat[sprite[:, :, 3] == 0, :3] = 0

    # Work at 4x from here: upscale the flattened sprite and the gain field.
    master = np.array(
        premultiplied_upscale(Image.fromarray(flat.astype(np.uint8), "RGBA"), MASTER_SCALE)
    ).astype(np.float64)
    mh, mw = master.shape[:2]
    mrho, _ = ellipse_maps(
        (mh, mw),
        (cx * MASTER_SCALE, cy * MASTER_SCALE),
        (config["face"][0] * MASTER_SCALE, config["face"][1] * MASTER_SCALE),
    )
    mgain = upsample_field(gain_1x, (mh, mw))

    feather = 0.005
    ring_membership = feathered_zone(mrho, config["hub_ratio"], 1.0, feather)
    # Axle corridor: the horizontal 3D axle crossing the annulus stays static.
    # Binary cut with a sub-pixel soft edge, so no ring alpha survives inside.
    corridor = np.zeros((mh, mw))
    half = config["axle_half_height"] * MASTER_SCALE
    yy, xx = np.mgrid[0:mh, 0:mw]
    on_axle_side = (
        xx > (cx + config["face"][0] * config["hub_ratio"]) * MASTER_SCALE
        if config["axle_side"] > 0
        else xx < (cx - config["face"][0] * config["hub_ratio"]) * MASTER_SCALE
    )
    in_corridor = on_axle_side & (np.abs(yy - cy * MASTER_SCALE) < half)
    corridor[in_corridor] = 1.0
    corridor = np.array(
        Image.fromarray((corridor * 255).astype(np.uint8), "L").filter(
            ImageFilter.GaussianBlur(0.2)
        )
    ).astype(np.float64) / 255.0
    ring_membership = ring_membership * (1.0 - corridor)

    malpha = master[:, :, 3]
    ring = master.copy()
    ring[:, :, 3] = malpha * ring_membership
    static = master.copy()
    static[:, :, 3] = malpha * (1.0 - ring_membership)

    annulus_alpha = malpha * feathered_zone(mrho, config["hub_ratio"], 1.0, feather)
    shading = field_shading(mgain, annulus_alpha)

    for layer in (ring, static, shading):
        layer[layer[:, :, 3] < 0.5, :3] = 0

    # Neutral rest check (approximate, smooth overlay).
    def over(top, bot):
        ta = top[:, :, 3:4] / 255.0
        ba = bot[:, :, 3:4] / 255.0
        oa = ta + ba * (1 - ta)
        rgb = (top[:, :, :3] * ta + bot[:, :, :3] * ba * (1 - ta)) / np.maximum(oa, 1e-6)
        return rgb, oa

    rgb1, _ = over(ring, static)
    rgb2, _ = over(shading, np.dstack([rgb1, malpha.reshape(mh, mw, 1)]))
    original = np.array(premultiplied_upscale(source, MASTER_SCALE)).astype(np.float64)
    visible = original[:, :, 3] >= 128
    mae = np.abs(rgb2 - original[:, :, :3])[visible].mean()
    print(f"[{name}] neutral composite MAE={mae:.3f}")

    mask = Image.open(SOURCE_DIR / config["mask"]).convert("L")
    export_layers(
        name,
        {
            f"rules-gear-{name}-ring": ring,
            f"rules-gear-{name}-static": static,
            f"rules-gear-{name}-shading": shading,
        },
        mask_name=f"rules-gear-{name}-mask-3x.webp",
        mask=mask,
    )


def ellipse_point(center, face, theta, radius):
    cx, cy = center
    a, b = face
    return (cx + a * radius * np.cos(theta), cy + b * radius * np.sin(theta))


def draw_tick(draw, center, face, theta, r1, r2, width, color):
    x1, y1 = ellipse_point(center, face, theta, r1)
    x2, y2 = ellipse_point(center, face, theta, r2)
    draw.line([(x1, y1), (x2, y2)], fill=color, width=max(1, int(round(width))))


def draw_arc(draw, center, face, start, span, radius, width, color, steps=96):
    points = [
        ellipse_point(center, face, start + span * i / steps, radius)
        for i in range(steps + 1)
    ]
    draw.line(points, fill=color, width=max(1, int(round(width))), joint="curve")


def build_state(config):
    source = Image.open(SOURCE_DIR / config["sprite"]).convert("RGBA")
    sprite = np.array(source).astype(np.float64)
    h, w = sprite.shape[:2]
    cx, cy = config["center"]
    rho, theta = ellipse_maps((h, w), config["center"], config["face"])
    gain_1x = angular_field(sprite, rho, theta, config["field_band"])

    flat = sprite.copy()
    safe_gain = np.maximum(gain_1x, 1e-3)
    for channel in range(3):
        flat[:, :, channel] = np.clip(sprite[:, :, channel] / safe_gain, 0, 255)
    flat[sprite[:, :, 3] == 0, :3] = 0

    master = premultiplied_upscale(
        Image.fromarray(flat.astype(np.uint8), "RGBA"), MASTER_SCALE
    )
    mw, mh = master.size
    mcenter = (cx * MASTER_SCALE, cy * MASTER_SCALE)
    mface = (config["face"][0] * MASTER_SCALE, config["face"][1] * MASTER_SCALE)

    engraving = Image.new("RGBA", (mw, mh), (0, 0, 0, 0))
    highlight = Image.new("RGBA", (mw, mh), (0, 0, 0, 0))
    eng = ImageDraw.Draw(engraving)
    hi = ImageDraw.Draw(highlight)
    hoff = (0.4 * MASTER_SCALE, 0.6 * MASTER_SCALE)

    for index in range(60):
        theta_deg = np.deg2rad(index * 6.0)
        major = index % 5 == 0
        r1, r2 = (0.76, 0.87) if major else (0.79, 0.855)
        width = (1.5 if major else 1.0) * MASTER_SCALE * 0.75
        color = (*BRASS_DEEP, 235) if major else (*BRASS_DARK, 200)
        draw_tick(eng, mcenter, mface, theta_deg, r1, r2, width, color)
        hc = (mcenter[0] + hoff[0], mcenter[1] + hoff[1])
        draw_tick(hi, hc, mface, theta_deg, r1, r2, width, (*BRASS_LIGHT, 70))

    draw_arc(eng, mcenter, mface, np.deg2rad(-52), np.deg2rad(104), 0.905, 1.1 * MASTER_SCALE, (*BRASS_LIGHT, 120))
    draw_arc(eng, mcenter, mface, -np.deg2rad(12.5), np.deg2rad(25), 0.55, 1.25 * MASTER_SCALE, (*BRASS_DARK, 255))
    hc = (mcenter[0] + hoff[0], mcenter[1] + hoff[1])
    draw_arc(hi, hc, mface, -np.deg2rad(12.5), np.deg2rad(25), 0.55, 1.25 * MASTER_SCALE, (*BRASS_LIGHT, 80))

    mrho, _ = ellipse_maps((mh, mw), mcenter, mface)
    face_zone = (mrho <= 1.0).astype(np.uint8) * 255
    for layer_image in (engraving, highlight):
        arr = np.array(layer_image)
        arr[face_zone == 0] = 0
        layer_image.paste(Image.fromarray(arr, "RGBA"), (0, 0))

    master.alpha_composite(highlight)
    master.alpha_composite(engraving)
    master_arr = np.array(master).astype(np.float64)

    feather = 0.005
    membership = feathered_zone(mrho, 0.0, 1.0, feather)
    malpha = master_arr[:, :, 3]
    ring = master_arr.copy()
    ring[:, :, 3] = malpha * membership
    static = master_arr.copy()
    static[:, :, 3] = malpha * (1.0 - membership)

    mgain = upsample_field(gain_1x, (mh, mw))
    shading = solved_shading(
        master_arr[:, :, :3], mgain, malpha * membership, blur_radius=14
    )

    for layer in (ring, static, shading):
        layer[layer[:, :, 3] < 0.5, :3] = 0

    export_layers(
        "state",
        {
            "state-drum-ring": ring,
            "state-drum-static": static,
            "state-drum-shading": shading,
        },
    )


def main():
    MASTER_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, config in GEARS.items():
        print(f"[{name}]")
        split_gear(name, config)
    print("[state]")
    build_state(STATE)


if __name__ == "__main__":
    main()
