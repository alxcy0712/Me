import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const DESKTOP_VIEW_WIDTH = 15.2;
const MOBILE_VIEW_WIDTH = 7.6;
const RING_BEVEL_THICKNESS = 0.032;
const RING_SURFACE_CLEARANCE = 0.008;

const RING_LAYOUT = [
  {
    name: "axiom",
    label: "AXIOM",
    closedScale: 1.08,
    expandedScale: 1.8,
    rotation: [0.25, -0.72, 0.02],
    labelAngle: 1.56,
    bandWidth: 0.14,
    bandDepth: 0.14,
    material: "brightSilver",
    sideMaterial: "polishedSilver",
    inlayMaterial: "enamel",
    labelScale: 1.15,
  },
  {
    name: "model",
    label: "MODEL",
    closedScale: 1.34,
    expandedScale: 2.45,
    rotation: [-0.24, 0.76, 0.2],
    labelAngle: 2.2,
    bandWidth: 0.18,
    bandDepth: 0.2,
    material: "graphite",
    sideMaterial: "polishedGraphite",
    inlayMaterial: "ivoryInlay",
    labelScale: 1.05,
  },
  {
    name: "system",
    label: "SYSTEM",
    closedScale: 1.59,
    expandedScale: 3,
    rotation: [0.34, -0.28, -0.02],
    labelAngle: 1.48,
    bandWidth: 0.16,
    bandDepth: 0.17,
    material: "warmSteel",
    sideMaterial: "polishedBrass",
    inlayMaterial: "enamel",
    labelScale: 0.95,
  },
  {
    name: "world",
    label: "WORLD",
    closedScale: 1.87,
    expandedScale: 4,
    rotation: [-0.14, 0.6, 0.02],
    labelAngle: 1.56,
    bandWidth: 0.135,
    bandDepth: 0.16,
    material: "silver",
    sideMaterial: "satinSilverEdge",
    inlayMaterial: "enamel",
    labelScale: 1.25,
  },
];

const GLYPHS = {
  A: [[[0, 0], [0.5, 1]], [[0.5, 1], [1, 0]], [[0.22, 0.45], [0.78, 0.45]]],
  D: [[[0, 0], [0, 1]], [[0, 1], [0.62, 1]], [[0.62, 1], [1, 0.72]], [[1, 0.72], [1, 0.28]], [[1, 0.28], [0.62, 0]], [[0.62, 0], [0, 0]]],
  E: [[[0, 0], [0, 1]], [[0, 1], [1, 1]], [[0, 0.5], [0.82, 0.5]], [[0, 0], [1, 0]]],
  I: [[[0, 1], [1, 1]], [[0.5, 1], [0.5, 0]], [[0, 0], [1, 0]]],
  L: [[[0, 1], [0, 0]], [[0, 0], [1, 0]]],
  M: [[[0, 0], [0, 1]], [[0, 1], [0.5, 0.48]], [[0.5, 0.48], [1, 1]], [[1, 1], [1, 0]]],
  O: [[[0.22, 0], [0.78, 0]], [[0.78, 0], [1, 0.22]], [[1, 0.22], [1, 0.78]], [[1, 0.78], [0.78, 1]], [[0.78, 1], [0.22, 1]], [[0.22, 1], [0, 0.78]], [[0, 0.78], [0, 0.22]], [[0, 0.22], [0.22, 0]]],
  R: [[[0, 0], [0, 1]], [[0, 1], [0.72, 1]], [[0.72, 1], [1, 0.75]], [[1, 0.75], [0.72, 0.5]], [[0.72, 0.5], [0, 0.5]], [[0.55, 0.5], [1, 0]]],
  S: [[[1, 0.82], [0.78, 1]], [[0.78, 1], [0.18, 1]], [[0.18, 1], [0, 0.78]], [[0, 0.78], [0.2, 0.54]], [[0.2, 0.54], [0.8, 0.46]], [[0.8, 0.46], [1, 0.22]], [[1, 0.22], [0.8, 0]], [[0.8, 0], [0.18, 0]], [[0.18, 0], [0, 0.18]]],
  T: [[[0, 1], [1, 1]], [[0.5, 1], [0.5, 0]]],
  W: [[[0, 1], [0.2, 0]], [[0.2, 0], [0.5, 0.52]], [[0.5, 0.52], [0.8, 0]], [[0.8, 0], [1, 1]]],
  X: [[[0, 1], [1, 0]], [[0, 0], [1, 1]]],
  Y: [[[0, 1], [0.5, 0.52]], [[1, 1], [0.5, 0.52]], [[0.5, 0.52], [0.5, 0]]],
};

const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(Math.max(value, minimum), maximum);

const mix = (from, to, progress) => from + (to - from) * progress;

function smootherstep(value) {
  const progress = clamp(value);
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
}

function createResources() {
  return {
    geometries: new Set(),
    materials: new Set(),
    textures: new Set(),
    geometry(value) {
      this.geometries.add(value);
      return value;
    },
    material(value) {
      this.materials.add(value);
      return value;
    },
    texture(value) {
      this.textures.add(value);
      return value;
    },
  };
}

