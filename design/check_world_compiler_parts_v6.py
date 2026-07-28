"""Assertion checks for the World Compiler v6 rigid-body motion assets.

Validates the exported 3x runtime layers in public/world-compiler/parts-v5:

- all expected files exist with natural size = 3x logical;
- ring layers carry no hub-zone or axle-corridor alpha (rotating content is
  in-plane face content only);
- static layers carry the complementary hub/thickness content;
- transparent pixels have zeroed RGB (no paper-colored haze at edges);
- the neutral composite (static, then ring, then shading) reproduces the
  source sprite within tolerance.
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "public" / "world-compiler" / "parts-v5"
SOURCE = ROOT / "public" / "world-compiler" / "parts-v4"

GEARS = {
    "outer": {
        "sprite": "rules-gear-outer.webp",
        "size": (276, 510),
        "center": (44.0, 85.0),
        "face": (42.5, 85.0),
        "hub_ratio": 0.42,
        "axle_side": +1,
        "axle_half_height": 12.0,
        "mae_limit": 15.0,
    },
    "inner": {
        "sprite": "rules-gear-inner.webp",
        "size": (252, 432),
        "center": (42.0, 72.0),
        "face": (37.06, 72.0),
        "hub_ratio": 0.42,
        "axle_side": -1,
        "axle_half_height": 11.0,
        "mae_limit": 15.0,
    },
}

STATE = {
    "sprite": "state-rotor-cycle.webp",
    "size": (237, 408),
    "center": (36.0, 68.0),
    "face": (24.0, 64.0),
    "mae_limit": 14.0,
}

failures = []


def check(name, condition, detail):
    print(f"{'PASS' if condition else 'FAIL'}  {name}  {detail}")
    if not condition:
        failures.append(name)


def load_rgba(path):
    return np.array(Image.open(path).convert("RGBA")).astype(np.float64)


def ellipse_rho(shape, center, face):
    h, w = shape
    y, x = np.mgrid[0:h, 0:w].astype(np.float64)
    return np.sqrt(((x - center[0]) / face[0]) ** 2 + ((y - center[1]) / face[1]) ** 2)


def composite_over(top, bot):
    ta = top[:, :, 3:4] / 255.0
    ba = bot[:, :, 3:4] / 255.0
    oa = ta + ba * (1 - ta)
    rgb = (top[:, :, :3] * ta + bot[:, :, :3] * ba * (1 - ta)) / np.maximum(oa, 1e-6)
    return rgb, oa[:, :, 0] * 255.0


def check_gear(name, config):
    w3, h3 = config["size"]
    layers = {}
    for kind in ("ring", "static", "shading"):
        path = RUNTIME / f"rules-gear-{name}-{kind}-3x.webp"
        check(f"{name} {kind} exists", path.is_file(), str(path))
        layers[kind] = load_rgba(path)
        check(
            f"{name} {kind} natural size = 3x",
            layers[kind].shape[:2] == (h3, w3),
            f"{layers[kind].shape[1]}x{layers[kind].shape[0]} expected {w3}x{h3}",
        )
    mask = np.array(
        Image.open(RUNTIME / f"rules-gear-{name}-mask-3x.webp").convert("L")
    )
    check(f"{name} mask natural size = 3x", mask.shape == (h3, w3), f"{mask.shape}")

    scale = 3
    center = (config["center"][0] * scale, config["center"][1] * scale)
    face = (config["face"][0] * scale, config["face"][1] * scale)
    rho = ellipse_rho((h3, w3), center, face)

    ring_alpha = layers["ring"][:, :, 3]
    hub_alpha = ring_alpha[rho < config["hub_ratio"]]
    check(
        f"{name} ring has no hub-zone alpha",
        (hub_alpha > 8).mean() < 0.04,
        f"hub-zone ring coverage={(hub_alpha > 8).mean():.4%}",
    )

    yy, xx = np.mgrid[0:h3, 0:w3]
    half = config["axle_half_height"] * scale
    # Corridor boundary must match build script: x > cx + face_a * hub_ratio
    hub_x = center[0] + config["face"][0] * config["hub_ratio"]
    on_axle_side = (
        xx > hub_x if config["axle_side"] > 0 else xx < hub_x
    )
    corridor = on_axle_side & (np.abs(yy - center[1]) < half) & (rho <= 1.0)
    corridor_alpha = ring_alpha[corridor]
    check(
        f"{name} ring axle corridor empty",
        (corridor_alpha > 8).mean() < 0.06,
        f"corridor ring coverage={(corridor_alpha > 8).mean():.4%}",
    )

    static_alpha = layers["static"][:, :, 3]
    check(
        f"{name} static keeps hub/thickness",
        (static_alpha > 8).sum() > 0,
        f"static alpha px={(static_alpha > 8).sum()}",
    )

    for kind, layer in layers.items():
        transparent = layer[:, :, 3] == 0
        dirty = (layer[:, :, :3][transparent] != 0).sum() if transparent.any() else 0
        check(f"{name} {kind} transparent RGB zeroed", dirty == 0, f"dirty px={dirty}")

    rgb1, a1 = composite_over(layers["ring"], layers["static"])
    rgb2, _ = composite_over(layers["shading"], np.dstack([rgb1, a1]))
    source = load_rgba(SOURCE / config["sprite"])
    source3 = np.array(
        Image.fromarray(source.astype(np.uint8), "RGBA").resize((w3, h3), Image.Resampling.LANCZOS)
    ).astype(np.float64)
    visible = source3[:, :, 3] >= 128
    mae = np.abs(rgb2 - source3[:, :, :3])[visible].mean()
    check(f"{name} neutral composite MAE < {config['mae_limit']}", mae < config["mae_limit"], f"MAE={mae:.2f}")


def check_state(config):
    w3, h3 = config["size"]
    layers = {}
    for kind in ("ring", "static", "shading"):
        path = RUNTIME / f"state-drum-{kind}-3x.webp"
        check(f"state {kind} exists", path.is_file(), str(path))
        layers[kind] = load_rgba(path)
        check(
            f"state {kind} natural size = 3x",
            layers[kind].shape[:2] == (h3, w3),
            f"{layers[kind].shape[1]}x{layers[kind].shape[0]} expected {w3}x{h3}",
        )

    for kind, layer in layers.items():
        transparent = layer[:, :, 3] == 0
        dirty = (layer[:, :, :3][transparent] != 0).sum() if transparent.any() else 0
        check(f"state {kind} transparent RGB zeroed", dirty == 0, f"dirty px={dirty}")

    ring = layers["ring"]
    ring_alpha = ring[:, :, 3]
    check(
        "state ring carries graduations",
        (ring_alpha > 8).sum() > (w3 * h3) * 0.4,
        f"ring coverage={(ring_alpha > 8).mean():.2%}",
    )
    dark = ring[:, :, :3].mean(axis=2)
    engraved = ((dark < 110) & (ring_alpha > 100)).sum()
    check("state engraved ticks present", engraved > 400, f"engraved dark px={engraved}")

    static_alpha = layers["static"][:, :, 3]
    check(
        "state static keeps barrel sliver",
        (static_alpha > 8).sum() > 0,
        f"static alpha px={(static_alpha > 8).sum()}",
    )

    rgb1, a1 = composite_over(layers["ring"], layers["static"])
    rgb2, _ = composite_over(layers["shading"], np.dstack([rgb1, a1]))
    source = load_rgba(SOURCE / config["sprite"])
    source3 = np.array(
        Image.fromarray(source.astype(np.uint8), "RGBA").resize((w3, h3), Image.Resampling.LANCZOS)
    ).astype(np.float64)
    visible = source3[:, :, 3] >= 128
    mae = np.abs(rgb2 - source3[:, :, :3])[visible].mean()
    check(f"state neutral composite MAE < {config['mae_limit']}", mae < config["mae_limit"], f"MAE={mae:.2f}")


def main():
    for name, config in GEARS.items():
        check_gear(name, config)
    check_state(STATE)
    print(f"\n{len(failures)} failure(s)" if failures else "\nall v6 asset checks passed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
