import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const DESKTOP_VIEW_WIDTH = 13.4;
const MOBILE_VIEW_WIDTH = 7.6;

const RING_LAYOUT = [
  {
    name: "axiom",
    label: "AXIOM",
    closedScale: 1.08,
    expandedScale: 1.8,
    rotation: [0.35, -0.72, -0.62],
    labelAngle: 1.9,
    bandWidth: 0.13,
    bandDepth: 0.1,
    material: "brightSilver",
    inlayMaterial: "enamel",
    labelScale: 1.35,
  },
  {
    name: "model",
    label: "MODEL",
    closedScale: 1.34,
    expandedScale: 2.45,
    rotation: [-0.32, 0.58, 0.28],
    labelAngle: 2.2,
    bandWidth: 0.2,
    bandDepth: 0.15,
    material: "graphite",
    inlayMaterial: "ivoryInlay",
  },
  {
    name: "system",
    label: "SYSTEM",
    closedScale: 1.59,
    expandedScale: 3,
    rotation: [0.5, -0.28, -0.08],
    labelAngle: 1.48,
    bandWidth: 0.17,
    bandDepth: 0.13,
    material: "brass",
    inlayMaterial: "enamel",
  },
  {
    name: "world",
    label: "WORLD",
    closedScale: 1.87,
    expandedScale: 4,
    rotation: [-0.17, 0.46, 0.12],
    labelAngle: 1.56,
    bandWidth: 0.15,
    bandDepth: 0.12,
    material: "silver",
    inlayMaterial: "enamel",
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
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  const image = context.createImageData(canvas.width, canvas.height);
  let seed = 74683;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < canvas.height; y += 1) {
    const grain = Math.sin(y * 1.83) * 12 + (random() - 0.5) * 22;
    for (let x = 0; x < canvas.width; x += 1) {
      const value = Math.round(128 + grain + (random() - 0.5) * 7);
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
  texture.repeat.set(2.4, 3.6);
  texture.anisotropy = 4;
  return texture;
}

function createMaterials(THREE, resources, brushedTexture) {
  return {
    silver: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0x817a71,
        metalness: 0.96,
        roughness: 0.34,
        clearcoat: 0.22,
        clearcoatRoughness: 0.24,
        anisotropy: 0.58,
        anisotropyRotation: Math.PI / 2,
        envMapIntensity: 1.34,
        bumpMap: brushedTexture,
        bumpScale: 0.008,
      }),
    ),
    brightSilver: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0xb5ada2,
        metalness: 0.94,
        roughness: 0.22,
        clearcoat: 0.38,
        anisotropy: 0.46,
        envMapIntensity: 1.44,
        bumpMap: brushedTexture,
        bumpScale: 0.006,
      }),
    ),
    brass: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0x89622f,
        metalness: 0.94,
        roughness: 0.28,
        clearcoat: 0.38,
        clearcoatRoughness: 0.18,
        anisotropy: 0.38,
        envMapIntensity: 1.38,
        bumpMap: brushedTexture,
        bumpScale: 0.007,
      }),
    ),
    brightBrass: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0xb88e46,
        metalness: 0.92,
        roughness: 0.18,
        clearcoat: 0.48,
        envMapIntensity: 1.4,
        bumpMap: brushedTexture,
        bumpScale: 0.005,
      }),
    ),
    darkBrass: resources.material(
      new THREE.MeshStandardMaterial({
        color: 0x60411f,
        metalness: 0.9,
        roughness: 0.3,
        envMapIntensity: 1.1,
      }),
    ),
    graphite: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0x2b2925,
        metalness: 0.86,
        roughness: 0.26,
        clearcoat: 0.18,
        envMapIntensity: 1.08,
      }),
    ),
    shellSilver: resources.material(
      new THREE.MeshStandardMaterial({
        color: 0x625e58,
        metalness: 0.7,
        roughness: 0.46,
        envMapIntensity: 0.62,
        bumpMap: brushedTexture,
        bumpScale: 0.018,
      }),
    ),
    enamel: resources.material(
      new THREE.MeshStandardMaterial({
        color: 0x171613,
        metalness: 0.24,
        roughness: 0.34,
      }),
    ),
    ivoryInlay: resources.material(
      new THREE.MeshPhysicalMaterial({
        color: 0xe1c987,
        metalness: 0.82,
        roughness: 0.24,
        clearcoat: 0.28,
        envMapIntensity: 1.1,
      }),
    ),
    cavity: resources.material(
      new THREE.MeshStandardMaterial({
        color: 0x24190e,
        metalness: 0.52,
        roughness: 0.62,
      }),
    ),
    groove: resources.material(
      new THREE.MeshStandardMaterial({
        color: 0x514d47,
        metalness: 0.5,
        roughness: 0.58,
        transparent: true,
        opacity: 0.28,
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
        color: 0x80602f,
        metalness: 0.92,
        roughness: 0.36,
        side: THREE.DoubleSide,
        envMapIntensity: 1.08,
      }),
    ),
    stone: resources.material(
      new THREE.MeshStandardMaterial({
        color: 0x554b3e,
        roughness: 0.96,
        metalness: 0.02,
        flatShading: false,
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

function createShells(THREE, resources, materials) {
  const shellOptions = {
    depth: 0.9,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.075,
    bevelThickness: 0.16,
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

  const leftOuter = new THREE.Mesh(
    createArcTube(THREE, resources, 2.55, "left", 0.035),
    materials.brightSilver,
  );
  const leftInner = new THREE.Mesh(
    createArcTube(THREE, resources, 0.9, "left", 0.026),
    materials.brightBrass,
  );
  const leftGrooves = [1.16, 1.4, 1.64, 1.88, 2.12, 2.34].map(
    (radius) =>
      new THREE.Mesh(
        createArcTube(THREE, resources, radius, "left", 0.01, 0.625),
        materials.groove,
      ),
  );
  left.add(leftOuter, leftInner, ...leftGrooves);

  const shellHubGeometry = resources.geometry(
    new THREE.CylinderGeometry(0.14, 0.14, 0.34, 20),
  );
  shellHubGeometry.rotateZ(Math.PI / 2);
  const leftHub = new THREE.Mesh(shellHubGeometry, materials.brass);
  leftHub.position.z = 0.34;
  leftHub.castShadow = true;
  left.add(leftHub);

  const right = new THREE.Group();
  const rightGeometry = resources.geometry(
    new THREE.ExtrudeGeometry(halfAnnulusShape(THREE, "right"), shellOptions),
  );
  rightGeometry.translate(0, 0, -shellOptions.depth / 2);
  const rightBacking = new THREE.Mesh(rightGeometry, materials.latticeBacking);
  right.add(rightBacking);

  const rightOuter = new THREE.Mesh(
    createArcTube(THREE, resources, 2.55, "right", 0.046),
    materials.brightBrass,
  );
  const rightInner = new THREE.Mesh(
    createArcTube(THREE, resources, 0.9, "right", 0.032),
    materials.brightBrass,
  );
  const rightHub = new THREE.Mesh(shellHubGeometry, materials.brass);
  rightHub.position.z = 0.34;
  rightHub.castShadow = true;
  right.add(rightOuter, rightInner, rightHub);

  const poreGeometry = resources.geometry(
    new THREE.TorusGeometry(0.16, 0.04, 7, 20),
  );
  const porePositions = [];
  for (let row = 0; row < 10; row += 1) {
    const y = -2.16 + row * 0.47;
    for (let column = 0; column < 6; column += 1) {
      const x = 0.2 + column * 0.43 + (row % 2) * 0.18;
      const distance = Math.hypot(x, y);
      if (distance < 2.42 && distance > 1.03) {
        porePositions.push([x, y, distance]);
      }
    }
  }
  const pores = new THREE.InstancedMesh(
    poreGeometry,
    materials.brightBrass,
    porePositions.length,
  );
  const cavityGeometry = resources.geometry(new THREE.CircleGeometry(0.16, 20));
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
    const size = 0.78 + 0.18 * Math.sin(index * 1.91);
    const sphereDepth = Math.sqrt(Math.max(0, 2.55 ** 2 - distance ** 2));
    position.set(x, y, 0.24 + sphereDepth * 0.42);
    normal.set(x, y, sphereDepth).normalize();
    quaternion.setFromUnitVectors(frontAxis, normal);
    scale.setScalar(size);
    matrix.compose(position, quaternion, scale);
    pores.setMatrixAt(index, matrix);
    position.addScaledVector(normal, -0.055);
    matrix.compose(position, quaternion, scale);
    cavities.setMatrixAt(index, matrix);
  });
  pores.instanceMatrix.needsUpdate = true;
  cavities.instanceMatrix.needsUpdate = true;
  pores.castShadow = true;
  right.add(cavities, pores);

  return { left, right };
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
    new THREE.BoxGeometry(1, Math.max(0.009, height * 0.085), 0.018),
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
    layout.bandDepth / 2 + 0.012,
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
      bevelSize: 0.012,
      bevelThickness: 0.018,
      curveSegments: 96,
  };
  const bandShapes =
    layout.name === "world"
      ? [
          annulusSegmentShape(THREE, outerRadius, innerRadius, 0.34, 2.82),
          annulusSegmentShape(THREE, outerRadius, innerRadius, 3.48, 5.94),
        ]
      : [annulusShape(THREE, outerRadius, innerRadius)];
  bandShapes.forEach((shape) => {
    const ringGeometry = resources.geometry(new THREE.ExtrudeGeometry(shape, bandOptions));
    ringGeometry.translate(0, 0, -layout.bandDepth / 2);
    const ring = new THREE.Mesh(ringGeometry, materials[layout.material]);
    ring.castShadow = true;
    group.add(ring);
  });

  const edgeGeometry = resources.geometry(
    new THREE.TorusGeometry(outerRadius - 0.008, 0.009, 6, 96),
  );
  const outerEdge = new THREE.Mesh(
    edgeGeometry,
    layout.name === "model" ? materials.brightBrass : materials.brightSilver,
  );
  outerEdge.position.z = layout.bandDepth / 2 + 0.004;
  const innerEdge = new THREE.Mesh(
    resources.geometry(
      new THREE.TorusGeometry(innerRadius + 0.008, 0.008, 6, 96),
    ),
    layout.name === "system" ? materials.darkBrass : materials.brightBrass,
  );
  innerEdge.position.z = layout.bandDepth / 2 + 0.004;
  group.add(outerEdge, innerEdge);

  const markerCount = layout.name === "model" ? 14 : 10;
  const markerGeometry = resources.geometry(
    layout.name === "model"
      ? new THREE.CylinderGeometry(0.025, 0.025, 0.026, 10)
      : new THREE.CylinderGeometry(0.032, 0.032, 0.028, 12),
  );
  markerGeometry.rotateX(Math.PI / 2);
  const markers = new THREE.InstancedMesh(
    markerGeometry,
    layout.name === "axiom" ? materials.brass : materials.brightBrass,
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
      labelDistance < 0.34 ? -0.4 : layout.bandDepth / 2 + 0.022,
    );
    quaternion.setFromAxisAngle(zAxis, angle);
    matrix.compose(position, quaternion, scale);
    markers.setMatrixAt(index, matrix);
  }
  markers.instanceMatrix.needsUpdate = true;
  markers.castShadow = true;
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
    const clampGeometry = resources.geometry(new THREE.BoxGeometry(0.14, 0.24, 0.09));
    const clamps = new THREE.InstancedMesh(clampGeometry, materials.darkBrass, 4);
    [0.34, 2.82, 3.48, 5.94].forEach((angle, index) => {
      position.set(Math.cos(angle), Math.sin(angle), layout.bandDepth / 2 + 0.025);
      quaternion.setFromAxisAngle(zAxis, angle);
      matrix.compose(position, quaternion, scale);
      clamps.setMatrixAt(index, matrix);
    });
    clamps.instanceMatrix.needsUpdate = true;
    clamps.castShadow = true;
    group.add(clamps);
  }
  return group;
}