function createBrushedTexture(THREE, resources) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const image = context.createImageData(canvas.width, canvas.height);
  let seed = 74683;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < canvas.height; y += 1) {
    const rowGrain = (random() - 0.5) * 6;
    let streak = (random() - 0.5) * 4;
    for (let x = 0; x < canvas.width; x += 1) {
      streak = streak * 0.9 + (random() - 0.5) * 2.6;
      const hairline = random() < 0.004 ? (random() - 0.5) * 38 : 0;
      const value = Math.round(
        128 + rowGrain + streak + hairline + (random() - 0.5) * 8,
      );
      const offset = (y * canvas.width + x) * 4;
      image.data[offset] = value;
      image.data[offset + 1] = value;
      image.data[offset + 2] = value;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = resources.texture(new THREE.CanvasTexture(canvas));
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 4);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function createMetalRoughnessTexture(THREE, resources) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const image = context.createImageData(canvas.width, canvas.height);
  let seed = 92821;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < canvas.height; y += 1) {
    const band = Math.sin(y * 0.61) * 7 + (random() - 0.5) * 12;
    let streak = (random() - 0.5) * 10;
    for (let x = 0; x < canvas.width; x += 1) {
      streak = streak * 0.94 + (random() - 0.5) * 4.5;
      const scratch = random() < 0.006 ? -48 - random() * 42 : 0;
      const value = Math.round(
        clamp(205 + band + streak + scratch, 96, 238),
      );
      const offset = (y * canvas.width + x) * 4;
      image.data[offset] = value;
      image.data[offset + 1] = value;
      image.data[offset + 2] = value;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = resources.texture(new THREE.CanvasTexture(canvas));
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 4);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function createStoneBumpTexture(THREE, resources) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const image = context.createImageData(canvas.width, canvas.height);
  let seed = 41957;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let index = 0; index < image.data.length; index += 4) {
    const value = 188 + Math.round(random() * 42);
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  for (let index = 0; index < 34; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 5 + random() * 18;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(62, 62, 62, 0.72)");
    gradient.addColorStop(0.48, "rgba(94, 94, 94, 0.48)");
    gradient.addColorStop(0.72, "rgba(185, 185, 185, 0.34)");
    gradient.addColorStop(1, "rgba(128, 128, 128, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  const texture = resources.texture(new THREE.CanvasTexture(canvas));
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function createSoftShadowTexture(THREE, resources) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  context.save();
  context.scale(1, 0.5);
  const gradient = context.createRadialGradient(256, 256, 8, 256, 256, 238);
  gradient.addColorStop(0, "rgba(54, 43, 32, 0.32)");
  gradient.addColorStop(0.32, "rgba(62, 50, 38, 0.22)");
  gradient.addColorStop(0.68, "rgba(74, 61, 47, 0.08)");
  gradient.addColorStop(1, "rgba(88, 72, 54, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);
  context.restore();
  const texture = resources.texture(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createMaterials(
  THREE,
  resources,
  brushedTexture,
  metalRoughnessTexture,
  stoneBumpTexture,
) {
  return {
    silver: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0xe6d8c5,
        metalness: 0.98,
        roughness: 0.36,
        clearcoat: 0.02,
        clearcoatRoughness: 0.6,
        anisotropy: 0.72,
        anisotropyRotation: Math.PI / 2,
        envMapIntensity: 1.25,
        roughnessMap: metalRoughnessTexture,
        bumpMap: brushedTexture,
        bumpScale: 0.008,
      }),
    ),
    brightSilver: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0xc7b8a5,
        metalness: 0.98,
        roughness: 0.34,
        clearcoat: 0.03,
        clearcoatRoughness: 0.46,
        anisotropy: 0.64,
        envMapIntensity: 1.02,
        roughnessMap: metalRoughnessTexture,
        bumpMap: brushedTexture,
        bumpScale: 0.0035,
      }),
    ),
    polishedSilver: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0xc8b9a7,
        metalness: 1,
        roughness: 0.085,
        clearcoat: 0.08,
        clearcoatRoughness: 0.16,
        envMapIntensity: 1.08,
      }),
    ),
    satinSilverEdge: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0x5e554c,
        metalness: 0.98,
        roughness: 0.25,
        clearcoat: 0.035,
        clearcoatRoughness: 0.3,
        envMapIntensity: 0.78,
      }),
    ),
    brass: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0x765333,
        metalness: 0.96,
        roughness: 0.33,
        clearcoat: 0.025,
        clearcoatRoughness: 0.58,
        anisotropy: 0.56,
        envMapIntensity: 0.7,
        bumpMap: brushedTexture,
        bumpScale: 0.004,
      }),
    ),
    warmSteel: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0xb9ab99,
        metalness: 0.97,
        roughness: 0.38,
        clearcoat: 0.02,
        clearcoatRoughness: 0.62,
        anisotropy: 0.58,
        anisotropyRotation: Math.PI / 2,
        envMapIntensity: 1.02,
        roughnessMap: metalRoughnessTexture,
        bumpMap: brushedTexture,
        bumpScale: 0.004,
      }),
    ),
    brightBrass: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0x9e7647,
        metalness: 0.97,
        roughness: 0.18,
        clearcoat: 0.04,
        clearcoatRoughness: 0.3,
        anisotropy: 0.46,
        envMapIntensity: 0.92,
        bumpMap: brushedTexture,
        bumpScale: 0.0025,
      }),
    ),
    polishedBrass: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0xb08a55,
        metalness: 1,
        roughness: 0.13,
        clearcoat: 0.08,
        clearcoatRoughness: 0.18,
        envMapIntensity: 1.14,
      }),
    ),
    darkBrass: resources.material(
      new THREE.MeshStandardMaterial({
        color: 0x3d2c20,
        metalness: 0.92,
        roughness: 0.42,
        envMapIntensity: 0.68,
      }),
    ),
    graphite: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0x332c26,
        metalness: 0.9,
        roughness: 0.5,
        clearcoat: 0.02,
        clearcoatRoughness: 0.58,
        envMapIntensity: 0.66,
        roughnessMap: metalRoughnessTexture,
        bumpMap: brushedTexture,
        bumpScale: 0.008,
      }),
    ),
    polishedGraphite: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0x40362e,
        metalness: 0.96,
        roughness: 0.12,
        clearcoat: 0.07,
        clearcoatRoughness: 0.18,
        envMapIntensity: 1,
      }),
    ),
    bearingSteel: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0xaa9b89,
        metalness: 0.94,
        roughness: 0.32,
        clearcoat: 0.025,
        clearcoatRoughness: 0.5,
        envMapIntensity: 1.04,
        bumpMap: brushedTexture,
        bumpScale: 0.008,
      }),
    ),
    shellSilver: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0x70665b,
        metalness: 0.92,
        roughness: 0.5,
        clearcoat: 0.015,
        clearcoatRoughness: 0.76,
        anisotropy: 0.84,
        anisotropyRotation: Math.PI / 2,
        envMapIntensity: 0.68,
        map: metalRoughnessTexture,
        roughnessMap: metalRoughnessTexture,
        bumpMap: brushedTexture,
        bumpScale: 0.026,
      }),
    ),
    enamel: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0x171613,
        metalness: 0.24,
        roughness: 0.28,
        clearcoat: 0.16,
        clearcoatRoughness: 0.24,
      }),
    ),
    ivoryInlay: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0xd8cfc2,
        metalness: 0.68,
        roughness: 0.22,
        clearcoat: 0.05,
        clearcoatRoughness: 0.34,
        envMapIntensity: 1.08,
      }),
    ),
    cavity: resources.material(
      new THREE.MeshStandardMaterial({
        color: 0x160f0b,
        metalness: 0.35,
        roughness: 0.78,
      }),
    ),
    groove: resources.material(
      new THREE.LineBasicMaterial({
        color: 0x403c36,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
    ),
    microGroove: resources.material(
      new THREE.LineBasicMaterial({
        color: 0x514c45,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      }),
    ),
    glass: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0xcabf9e,
        metalness: 0.08,
        roughness: 0.18,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        side: THREE.DoubleSide,
        envMapIntensity: 0.82,
      }),
    ),
    latticeBacking: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0x6a4b30,
        metalness: 0.94,
        roughness: 0.46,
        clearcoat: 0.02,
        clearcoatRoughness: 0.7,
        side: THREE.DoubleSide,
        envMapIntensity: 0.62,
        roughnessMap: metalRoughnessTexture,
        bumpMap: brushedTexture,
        bumpScale: 0.015,
      }),
    ),
    latticeRim: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0x9d7648,
        metalness: 0.98,
        roughness: 0.24,
        clearcoat: 0.035,
        clearcoatRoughness: 0.38,
        envMapIntensity: 0.94,
        bumpMap: brushedTexture,
        bumpScale: 0.002,
      }),
    ),
    stone: resources.material(
      new THREE.MeshStandardMaterial({
        color: 0x5e5142,
        roughness: 0.96,
        metalness: 0.02,
        map: stoneBumpTexture,
        bumpMap: stoneBumpTexture,
        bumpScale: 0.25,
        flatShading: true,
        vertexColors: true,
      }),
    ),
  };
}

