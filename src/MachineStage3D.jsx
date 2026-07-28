import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const VIEW_WIDTH = 936;
const VIEW_HEIGHT = 660;
const CAMERA_WIDTH = 15.5;
const CAMERA_HEIGHT = CAMERA_WIDTH * (VIEW_HEIGHT / VIEW_WIDTH);

const ASSEMBLY_LAYOUT = {
  input: {
    compactX: -2.3,
    expandedX: -5.05,
    compactScale: 0.68,
    expandedScale: 1,
  },
  rules: {
    compactX: -0.8,
    expandedX: -0.86,
    compactScale: 0.66,
    expandedScale: 1.12,
  },
  state: {
    compactX: 0.62,
    expandedX: 2.38,
    compactScale: 0.68,
    expandedScale: 1.15,
  },
  output: {
    compactX: 2.18,
    expandedX: 6.12,
    compactScale: 0.7,
    expandedScale: 1.15,
  },
};

const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(Math.max(value, minimum), maximum);

function smootherstep(value) {
  const progress = clamp(value);
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
}

function mix(from, to, progress) {
  return from + (to - from) * progress;
}

function vertexKey(vector) {
  return `${vector.x.toFixed(5)},${vector.y.toFixed(5)},${vector.z.toFixed(5)}`;
}

function createMaterials(THREE, resources) {
  const material = (value) => {
    resources.materials.add(value);
    return value;
  };

  return {
    brass: material(
      new THREE.MeshPhysicalMaterial({
        color: "#b78b43",
        metalness: 0.94,
        roughness: 0.24,
        clearcoat: 0.42,
        clearcoatRoughness: 0.2,
        envMapIntensity: 1.35,
      }),
    ),
    brightBrass: material(
      new THREE.MeshPhysicalMaterial({
        color: "#d5b16a",
        metalness: 0.91,
        roughness: 0.19,
        clearcoat: 0.5,
        clearcoatRoughness: 0.16,
        envMapIntensity: 1.45,
      }),
    ),
    darkBrass: material(
      new THREE.MeshStandardMaterial({
        color: "#6c4922",
        metalness: 0.92,
        roughness: 0.27,
        envMapIntensity: 1.25,
      }),
    ),
    steel: material(
      new THREE.MeshPhysicalMaterial({
        color: "#b7ad9c",
        metalness: 0.97,
        roughness: 0.18,
        clearcoat: 0.25,
        envMapIntensity: 1.25,
      }),
    ),
    glass: material(
      new THREE.MeshStandardMaterial({
        color: "#ead8ae",
        metalness: 0.12,
        roughness: 0.2,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        envMapIntensity: 0.9,
      }),
    ),
  };
}