function createStone(THREE, resources, materials) {
  const geometry = resources.geometry(new THREE.IcosahedronGeometry(0.64, 4));
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index);
    const radius =
      0.9 +
      Math.sin(vertex.x * 12.4 + vertex.y * 4.1) * 0.045 +
      Math.cos(vertex.z * 15.2 - vertex.x * 3.8) * 0.035;
    vertex.normalize().multiplyScalar(0.64 * radius);
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
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
    new THREE.CylinderGeometry(0.032, 0.032, 6.8, 12),
  );
  shaftGeometry.rotateZ(Math.PI / 2);
  const shaft = new THREE.Mesh(shaftGeometry, materials.brightBrass);
  shaft.position.z = 0.3;
  shaft.castShadow = true;
  root.add(shaft);

  const hubGeometry = resources.geometry(
    new THREE.CylinderGeometry(0.09, 0.09, 0.34, 16),
  );
  hubGeometry.rotateZ(Math.PI / 2);
  const hubs = new THREE.InstancedMesh(hubGeometry, materials.brass, 4);
  const matrix = new THREE.Matrix4();
  [-1.16, -0.86, 0.86, 1.16].forEach((x, index) => {
    matrix.makeTranslation(x, 0, 0.3);
    hubs.setMatrixAt(index, matrix);
  });
  hubs.instanceMatrix.needsUpdate = true;
  root.add(hubs);

  const bearingFaceGeometry = resources.geometry(
    new THREE.ExtrudeGeometry(annulusShape(THREE, 0.88, 0.66), {
      depth: 0.1,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.014,
      bevelThickness: 0.018,
      curveSegments: 72,
    }),
  );
  bearingFaceGeometry.translate(0, 0, -0.05);
  const bearingFace = new THREE.Mesh(bearingFaceGeometry, materials.graphite);
  bearingFace.position.z = 0.43;
  bearingFace.castShadow = true;
  root.add(bearingFace);

  const aperture = new THREE.Mesh(
    resources.geometry(new THREE.TorusGeometry(0.86, 0.025, 8, 72)),
    materials.brightSilver,
  );
  aperture.position.z = 0.5;
  root.add(aperture);

  const bearingRace = new THREE.Mesh(
    resources.geometry(new THREE.TorusGeometry(0.72, 0.026, 8, 72)),
    materials.brightBrass,
  );
  bearingRace.position.z = 0.52;
  root.add(bearingRace);

  const bearingBallGeometry = resources.geometry(
    new THREE.SphereGeometry(0.045, 12, 10),
  );
  const bearingBalls = new THREE.InstancedMesh(
    bearingBallGeometry,
    materials.brightBrass,
    12,
  );
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    matrix.makeTranslation(Math.cos(angle) * 0.79, Math.sin(angle) * 0.79, 0.55);
    bearingBalls.setMatrixAt(index, matrix);
  }
  bearingBalls.instanceMatrix.needsUpdate = true;
  bearingBalls.castShadow = true;
  root.add(bearingBalls);

  const stone = createStone(THREE, resources, materials);
  stone.position.z = 0.67;
  root.add(stone);

  return { root, rings, shells, shaft, stone };
}