function halfAnnulusShape(THREE, side, outerRadius = 2.55, apertureRadius = 0.9) {
  const shape = new THREE.Shape();
  const segments = 64;
  const outerPoint = (index) => {
    const progress = index / segments;
    const angle =
      side === "left"
        ? Math.PI / 2 + Math.PI * progress
        : Math.PI / 2 - Math.PI * progress;
    return [Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius];
  };
  const innerPoint = (index) => {
    const progress = index / segments;
    const angle =
      side === "left"
        ? (Math.PI * 3) / 2 - Math.PI * progress
        : -Math.PI / 2 + Math.PI * progress;
    return [Math.cos(angle) * apertureRadius, Math.sin(angle) * apertureRadius];
  };

  const first = outerPoint(0);
  shape.moveTo(first[0], first[1]);
  for (let index = 1; index <= segments; index += 1) {
    const point = outerPoint(index);
    shape.lineTo(point[0], point[1]);
  }
  for (let index = 0; index <= segments; index += 1) {
    const point = innerPoint(index);
    shape.lineTo(point[0], point[1]);
  }
  shape.closePath();
  return shape;
}

function createArcTube(THREE, resources, radius, side, tubeRadius, z = 0.36) {
  const points = [];
  const segments = 48;
  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const angle =
      side === "left"
        ? Math.PI / 2 + Math.PI * progress
        : Math.PI / 2 - Math.PI * progress;
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        z,
      ),
    );
  }
  return resources.geometry(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      segments,
      tubeRadius,
      8,
      false,
    ),
  );
}

function createArcGrooves(THREE, resources, radii, side) {
  const positions = [];
  const segments = 64;
  radii.forEach((radius) => {
    for (let index = 0; index < segments; index += 1) {
      [index, index + 1].forEach((pointIndex) => {
        const progress = pointIndex / segments;
        const angle =
          side === "left"
            ? Math.PI / 2 + Math.PI * progress
            : Math.PI / 2 - Math.PI * progress;
        positions.push(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          shellSurfaceZ(radius) + 0.012,
        );
      });
    }
  });
  const geometry = resources.geometry(new THREE.BufferGeometry());
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  return geometry;
}

function createShellSeam(THREE, resources, material, side) {
  const segments = 24;
  const ranges = [
    [0.92, 2.52],
    [-2.52, -0.92],
  ];
  const segmentPairs = [];
  ranges.forEach(([from, to]) => {
    for (let index = 0; index < segments; index += 1) {
      const startY = mix(from, to, index / segments);
      const endY = mix(from, to, (index + 1) / segments);
      const x = side === "left" ? -0.018 : 0.018;
      segmentPairs.push([
        new THREE.Vector3(
          x,
          startY,
          shellSurfaceZ(Math.abs(startY)) + 0.04,
        ),
        new THREE.Vector3(
          x,
          endY,
          shellSurfaceZ(Math.abs(endY)) + 0.04,
        ),
      ]);
    }
  });
  const geometry = resources.geometry(
    new THREE.CylinderGeometry(0.028, 0.028, 1, 8),
  );
  const seam = new THREE.InstancedMesh(geometry, material, segmentPairs.length);
  const matrix = new THREE.Matrix4();
  const midpoint = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);
  segmentPairs.forEach(([start, end], index) => {
    midpoint.copy(start).add(end).multiplyScalar(0.5);
    direction.copy(end).sub(start);
    quaternion.setFromUnitVectors(yAxis, direction.clone().normalize());
    scale.set(1, direction.length() * 1.08, 1);
    matrix.compose(midpoint, quaternion, scale);
    seam.setMatrixAt(index, matrix);
  });
  seam.instanceMatrix.needsUpdate = true;
  return seam;
}

function shellSurfaceZ(radius, outerRadius = 2.55) {
  return 0.46 + Math.sqrt(Math.max(0, outerRadius ** 2 - radius ** 2)) * 0.4;
}