function createBuilders(THREE, materials, resources) {
  const geometry = (value) => {
    resources.geometries.add(value);
    return value;
  };

  const cylinder = (
    radius,
    length,
    meshMaterial = materials.brass,
    radiusEnd = radius,
    segments = 48,
  ) => {
    const value = geometry(
      new THREE.CylinderGeometry(radius, radiusEnd, length, segments, 1, false),
    );
    value.rotateZ(Math.PI / 2);
    return new THREE.Mesh(value, meshMaterial);
  };

  const torus = (
    radius,
    tube,
    meshMaterial = materials.brass,
    radialSegments = 12,
    tubularSegments = 64,
  ) => {
    const value = geometry(
      new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments),
    );
    value.rotateY(Math.PI / 2);
    return new THREE.Mesh(value, meshMaterial);
  };

  const gear = (
    teeth,
    rootRadius,
    tipRadius,
    thickness,
    holeRadius,
    meshMaterial = materials.brass,
  ) => {
    const shape = new THREE.Shape();
    const radii = [
      rootRadius,
      rootRadius,
      (rootRadius + tipRadius) * 0.5,
      tipRadius,
      tipRadius,
      (rootRadius + tipRadius) * 0.5,
      rootRadius,
      rootRadius,
    ];
    for (let tooth = 0; tooth < teeth; tooth += 1) {
      for (let step = 0; step < radii.length; step += 1) {
        const angle = ((tooth + step / radii.length) / teeth) * Math.PI * 2;
        const x = Math.cos(angle) * radii[step];
        const y = Math.sin(angle) * radii[step];
        if (tooth === 0 && step === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
    }
    shape.closePath();
    if (holeRadius > 0) {
      const hole = new THREE.Path();
      hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
    const value = geometry(
      new THREE.ExtrudeGeometry(shape, {
        depth: thickness,
        bevelEnabled: true,
        bevelSize: 0.018,
        bevelThickness: 0.026,
        bevelSegments: 1,
        curveSegments: 24,
      }),
    );
    value.center();
    value.rotateY(Math.PI / 2);
    return new THREE.Mesh(value, meshMaterial);
  };

  const spokes = (
    radius,
    count,
    tangentialWidth,
    axialDepth,
    meshMaterial = materials.brass,
  ) => {
    const group = new THREE.Group();
    const value = geometry(
      new THREE.BoxGeometry(axialDepth, radius * 0.78, tangentialWidth, 2, 3, 2),
    );
    const quaternion = new THREE.Quaternion();
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3(1, 1, 1);
    const axis = new THREE.Vector3(1, 0, 0);
    const mesh = new THREE.InstancedMesh(value, meshMaterial, count);
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      position.set(
        0,
        Math.cos(angle) * radius * 0.42,
        Math.sin(angle) * radius * 0.42,
      );
      quaternion.setFromAxisAngle(axis, angle);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
    return group;
  };

  const boltRing = (
    radius,
    count,
    boltRadius,
    boltLength,
    meshMaterial = materials.brightBrass,
  ) => {
    const group = new THREE.Group();
    const value = geometry(
      new THREE.CylinderGeometry(boltRadius, boltRadius, boltLength, 12, 1),
    );
    value.rotateZ(Math.PI / 2);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const mesh = new THREE.InstancedMesh(value, meshMaterial, count);
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      position.set(0, Math.cos(angle) * radius, Math.sin(angle) * radius);
      matrix.makeTranslation(position.x, position.y, position.z);
      mesh.setMatrixAt(index, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
    return group;
  };

  const ticks = (
    radius,
    count,
    axialDepth,
    tickLength,
    meshMaterial = materials.darkBrass,
    tangentialWidth = 0.018,
  ) => {
    const group = new THREE.Group();
    const value = geometry(
      new THREE.BoxGeometry(axialDepth, tickLength, tangentialWidth, 1, 1, 1),
    );
    const quaternion = new THREE.Quaternion();
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3(1, 1, 1);
    const mesh = new THREE.InstancedMesh(value, meshMaterial, count);
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      position.set(0, Math.cos(angle) * radius, Math.sin(angle) * radius);
      quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
    return group;
  };

  return { boltRing, cylinder, gear, spokes, ticks, torus };
}

function createModel(THREE) {
  return { root: new THREE.Group(), rotors: [] };
}

function addRotor(model, group, ratio = 1, phaseOffset = 0) {
  model.root.add(group);
  model.rotors.push({ group, ratio, phaseOffset });
  return group;
}

function buildInput(THREE, builders, materials) {
  const model = createModel(THREE);
  const rotor = addRotor(model, new THREE.Group(), 1);

  const rearDrum = builders.cylinder(0.72, 0.34, materials.brass);
  rearDrum.position.x = 0.25;
  rotor.add(rearDrum);
  const rearBand = builders.torus(0.7, 0.055, materials.brightBrass);
  rearBand.position.x = 0.43;
  rotor.add(rearBand);

  const wheel = builders.cylinder(0.82, 0.2, materials.brass, 0.78);
  wheel.position.x = -0.02;
  rotor.add(wheel);
  rotor.add(builders.torus(0.82, 0.075, materials.brightBrass));
  rotor.add(builders.spokes(0.69, 6, 0.075, 0.16, materials.darkBrass));
  rotor.add(builders.boltRing(0.6, 6, 0.026, 0.19));

  const face = builders.cylinder(0.62, 0.18, materials.brightBrass, 0.54);
  face.position.x = -0.2;
  rotor.add(face);
  const faceRing = builders.torus(0.61, 0.032, materials.darkBrass);
  faceRing.position.x = 0.445;
  rotor.add(faceRing);
  const inputTicks = builders.ticks(0.55, 36, 0.2, 0.055, materials.darkBrass);
  inputTicks.position.x = 0.445;
  rotor.add(inputTicks);
  const engravedNotch = builders.ticks(
    0.51,
    1,
    0.035,
    0.13,
    materials.darkBrass,
    0.045,
  );
  engravedNotch.position.x = 0.465;
  engravedNotch.rotation.x = Math.PI * 0.37;
  rotor.add(engravedNotch);

  const hub = builders.cylinder(0.18, 0.28, materials.darkBrass, 0.13);
  hub.position.x = 0.56;
  rotor.add(hub);
  const collar = builders.torus(0.19, 0.028, materials.brightBrass);
  collar.position.x = 0.71;
  rotor.add(collar);

  return model;
}

function buildRules(THREE, builders, materials, resources) {
  const model = createModel(THREE);

  const supportGeometry = resources.trackGeometry(
    new THREE.BoxGeometry(0.12, 2.95, 0.12, 2, 6, 2),
  );
  for (const z of [-0.68, 0.68]) {
    const support = new THREE.Mesh(supportGeometry, materials.darkBrass);
    support.position.set(0.42, 0, z);
    model.root.add(support);
  }
  for (const y of [-1.5, 1.5]) {
    const brace = builders.cylinder(0.075, 1.5, materials.brass);
    brace.position.set(0.38, y, 0);
    model.root.add(brace);
    const cap = builders.cylinder(0.15, 0.22, materials.brightBrass);
    cap.position.set(0.38, y, 0.72);
    model.root.add(cap);
  }

  const main = addRotor(model, new THREE.Group(), 1);
  main.add(
    builders.gear(48, 0.94, 1.1, 0.3, 0.39, materials.brightBrass),
  );
  main.add(builders.spokes(0.86, 8, 0.075, 0.24, materials.brass));
  main.add(builders.torus(0.79, 0.055, materials.brightBrass));
  const crownRing = builders.torus(1.02, 0.035, materials.brass);
  crownRing.position.x = 0.18;
  main.add(crownRing);
  main.add(builders.boltRing(0.72, 8, 0.024, 0.32));
  const mainHub = builders.cylinder(0.36, 0.72, materials.brightBrass, 0.28);
  mainHub.position.x = 0.12;
  main.add(mainHub);
  const mainCollar = builders.torus(0.37, 0.045, materials.darkBrass);
  mainCollar.position.x = 0.49;
  main.add(mainCollar);

  const frontGear = builders.gear(
    36,
    0.67,
    0.78,
    0.15,
    0.32,
    materials.brass,
  );
  frontGear.position.x = 0.42;
  main.add(frontGear);

  const regulator = addRotor(model, new THREE.Group(), 1, Math.PI / 24);
  regulator.position.x = 0.64;
  regulator.add(
    builders.gear(32, 0.62, 0.75, 0.18, 0.28, materials.brass),
  );
  regulator.add(builders.torus(0.58, 0.035, materials.brightBrass));

  for (const direction of [-1, 1]) {
    const pinion = addRotor(
      model,
      new THREE.Group(),
      -48 / 14,
      direction > 0 ? Math.PI / 14 : 0,
    );
    pinion.position.set(0.15, direction * 1.43, 0);
    pinion.add(builders.gear(14, 0.29, 0.38, 0.28, 0.1, materials.brightBrass));
    pinion.add(builders.cylinder(0.13, 0.54, materials.darkBrass));
    pinion.add(builders.torus(0.3, 0.025, materials.brass));
  }

  return model;
}

function buildState(THREE, builders, materials) {
  const model = createModel(THREE);
  const rotor = addRotor(model, new THREE.Group(), 1);

  const rearDrum = builders.cylinder(1.0, 0.42, materials.steel, 0.9);
  rearDrum.position.x = 0.28;
  rotor.add(rearDrum);
  const memoryDrum = builders.cylinder(
    0.86,
    0.42,
    materials.steel,
    0.78,
  );
  memoryDrum.position.x = -0.1;
  rotor.add(memoryDrum);
  rotor.add(builders.torus(1.02, 0.055, materials.brightBrass));
  const middleRing = builders.torus(0.82, 0.045, materials.darkBrass);
  middleRing.position.x = -0.34;
  rotor.add(middleRing);
  const dialRing = builders.torus(0.49, 0.035, materials.brightBrass);
  dialRing.position.x = -0.62;
  rotor.add(dialRing);
  const indexedCrown = builders.gear(
    72,
    0.92,
    1.02,
    0.11,
    0.53,
    materials.brightBrass,
  );
  indexedCrown.position.x = -0.38;
  rotor.add(indexedCrown);
  rotor.add(builders.spokes(1.0, 8, 0.055, 0.16, materials.brightBrass));
  rotor.add(builders.boltRing(0.78, 12, 0.02, 0.19));
  const dial = builders.cylinder(0.5, 0.28, materials.brightBrass, 0.42);
  dial.position.x = -0.47;
  rotor.add(dial);
  const hub = builders.cylinder(0.2, 0.68, materials.darkBrass, 0.15);
  hub.position.x = -0.39;
  rotor.add(hub);
  const ticks = builders.ticks(0.91, 60, 0.22, 0.09, materials.darkBrass);
  ticks.position.x = -0.34;
  rotor.add(ticks);
  const stateIndex = builders.ticks(
    0.68,
    1,
    0.035,
    0.16,
    materials.darkBrass,
    0.04,
  );
  stateIndex.position.x = 0.505;
  stateIndex.rotation.x = Math.PI * 1.18;
  rotor.add(stateIndex);

  const ringLayers = [
    [1.42, 0.56, materials.glass],
    [1.27, 0.78, materials.brightBrass],
    [1.13, 1.0, materials.glass],
    [1.0, 1.2, materials.brass],
  ];
  for (const [radius, x, ringMaterial] of ringLayers) {
    const ring = builders.torus(radius, 0.035, ringMaterial);
    ring.position.x = x;
    rotor.add(ring);
  }

  return model;
}

function buildLattice(THREE, mergeGeometries, resources, materials) {
  const source = new THREE.IcosahedronGeometry(1.55, 2);
  const geometry = source.index ? source.toNonIndexed() : source;
  const position = geometry.getAttribute("position");
  const faceCount = position.count / 3;
  const nodes = [];
  const edgeFaces = new Map();

  for (let face = 0; face < faceCount; face += 1) {
    const vertices = [0, 1, 2].map((offset) =>
      new THREE.Vector3().fromBufferAttribute(position, face * 3 + offset),
    );
    const center = vertices[0]
      .clone()
      .add(vertices[1])
      .add(vertices[2])
      .normalize()
      .multiplyScalar(1.55);
    const tangent = new THREE.Vector3(
      Math.sin(face * 12.9898),
      Math.sin(face * 78.233 + 1.7),
      Math.sin(face * 39.425 + 2.9),
    );
    tangent.addScaledVector(center, -tangent.dot(center) / center.lengthSq());
    if (tangent.lengthSq() > 0.0001) tangent.normalize();
    nodes.push(center.addScaledVector(tangent, 0.04 + (face % 5) * 0.006));

    for (const [start, end] of [
      [0, 1],
      [1, 2],
      [2, 0],
    ]) {
      const key = [vertexKey(vertices[start]), vertexKey(vertices[end])]
        .sort()
        .join("|");
      const owners = edgeFaces.get(key) ?? [];
      owners.push(face);
      edgeFaces.set(key, owners);
    }
  }

  const tubes = [];
  let edgeIndex = 0;
  edgeFaces.forEach((owners) => {
    if (owners.length !== 2) return;
    const start = nodes[owners[0]];
    const end = nodes[owners[1]];
    const middle = start
      .clone()
      .add(end)
      .normalize()
      .multiplyScalar(1.57 + ((edgeIndex % 7) - 3) * 0.004);
    if (![start, middle, end].every((point) => point.toArray().every(Number.isFinite))) {
      return;
    }
    const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
    const tube = new THREE.TubeGeometry(curve, 5, 0.017, 4, false);
    const tubePositions = tube.getAttribute("position").array;
    let valid = true;
    for (let index = 0; index < tubePositions.length; index += 1) {
      if (!Number.isFinite(tubePositions[index])) {
        valid = false;
        break;
      }
    }
    if (valid) tubes.push(tube);
    else tube.dispose();
    edgeIndex += 1;
  });

  const latticeGeometry = mergeGeometries(tubes, false);
  tubes.forEach((tube) => tube.dispose());
  resources.geometries.add(latticeGeometry);
  const lattice = new THREE.Mesh(latticeGeometry, materials.brightBrass);

  const nodeGeometry = resources.trackGeometry(
    new THREE.SphereGeometry(0.024, 8, 6),
  );
  const nodesMesh = new THREE.InstancedMesh(
    nodeGeometry,
    materials.brass,
    nodes.length,
  );
  const matrix = new THREE.Matrix4();
  nodes.forEach((node, index) => {
    matrix.makeTranslation(node.x, node.y, node.z);
    nodesMesh.setMatrixAt(index, matrix);
  });
  nodesMesh.instanceMatrix.needsUpdate = true;

  if (geometry !== source) source.dispose();
  geometry.dispose();

  const group = new THREE.Group();
  group.add(lattice, nodesMesh);
  return group;
}

function buildOutput(THREE, builders, materials, resources, mergeGeometries) {
  const model = createModel(THREE);
  const rotor = addRotor(model, new THREE.Group(), 14 / 24);
  const lattice = buildLattice(
    THREE,
    mergeGeometries,
    resources,
    materials,
  );
  lattice.rotation.y = 0.16;
  lattice.rotation.z = -0.06;
  rotor.add(lattice);
  const hub = builders.cylinder(0.28, 0.66, materials.brass, 0.2);
  hub.position.x = -1.75;
  rotor.add(hub);
  const collar = builders.torus(0.3, 0.035, materials.darkBrass);
  collar.position.x = -2.1;
  rotor.add(collar);
  return model;
}

function applyPhase(runtime, phase) {
  Object.values(runtime.models).forEach((model) => {
    model.rotors.forEach(({ group, ratio, phaseOffset }) => {
      group.rotation.x = phase * ratio + phaseOffset;
    });
  });
}

function applyProgress(runtime, progress) {
  const eased = smootherstep(progress);
  Object.entries(runtime.models).forEach(([name, model]) => {
    const layout = ASSEMBLY_LAYOUT[name];
    const scale = mix(layout.compactScale, layout.expandedScale, eased);
    model.root.position.set(
      mix(layout.compactX, layout.expandedX, eased),
      0.22,
      0,
    );
    model.root.scale.setScalar(scale);
  });
  const clipPath = `inset(${mix(34.24, 0, eased)}% ${mix(33.12, 0, eased)}% ${mix(34.7, 0, eased)}% ${mix(35.15, 0, eased)}%)`;
  runtime.canvas.style.clipPath = clipPath;
  runtime.canvas.style.webkitClipPath = clipPath;
}

const MachineStage3D = forwardRef(function MachineStage3D({ onReady }, ref) {
  const canvasRef = useRef(null);
  const runtimeRef = useRef(null);
  const onReadyRef = useRef(onReady);
  const motionRef = useRef({ phase: 0, progress: 0 });
  onReadyRef.current = onReady;

  useImperativeHandle(ref, () => ({
    getState() {
      const runtime = runtimeRef.current;
      if (!runtime) return null;
      return {
        phase: motionRef.current.phase,
        progress: motionRef.current.progress,
        pixelRatio: runtime.renderer.getPixelRatio(),
        camera: runtime.camera.position.toArray(),
        render: { ...runtime.renderer.info.render },
        assemblies: Object.fromEntries(
          Object.entries(runtime.models).map(([name, model]) => [
            name,
            {
              position: model.root.position.toArray(),
              scale: model.root.scale.x,
              rotors: model.rotors.map(({ group, ratio }) => ({
                angle: group.rotation.x,
                ratio,
              })),
            },
          ]),
        ),
      };
    },
    setPhase(phase) {
      motionRef.current.phase = phase;
      const runtime = runtimeRef.current;
      if (!runtime) return;
      applyPhase(runtime, phase);
      runtime.renderer.render(runtime.scene, runtime.camera);
    },
    setProgress(progress) {
      motionRef.current.progress = progress;
      const runtime = runtimeRef.current;
      if (!runtime) return;
      applyProgress(runtime, progress);
      runtime.renderer.render(runtime.scene, runtime.camera);
    },
  }));

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    async function setup() {
      const THREE = await import("three");
      const { RoomEnvironment } = await import(
        "three/addons/environments/RoomEnvironment.js"
      );
      const { mergeGeometries } = await import(
        "three/addons/utils/BufferGeometryUtils.js"
      );
      if (cancelled || !canvasRef.current) return;

      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        alpha: true,
        antialias: false,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(
        -CAMERA_WIDTH / 2,
        CAMERA_WIDTH / 2,
        CAMERA_HEIGHT / 2,
        -CAMERA_HEIGHT / 2,
        0.1,
        80,
      );
      camera.position.set(3, 0, 18);
      camera.lookAt(0, 0, 0);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = environment;

      const key = new THREE.DirectionalLight(0xffe6b9, 2.5);
      key.position.set(-7, 7, 10);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xffe9c8, 2.35);
      rim.position.set(10, 4, 15);
      scene.add(rim);
      const lowerFill = new THREE.DirectionalLight(0xd0a15f, 0.65);
      lowerFill.position.set(-2, -7, 5);
      scene.add(lowerFill);
      scene.add(new THREE.HemisphereLight(0xfff3df, 0x49331f, 1.05));
      scene.add(new THREE.AmbientLight(0xffead0, 0.28));

      const resources = {
        geometries: new Set(),
        materials: new Set(),
        trackGeometry(value) {
          this.geometries.add(value);
          return value;
        },
      };
      const materials = createMaterials(THREE, resources);
      const builders = createBuilders(THREE, materials, resources);

      const shaft = builders.cylinder(0.065, 13.4, materials.steel);
      shaft.position.set(0.55, 0.22, 0);
      scene.add(shaft);
      const shaftKeyGeometry = resources.trackGeometry(
        new THREE.BoxGeometry(13.1, 0.025, 0.018),
      );
      const shaftKey = new THREE.Mesh(shaftKeyGeometry, materials.darkBrass);
      shaftKey.position.set(0.55, 0.288, 0);
      scene.add(shaftKey);

      const models = {
        input: buildInput(THREE, builders, materials),
        rules: buildRules(THREE, builders, materials, resources),
        state: buildState(THREE, builders, materials),
        output: buildOutput(
          THREE,
          builders,
          materials,
          resources,
          mergeGeometries,
        ),
      };
      Object.values(models).forEach((model) => scene.add(model.root));

      const runtime = {
        canvas: canvasRef.current,
        renderer,
        scene,
        camera,
        models,
        materials,
        resources,
        environment,
        pmrem,
        resizeObserver: null,
      };
      runtimeRef.current = runtime;
      applyProgress(runtime, motionRef.current.progress);
      applyPhase(runtime, motionRef.current.phase);

      const resize = () => {
        const width = canvasRef.current?.clientWidth ?? 0;
        const height = canvasRef.current?.clientHeight ?? 0;
        if (!width || !height) return;
        const pixelRatioLimit = window.matchMedia("(max-width: 720px)").matches
          ? 1.5
          : 2;
        const pixelRatio = Math.min(
          window.devicePixelRatio || 1,
          pixelRatioLimit,
        );
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
        renderer.render(scene, camera);
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvasRef.current);
      runtime.resizeObserver = resizeObserver;
      resize();
      onReadyRef.current?.();

      cleanup = () => {
        runtime.resizeObserver?.disconnect();
        runtime.resources.geometries.forEach((value) => value.dispose());
        runtime.resources.materials.forEach((value) => value.dispose());
        runtime.environment.dispose();
        runtime.pmrem.dispose();
        runtime.renderer.dispose();
        runtime.renderer.forceContextLoss?.();
        runtimeRef.current = null;
      };
    }

    setup();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return <canvas className="machine-stage-3d" ref={canvasRef} aria-hidden="true" />;
});

export default MachineStage3D;