function applyProgress(runtime, rawProgress) {
  const progress = smootherstep(rawProgress);
  const mobileExpansion = runtime.isMobile ? 0.76 : 1;
  const shellTravel = runtime.isMobile ? 2.75 : 4.15;

  runtime.armillary.shells.left.position.x = -shellTravel * progress;
  runtime.armillary.shells.right.position.x = shellTravel * progress;
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

  runtime.armillary.shaft.scale.x = mix(0.68, runtime.isMobile ? 1.03 : 1.42, progress);
  runtime.armillary.stone.rotation.y = mix(-0.46, 0.72, progress);
  runtime.armillary.stone.rotation.z = mix(0.12, -0.2, progress);
  runtime.armillary.root.scale.setScalar(
    runtime.isMobile ? mix(0.94, 0.66, progress) : mix(1.14, 1, progress),
  );
  runtime.armillary.root.position.set(0, runtime.isMobile ? 0.15 : -0.2, 0);
}

function render(runtime) {
  runtime.renderer.render(runtime.scene, runtime.camera);
}

const ArmillaryStage = forwardRef(function ArmillaryStage({ onError, onReady }, ref) {
  const canvasRef = useRef(null);
  const runtimeRef = useRef(null);
  const callbacksRef = useRef({ onError, onReady });
  const progressRef = useRef(0);
  callbacksRef.current = { onError, onReady };

  useImperativeHandle(ref, () => ({
    setProgress(progress) {
      progressRef.current = clamp(progress);
      const runtime = runtimeRef.current;
      if (!runtime) return;
      applyProgress(runtime, progressRef.current);
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
        if (cancelled || !canvasRef.current) return;

        const renderer = new THREE.WebGLRenderer({
          canvas: canvasRef.current,
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.96;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;

        const resources = createResources();
        const brushedTexture = createBrushedTexture(THREE, resources);
        const materials = createMaterials(THREE, resources, brushedTexture);
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
        camera.position.set(2.5, 1.15, 13.8);
        camera.lookAt(0, -0.08, 0);

        const pmrem = new THREE.PMREMGenerator(renderer);
        const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = environment;

        const key = new THREE.DirectionalLight(0xffe8c0, 2.5);
        key.position.set(-5.5, 7.5, 9);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -9;
        key.shadow.camera.right = 9;
        key.shadow.camera.top = 7;
        key.shadow.camera.bottom = -7;
        scene.add(key);

        const rim = new THREE.DirectionalLight(0xffefd7, 1.65);
        rim.position.set(7, 3, 11);
        scene.add(rim);
        const lowerFill = new THREE.DirectionalLight(0xc99a55, 0.64);
        lowerFill.position.set(-2, -6, 5);
        scene.add(lowerFill);
        scene.add(new THREE.HemisphereLight(0xfff4df, 0x3e2c1d, 0.82));
        scene.add(new THREE.AmbientLight(0xffead0, 0.18));

        const armillary = createArmillary(THREE, resources, materials);
        scene.add(armillary.root);

        const shadowPlane = new THREE.Mesh(
          resources.geometry(new THREE.PlaneGeometry(17, 6)),
          resources.material(new THREE.ShadowMaterial({ opacity: 0.16 })),
        );
        shadowPlane.position.set(0, -3.02, 0.1);
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);

        const runtime = {
          renderer,
          scene,
          camera,
          armillary,
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

          runtime.isMobile = width < 640;
          const pixelRatioLimit = runtime.isMobile ? 1.5 : 2;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioLimit));
          renderer.setSize(width, height, false);

          const viewWidth = runtime.isMobile ? MOBILE_VIEW_WIDTH : DESKTOP_VIEW_WIDTH;
          const viewHeight = viewWidth / (width / height);
          camera.left = -viewWidth / 2;
          camera.right = viewWidth / 2;
          camera.top = viewHeight / 2;
          camera.bottom = -viewHeight / 2;
          camera.updateProjectionMatrix();
          applyProgress(runtime, progressRef.current);
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