function createCurvedShellSurface(
  THREE,
  resources,
  side,
  outerRadius = 2.55,
  apertureRadius = 0.9,
) {
  const geometry = resources.geometry(new THREE.PlaneGeometry(1, 1, 96, 28));
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index);
    const angleProgress = vertex.x + 0.5;
    const radialProgress = 0.5 - vertex.y;
    const angle =
      side === "left"
        ? Math.PI / 2 + Math.PI * angleProgress
        : Math.PI / 2 - Math.PI * angleProgress;
    const radius = mix(apertureRadius, outerRadius, radialProgress);
    positions.setXYZ(
      index,
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      shellSurfaceZ(radius, outerRadius),
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

function createShells(THREE, resources, materials) {
  const shellOptions = {
    depth: 1.02,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.09,
    bevelThickness: 0.18,
    curveSegments: 48,
  };

  const left = new THREE.Group();
  const leftGeometry = resources.geometry(
    new THREE.ExtrudeGeometry(halfAnnulusShape(THREE, "left"), shellOptions),
  );
  leftGeometry.translate(0, 0, -shellOptions.depth / 2);
  const leftFace = new THREE.Mesh(leftGeometry, materials.shellSilver);
  leftFace.castShadow = true;
  left.add(leftFace);

  const leftSurface = new THREE.Mesh(
    createCurvedShellSurface(THREE, resources, "left"),
    materials.shellSilver,
  );
  leftSurface.castShadow = false;
  left.add(leftSurface);

  const leftOuter = new THREE.Mesh(
    createArcTube(
      THREE,
      resources,
      2.55,
      "left",
      0.035,
      shellSurfaceZ(2.55) + 0.015,
    ),
    materials.polishedSilver,
  );
  const leftInner = new THREE.Mesh(
    createArcTube(
      THREE,
      resources,
      0.9,
      "left",
      0.026,
      shellSurfaceZ(0.9) + 0.015,
    ),
    materials.polishedBrass,
  );
  const leftGrooves = new THREE.LineSegments(
    createArcGrooves(
      THREE,
      resources,
      [1.16, 1.4, 1.64, 1.88, 2.12, 2.34],
      "left",
    ),
    materials.groove,
  );
  const leftMicroGrooves = new THREE.LineSegments(
    createArcGrooves(
      THREE,
      resources,
      Array.from({ length: 28 }, (_, index) => 1.02 + index * 0.052),
      "left",
    ),
    materials.microGroove,
  );
  const leftSeam = createShellSeam(
    THREE,
    resources,
    materials.polishedSilver,
    "left",
  );
  left.add(leftOuter, leftInner, leftGrooves, leftMicroGrooves, leftSeam);

  const shellHubGeometry = resources.geometry(
    new THREE.CylinderGeometry(0.14, 0.14, 0.34, 20),
  );
  shellHubGeometry.rotateZ(Math.PI / 2);
  const leftHub = new THREE.Mesh(shellHubGeometry, materials.polishedBrass);
  leftHub.position.z = 0.34;
  leftHub.castShadow = true;
  left.add(leftHub);

  const right = new THREE.Group();
  const rightGeometry = resources.geometry(
    new THREE.ExtrudeGeometry(halfAnnulusShape(THREE, "right"), shellOptions),
  );
  rightGeometry.translate(0, 0, -shellOptions.depth / 2);
  const rightBacking = new THREE.Mesh(rightGeometry, materials.darkBrass);
  rightBacking.castShadow = false;
  right.add(rightBacking);

  const rightSurface = new THREE.Mesh(
    createCurvedShellSurface(THREE, resources, "right"),
    materials.latticeBacking,
  );
  rightSurface.castShadow = false;
  right.add(rightSurface);

  const rightOuter = new THREE.Mesh(
    createArcTube(
      THREE,
      resources,
      2.55,
      "right",
      0.046,
      shellSurfaceZ(2.55) + 0.015,
    ),
    materials.polishedBrass,
  );
  const rightInner = new THREE.Mesh(
    createArcTube(
      THREE,
      resources,
      0.9,
      "right",
      0.032,
      shellSurfaceZ(0.9) + 0.015,
    ),
    materials.polishedBrass,
  );
  const rightHub = new THREE.Mesh(shellHubGeometry, materials.polishedBrass);
  rightHub.position.z = 0.34;
  rightHub.castShadow = true;
  const rightSeam = createShellSeam(
    THREE,
    resources,
    materials.latticeRim,
    "right",
  );
  right.add(rightOuter, rightInner, rightHub, rightSeam);

  const poreGeometry = resources.geometry(
    new THREE.TorusGeometry(0.15, 0.022, 8, 24),
  );
  const porePositions = [];
  for (let row = 0; row < 11; row += 1) {
    const y = -2.16 + row * 0.43;
    for (let column = 0; column < 7; column += 1) {
      const x = 0.17 + column * 0.36 + (row % 2) * 0.15;
      const distance = Math.hypot(x, y);
      if (distance < 2.42 && distance > 1.03) {
        porePositions.push([x, y, distance]);
      }
    }
  }
  const pores = new THREE.InstancedMesh(
    poreGeometry,
    materials.latticeRim,
    porePositions.length,
  );
  const tunnelGeometry = resources.geometry(
    new THREE.CylinderGeometry(0.126, 0.126, 0.14, 24, 1, true),
  );
  tunnelGeometry.rotateX(Math.PI / 2);
  const tunnels = new THREE.InstancedMesh(
    tunnelGeometry,
    materials.darkBrass,
    porePositions.length,
  );
  const cavityGeometry = resources.geometry(new THREE.CircleGeometry(0.126, 24));
  const cavities = new THREE.InstancedMesh(
    cavityGeometry,
    materials.cavity,
    porePositions.length,
  );
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const frontAxis = new THREE.Vector3(0, 0, 1);
  const normal = new THREE.Vector3();
  porePositions.forEach(([x, y, distance], index) => {
    const size =
      0.92 +
      0.3 * Math.sin(index * 1.91) +
      0.12 * Math.cos(index * 0.73);
    const stretchX = 0.88 + 0.1 * Math.sin(index * 1.17);
    const stretchY = 0.94 + 0.12 * Math.cos(index * 1.43);
    const sphereDepth = Math.sqrt(Math.max(0, 2.55 ** 2 - distance ** 2));
    normal.set(x * 0.4, y * 0.4, sphereDepth).normalize();
    quaternion.setFromUnitVectors(frontAxis, normal);
    scale.set(size * stretchX, size * stretchY, 1);
    position.set(x, y, shellSurfaceZ(distance) + 0.16);
    matrix.compose(position, quaternion, scale);
    pores.setMatrixAt(index, matrix);
    position.set(x, y, shellSurfaceZ(distance) + 0.09);
    matrix.compose(position, quaternion, scale);
    tunnels.setMatrixAt(index, matrix);
    position.set(x, y, shellSurfaceZ(distance) + 0.025);
    matrix.compose(position, quaternion, scale);
    cavities.setMatrixAt(index, matrix);
  });
  pores.instanceMatrix.needsUpdate = true;
  tunnels.instanceMatrix.needsUpdate = true;
  cavities.instanceMatrix.needsUpdate = true;
  right.add(cavities, tunnels, pores);

  return { left, right, leftGrooves, leftMicroGrooves };
}

function annulusShape(THREE, outerRadius, innerRadius) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

function annulusSegmentShape(THREE, outerRadius, innerRadius, startAngle, endAngle) {
  const shape = new THREE.Shape();
  const segments = 48;
  for (let index = 0; index <= segments; index += 1) {
    const angle = mix(startAngle, endAngle, index / segments);
    const x = Math.cos(angle) * outerRadius;
    const y = Math.sin(angle) * outerRadius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let index = segments; index >= 0; index -= 1) {
    const angle = mix(startAngle, endAngle, index / segments);
    shape.lineTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
  }
  shape.closePath();
  return shape;
}

function createInlaidLabel(THREE, resources, material, layout) {
  const height = layout.bandWidth * 0.48 * (layout.labelScale ?? 1);
  const letterWidth = height * 0.58;
  const letterGap = height * 0.34;
  const totalWidth =
    layout.label.length * letterWidth + (layout.label.length - 1) * letterGap;
  const strokes = Array.from(layout.label).flatMap((character, characterIndex) => {
    const xOffset = characterIndex * (letterWidth + letterGap) - totalWidth / 2;
    return GLYPHS[character].map(([start, end]) => ({
      start: [xOffset + start[0] * letterWidth, (start[1] - 0.5) * height],
      end: [xOffset + end[0] * letterWidth, (end[1] - 0.5) * height],
    }));
  });
  const strokeGeometry = resources.geometry(
    new THREE.BoxGeometry(1, Math.max(0.009, height * 0.085), 0.008),
  );
  const label = new THREE.InstancedMesh(strokeGeometry, material, strokes.length);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const zAxis = new THREE.Vector3(0, 0, 1);
  strokes.forEach(({ start, end }, index) => {
    const x = end[0] - start[0];
    const y = end[1] - start[1];
    position.set((start[0] + end[0]) / 2, (start[1] + end[1]) / 2, 0);
    quaternion.setFromAxisAngle(zAxis, Math.atan2(y, x));
    scale.set(Math.hypot(x, y), 1, 1);
    matrix.compose(position, quaternion, scale);
    label.setMatrixAt(index, matrix);
  });
  label.instanceMatrix.needsUpdate = true;
  label.name = "ring-label";

  const group = new THREE.Group();
  group.position.set(
    Math.cos(layout.labelAngle),
    Math.sin(layout.labelAngle),
    layout.bandDepth / 2 + RING_BEVEL_THICKNESS + RING_SURFACE_CLEARANCE,
  );
  let textRotation = layout.labelAngle - Math.PI / 2;
  while (textRotation > Math.PI / 2) textRotation -= Math.PI;
  while (textRotation < -Math.PI / 2) textRotation += Math.PI;
  group.rotation.z = textRotation;
  group.add(label);
  return group;
}

function createRing(THREE, resources, materials, layout) {
  const group = new THREE.Group();
  const outerRadius = 1 + layout.bandWidth / 2;
  const innerRadius = 1 - layout.bandWidth / 2;
  const bandOptions = {
    depth: layout.bandDepth,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.022,
    bevelThickness: RING_BEVEL_THICKNESS,
    curveSegments: 96,
  };
  const bandShapes =
    layout.name === "world"
      ? [
          annulusSegmentShape(THREE, outerRadius, innerRadius, 0.24, 2.9),
          annulusSegmentShape(THREE, outerRadius, innerRadius, 3.38, 6.04),
        ]
      : [annulusShape(THREE, outerRadius, innerRadius)];
  bandShapes.forEach((shape) => {
    const ringGeometry = resources.geometry(new THREE.ExtrudeGeometry(shape, bandOptions));
    ringGeometry.translate(0, 0, -layout.bandDepth / 2);
    const ring = new THREE.Mesh(ringGeometry, [
      materials[layout.material],
      materials[layout.sideMaterial],
    ]);
    ring.castShadow = layout.name !== "axiom";
    group.add(ring);
  });

  const markerCount =
    { axiom: 6, model: 10, system: 8, world: 8 }[layout.name];
  const markerGeometry = resources.geometry(
    new THREE.CylinderGeometry(0.024, 0.029, 0.018, 12),
  );
  markerGeometry.rotateX(Math.PI / 2);
  const markers = new THREE.InstancedMesh(
    markerGeometry,
    materials[
      {
        axiom: "darkBrass",
        model: "polishedSilver",
        system: "polishedGraphite",
        world: "polishedGraphite",
      }[layout.name]
    ],
    markerCount,
  );
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const zAxis = new THREE.Vector3(0, 0, 1);
  for (let index = 0; index < markerCount; index += 1) {
    const angle = (index / markerCount) * Math.PI * 2;
    const labelDistance = Math.acos(Math.cos(angle - layout.labelAngle));
    position.set(
      Math.cos(angle),
      Math.sin(angle),
      labelDistance < 0.34
        ? -0.4
        : layout.bandDepth / 2 +
          RING_BEVEL_THICKNESS +
          RING_SURFACE_CLEARANCE,
    );
    quaternion.setFromAxisAngle(zAxis, angle);
    matrix.compose(position, quaternion, scale);
    markers.setMatrixAt(index, matrix);
  }
  markers.instanceMatrix.needsUpdate = true;
  group.add(
    markers,
    createInlaidLabel(
      THREE,
      resources,
      materials[layout.inlayMaterial],
      layout,
    ),
  );

  if (layout.name === "world") {
    const clampAngles = [0.24, 2.9, 3.38, 6.04];
    const clampGeometry = resources.geometry(
      new THREE.BoxGeometry(0.12, 0.22, 0.12),
    );
    const clamps = new THREE.InstancedMesh(clampGeometry, materials.warmSteel, 4);
    const clampPinGeometry = resources.geometry(
      new THREE.CylinderGeometry(0.026, 0.026, 0.14, 10),
    );
    clampPinGeometry.rotateX(Math.PI / 2);
    const clampPins = new THREE.InstancedMesh(
      clampPinGeometry,
      materials.darkBrass,
      4,
    );
    clampAngles.forEach((angle, index) => {
      position.set(
        Math.cos(angle),
        Math.sin(angle),
        layout.bandDepth / 2 +
          RING_BEVEL_THICKNESS +
          RING_SURFACE_CLEARANCE,
      );
      quaternion.setFromAxisAngle(zAxis, angle);
      matrix.compose(position, quaternion, scale);
      clamps.setMatrixAt(index, matrix);
      position.z += 0.075;
      matrix.compose(position, quaternion, scale);
      clampPins.setMatrixAt(index, matrix);
    });
    clamps.instanceMatrix.needsUpdate = true;
    clampPins.instanceMatrix.needsUpdate = true;
    group.add(clamps, clampPins);
  }
  return group;
}

function createStone(THREE, resources, materials) {
  const geometry = resources.geometry(new THREE.SphereGeometry(0.64, 32, 20));
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  const color = new THREE.Color();
  const colors = [];
  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index);
    const radius =
      0.96 +
      Math.sin(vertex.x * 12.4 + vertex.y * 4.1) * 0.082 +
      Math.cos(vertex.z * 15.2 - vertex.x * 3.8) * 0.058;
    const shade =
      0.9 +
      Math.sin(vertex.x * 7.1 - vertex.z * 5.3) * 0.08 +
      Math.cos(vertex.y * 9.4 + vertex.x * 2.7) * 0.05;
    vertex.normalize().multiplyScalar(0.64 * radius);
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
    color.setScalar(shade);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const stone = new THREE.Mesh(geometry, materials.stone);
  stone.rotation.set(0.28, -0.46, 0.12);
  stone.castShadow = true;
  return stone;
}

function createArmillary(THREE, resources, materials) {
  const root = new THREE.Group();
  const shells = createShells(THREE, resources, materials);
  root.add(shells.left, shells.right);

  const rings = Object.fromEntries(
    RING_LAYOUT.map((layout) => {
      const ring = createRing(THREE, resources, materials, layout);
      ring.position.z = 0.18;
      root.add(ring);
      return [layout.name, ring];
    }),
  );

  const shaftGeometry = resources.geometry(
    new THREE.CylinderGeometry(0.045, 0.045, 6.8, 16),
  );
  shaftGeometry.rotateZ(Math.PI / 2);
  const shaft = new THREE.Mesh(shaftGeometry, materials.satinSilverEdge);
  shaft.position.z = 0.3;
  shaft.castShadow = false;
  const shaftAssembly = new THREE.Group();
  shaftAssembly.add(shaft);
  root.add(shaftAssembly);

  const hubGeometry = resources.geometry(
    new THREE.CylinderGeometry(0.09, 0.09, 0.34, 16),
  );
  hubGeometry.rotateZ(Math.PI / 2);
  const hubPositions = [-2.71, -1.32, -1.02, -0.72, 0.72, 1.02, 1.32, 2.71];
  const hubs = new THREE.InstancedMesh(
    hubGeometry,
    materials.polishedBrass,
    hubPositions.length,
  );
  const matrix = new THREE.Matrix4();
  hubPositions.forEach((x, index) => {
    matrix.makeTranslation(x, 0, 0.3);
    hubs.setMatrixAt(index, matrix);
  });
  hubs.instanceMatrix.needsUpdate = true;
  shaftAssembly.add(hubs);

  const bearing = new THREE.Group();
  root.add(bearing);

  const bearingFaceGeometry = resources.geometry(
    new THREE.ExtrudeGeometry(annulusShape(THREE, 0.9, 0.75), {
      depth: 0.16,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.022,
      bevelThickness: 0.026,
      curveSegments: 72,
    }),
  );
  bearingFaceGeometry.translate(0, 0, -0.08);
  const bearingFace = new THREE.Mesh(bearingFaceGeometry, materials.bearingSteel);
  bearingFace.position.z = 0.43;
  bearingFace.castShadow = false;
  bearing.add(bearingFace);

  const bearingDarkFaceGeometry = resources.geometry(
    new THREE.ExtrudeGeometry(annulusShape(THREE, 0.76, 0.53), {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.015,
      bevelThickness: 0.02,
      curveSegments: 72,
    }),
  );
  bearingDarkFaceGeometry.translate(0, 0, -0.06);
  const bearingDarkFace = new THREE.Mesh(
    bearingDarkFaceGeometry,
    materials.polishedGraphite,
  );
  bearingDarkFace.position.z = 0.47;
  bearingDarkFace.castShadow = false;
  bearing.add(bearingDarkFace);

  const aperture = new THREE.Mesh(
    resources.geometry(new THREE.TorusGeometry(0.88, 0.035, 8, 72)),
    materials.polishedSilver,
  );
  aperture.position.z = 0.5;
  bearing.add(aperture);

  const bearingRace = new THREE.Mesh(
    resources.geometry(new THREE.TorusGeometry(0.74, 0.034, 8, 72)),
    materials.polishedBrass,
  );
  bearingRace.position.z = 0.52;
  bearing.add(bearingRace);

  const bearingInnerRace = new THREE.Mesh(
    resources.geometry(new THREE.TorusGeometry(0.61, 0.025, 8, 72)),
    materials.polishedGraphite,
  );
  bearingInnerRace.position.z = 0.58;
  bearing.add(bearingInnerRace);

  const tickGeometry = resources.geometry(
    new THREE.BoxGeometry(0.026, 0.105, 0.018),
  );
  const bearingTicks = new THREE.InstancedMesh(
    tickGeometry,
    materials.polishedBrass,
    20,
  );
  const tickPosition = new THREE.Vector3();
  const tickQuaternion = new THREE.Quaternion();
  const tickScale = new THREE.Vector3(1, 1, 1);
  const tickAxis = new THREE.Vector3(0, 0, 1);
  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * Math.PI * 2;
    tickPosition.set(Math.cos(angle) * 0.67, Math.sin(angle) * 0.67, 0.57);
    tickQuaternion.setFromAxisAngle(tickAxis, angle);
    matrix.compose(tickPosition, tickQuaternion, tickScale);
    bearingTicks.setMatrixAt(index, matrix);
  }
  [
    [0, 0.53, 0],
    [0, -0.53, 0],
    [0.53, 0, Math.PI / 2],
    [-0.53, 0, Math.PI / 2],
  ].forEach(([x, y, rotation], offset) => {
    tickPosition.set(x, y, 0.585);
    tickQuaternion.setFromAxisAngle(tickAxis, rotation);
    tickScale.set(1.5, 3.35, 1.5);
    matrix.compose(tickPosition, tickQuaternion, tickScale);
    bearingTicks.setMatrixAt(16 + offset, matrix);
  });
  bearingTicks.instanceMatrix.needsUpdate = true;
  bearing.add(bearingTicks);

  const bearingBallGeometry = resources.geometry(
    new THREE.SphereGeometry(0.045, 12, 10),
  );
  const bearingBalls = new THREE.InstancedMesh(
    bearingBallGeometry,
    materials.polishedBrass,
    12,
  );
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    matrix.makeTranslation(Math.cos(angle) * 0.79, Math.sin(angle) * 0.79, 0.55);
    bearingBalls.setMatrixAt(index, matrix);
  }
  bearingBalls.instanceMatrix.needsUpdate = true;
  bearing.add(bearingBalls);

  const stone = createStone(THREE, resources, materials);
  stone.position.z = 0.67;
  bearing.add(stone);

  root.traverse((object) => {
    if (object.isMesh) object.receiveShadow = true;
  });

  return { root, rings, shells, shaft, shaftAssembly, bearing, stone };
}

function applyProgress(runtime, rawProgress) {
  const progress = smootherstep(rawProgress);
  const mobileExpansion = runtime.isMobile ? 0.76 : 1;
  const shellTravel = runtime.isMobile ? 2.75 : 4.15;

  runtime.armillary.shells.left.position.x = -shellTravel * progress;
  runtime.armillary.shells.right.position.x = shellTravel * progress;
  runtime.armillary.shells.left.scale.set(
    mix(runtime.isMobile ? 1.04 : 1.08, 1, progress),
    1,
    1,
  );
  runtime.armillary.shells.left.rotation.set(
    0,
    mix(0, 0.16, progress),
    mix(0, 0.035, progress),
  );
  runtime.armillary.shells.right.rotation.set(
    0,
    mix(0, -0.15, progress),
    mix(0, -0.035, progress),
  );

  RING_LAYOUT.forEach((layout) => {
    const ring = runtime.armillary.rings[layout.name];
    const expandedScale = layout.expandedScale * mobileExpansion;
    ring.scale.setScalar(mix(layout.closedScale, expandedScale, progress));
    ring.rotation.set(
      mix(0, layout.rotation[0], progress),
      mix(0, layout.rotation[1], progress),
      mix(0, layout.rotation[2], progress),
    );
  });

  runtime.armillary.shaft.scale.x = mix(
    0.78,
    runtime.isMobile ? 1.03 : 1.42,
    progress,
  );
  runtime.armillary.shaftAssembly.scale.x = mix(
    runtime.isMobile ? 0.34 : 0.28,
    1,
    progress,
  );
  runtime.armillary.shaftAssembly.position.z = mix(
    runtime.isMobile ? 0.92 : 1.3,
    0,
    progress,
  );
  runtime.armillary.shaftAssembly.position.x = mix(
    runtime.isMobile ? 0.1 : 0.22,
    0,
    progress,
  );
  runtime.armillary.bearing.scale.setScalar(
    mix(runtime.isMobile ? 1.1 : 1.2, 1, progress),
  );
  runtime.armillary.bearing.position.z = mix(
    runtime.isMobile ? 0.68 : 1.02,
    0,
    progress,
  );
  runtime.armillary.bearing.position.x = mix(
    runtime.isMobile ? 0.1 : 0.22,
    0,
    progress,
  );
  runtime.armillary.shells.leftGrooves.material.opacity = mix(
    0.12,
    0.18,
    progress,
  );
  runtime.armillary.shells.leftMicroGrooves.material.opacity = mix(
    0.07,
    0.04,
    progress,
  );
  runtime.armillary.stone.scale.setScalar(mix(0.9, 1, progress));
  runtime.armillary.stone.rotation.y = mix(-0.46, 0.72, progress);
  runtime.armillary.stone.rotation.z = mix(0.12, -0.2, progress);
  runtime.armillary.root.scale.setScalar(
    runtime.isMobile ? mix(0.94, 0.66, progress) : mix(1.2, 1.1, progress),
  );
  runtime.armillary.root.position.set(
    runtime.isMobile ? 0 : mix(0.47, -0.18, progress),
    runtime.isMobile ? mix(0.15, 0.05, progress) : mix(0.4, 0.05, progress),
    0,
  );
  runtime.shadowPlane.position.y = runtime.isMobile
    ? mix(-2.75, -2.65, progress)
    : mix(-4.32, -5.05, progress);
  runtime.shadowPlane.scale.set(
    mix(0.9, 1.45, progress),
    mix(1, 1.12, progress),
    1,
  );
}

function render(runtime) {
  runtime.renderer.render(runtime.scene, runtime.camera);
}

function applyPose(runtime, pose) {
  applyProgress(runtime, pose.progress);
  runtime.armillary.root.rotation.set(
    (pose.tiltX * Math.PI) / 180,
    (pose.tiltY * Math.PI) / 180,
    0,
  );
}

const ArmillaryStage = forwardRef(function ArmillaryStage({ onError, onReady }, ref) {
  const canvasRef = useRef(null);
  const runtimeRef = useRef(null);
  const callbacksRef = useRef({ onError, onReady });
  const poseRef = useRef({ progress: 0, tiltX: 0, tiltY: 0 });
  callbacksRef.current = { onError, onReady };

  useImperativeHandle(ref, () => ({
    setPose(progress, tiltX, tiltY) {
      poseRef.current = { progress: clamp(progress), tiltX, tiltY };
      const runtime = runtimeRef.current;
      if (!runtime) return;
      applyPose(runtime, poseRef.current);
      render(runtime);
    },
  }));

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    async function setup() {
      try {
        const THREE = await import("three");
        const { RoomEnvironment } = await import(
          "three/addons/environments/RoomEnvironment.js"
        );
        const { RectAreaLightUniformsLib } = await import(
          "three/addons/lights/RectAreaLightUniformsLib.js"
        );
        if (cancelled || !canvasRef.current) return;
        RectAreaLightUniformsLib.init();

        const renderer = new THREE.WebGLRenderer({
          canvas: canvasRef.current,
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.84;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.VSMShadowMap;

        const resources = createResources();
        const brushedTexture = createBrushedTexture(THREE, resources);
        const metalRoughnessTexture = createMetalRoughnessTexture(
          THREE,
          resources,
        );
        const stoneBumpTexture = createStoneBumpTexture(THREE, resources);
        const softShadowTexture = createSoftShadowTexture(THREE, resources);
        const materials = createMaterials(
          THREE,
          resources,
          brushedTexture,
          metalRoughnessTexture,
          stoneBumpTexture,
        );
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
        camera.position.set(2.5, 1.15, 13.8);
        camera.lookAt(0, -0.08, 0);

        const pmrem = new THREE.PMREMGenerator(renderer);
        const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = environment;

        const key = new THREE.DirectionalLight(0xffd7ae, 1.05);
        key.position.set(-0.6, 11, 4.5);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.bias = -0.0003;
        key.shadow.normalBias = 0.025;
        key.shadow.radius = 5;
        key.shadow.blurSamples = 8;
        key.shadow.camera.left = -8.2;
        key.shadow.camera.right = 8.2;
        key.shadow.camera.top = 6.5;
        key.shadow.camera.bottom = -6.5;
        scene.add(key);

        const keySoftbox = new THREE.RectAreaLight(0xffd6ae, 3, 6, 4.5);
        keySoftbox.position.set(-4.5, 5.5, 7.5);
        keySoftbox.lookAt(0, 0.1, 0);
        scene.add(keySoftbox);

        const rim = new THREE.DirectionalLight(0xffd8b0, 0.48);
        rim.position.set(7, 3, 9);
        scene.add(rim);
        const cameraStrip = new THREE.RectAreaLight(0xffdfc4, 1.6, 7, 6);
        cameraStrip.position.set(0.5, 3, 10);
        cameraStrip.lookAt(0, -0.2, 0);
        scene.add(cameraStrip);

        const lowerFill = new THREE.DirectionalLight(0xb77a35, 0.22);
        lowerFill.position.set(-2, -6, 5);
        scene.add(lowerFill);
        scene.add(new THREE.HemisphereLight(0xfff4df, 0x3e2c1d, 0.18));
        scene.add(new THREE.AmbientLight(0xffead0, 0.01));

        const armillary = createArmillary(THREE, resources, materials);
        scene.add(armillary.root);

        const shadowPlane = new THREE.Mesh(
          resources.geometry(new THREE.PlaneGeometry(8.5, 8)),
          resources.material(
            new THREE.MeshBasicMaterial({
              map: softShadowTexture,
              transparent: true,
              depthWrite: false,
              toneMapped: false,
            }),
          ),
        );
        shadowPlane.position.set(0, -4.32, 0.1);
        shadowPlane.rotation.x = -Math.PI / 2;
        scene.add(shadowPlane);

        const runtime = {
          renderer,
          scene,
          camera,
          armillary,
          shadowPlane,
          resources,
          environment,
          pmrem,
          resizeObserver: null,
          isMobile: false,
        };
        runtimeRef.current = runtime;

        const resize = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const width = canvas.clientWidth;
          const height = canvas.clientHeight;
          if (!width || !height) return;

          runtime.isMobile = window.innerWidth <= 950;
          const lowDpr = window.innerWidth <= 640;
          const pixelRatioLimit = lowDpr ? 1.5 : 2;
          const devicePixelRatio = window.devicePixelRatio || 1;
          renderer.setPixelRatio(
            lowDpr
              ? Math.min(devicePixelRatio, pixelRatioLimit)
              : Math.min(Math.max(devicePixelRatio, 1.5), pixelRatioLimit),
          );
          renderer.setSize(width, height, false);

          const viewWidth = runtime.isMobile ? MOBILE_VIEW_WIDTH : DESKTOP_VIEW_WIDTH;
          const viewHeight = viewWidth / (width / height);
          camera.left = -viewWidth / 2;
          camera.right = viewWidth / 2;
          camera.top = viewHeight / 2;
          camera.bottom = -viewHeight / 2;
          camera.updateProjectionMatrix();
          applyPose(runtime, poseRef.current);
          render(runtime);
        };

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvasRef.current);
        runtime.resizeObserver = resizeObserver;
        resize();
        callbacksRef.current.onReady?.();

        cleanup = () => {
          runtime.resizeObserver?.disconnect();
          runtime.resources.geometries.forEach((value) => value.dispose());
          runtime.resources.materials.forEach((value) => value.dispose());
          runtime.resources.textures.forEach((value) => value.dispose());
          runtime.environment.dispose();
          runtime.pmrem.dispose();
          runtime.renderer.dispose();
          runtime.renderer.forceContextLoss?.();
          runtimeRef.current = null;
        };
      } catch (error) {
        if (!cancelled) {
          console.error("World Compiler render failed", error);
          callbacksRef.current.onError?.(error);
        }
      }
    }

    setup();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return <canvas className="armillary-canvas" ref={canvasRef} aria-hidden="true" />;
});

export default ArmillaryStage;
