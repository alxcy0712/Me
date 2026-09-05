import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { getLaptopPose, LAPTOP_WIDTH, LID_HEIGHT, OPEN_LID_ANGLE, SCREEN } from "./laptopPose.js";
import { advanceSpring } from "../hooks/pageMotion.js";

const SCREEN_WIDTH = 1000;
const SCREEN_HEIGHT = 625;

// Rounded silhouettes and small machined bevels are independent of thickness.
function panelGeometry(THREE, width, height, depth, radius, bevel = 0.018) {
  const shape = new THREE.Shape();
  const left = -width / 2;
  const right = width / 2;
  shape.moveTo(left + radius, 0);
  shape.lineTo(right - radius, 0);
  shape.quadraticCurveTo(right, 0, right, radius);
  shape.lineTo(right, height - radius);
  shape.quadraticCurveTo(right, height, right - radius, height);
  shape.lineTo(left + radius, height);
  shape.quadraticCurveTo(left, height, left, height - radius);
  shape.lineTo(left, radius);
  shape.quadraticCurveTo(left, 0, left + radius, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 20,
  });
  geometry.translate(0, 0, -depth / 2 + bevel);
  geometry.computeVertexNormals();
  return geometry;
}

function chassisGeometry(THREE) {
  const vertices = [];
  const uvs = [];
  const indices = [];
  // A crisp deck rolls into a recessed belly; the finger scoop is part of
  // the front edge, including its shallow curved floor.
  const profiles = [
    [-0.14, 0.18, 0], [-0.128, 0.11, 0], [-0.1, 0.04, 0],
    [-0.03, 0, 0.025], [0.095, 0, 0.13], [0.105, 0.006, 0.15],
  ];
  const addVertex = (x, y, z) => {
    vertices.push(x, y, z);
    uvs.push(x / LAPTOP_WIDTH + 0.5, z / 6.12 + 0.5);
  };
  const rings = profiles.map(([y, inset, scoop]) => {
    const outline = [];
    const radius = 0.24;
    [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], corner) => {
      for (let step = 0; step <= 12; step += 1) {
        const angle = (corner + step / 12) * Math.PI / 2;
        outline.push([
          sx * (LAPTOP_WIDTH / 2 - inset - radius) + radius * Math.cos(angle),
          sz * (3.06 - inset - radius) + radius * Math.sin(angle),
        ]);
      }
      if (corner === 0) {
        [[1, 0], [0.94, 0.3], [0.84, 1], [-0.84, 1], [-0.94, 0.3], [-1, 0]].forEach(([x, depth]) => {
          outline.push([x, 3.06 - inset - scoop * depth]);
        });
      }
    });
    outline.forEach(([x, z]) => addVertex(x, y, z));
    return outline;
  });
  const count = rings[0].length;
  for (let ring = 0; ring < profiles.length - 1; ring += 1) {
    for (let point = 0; point < count; point += 1) {
      const a = ring * count + point;
      const next = ring * count + (point + 1) % count;
      indices.push(a, a + count, next, next, a + count, next + count);
    }
  }
  // Separate cap vertices keep the broad deck flat under studio lighting.
  for (const ring of [0, profiles.length - 1]) {
    const center = vertices.length / 3;
    addVertex(0, profiles[ring][0], 0);
    rings[ring].forEach(([x, z]) => addVertex(x, profiles[ring][0], z));
    for (let point = 0; point < count; point += 1) {
      const a = center + 1 + point;
      const b = center + 1 + (point + 1) % count;
      indices.push(...(ring === 0 ? [center, a, b] : [center, b, a]));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function brushedTexture(THREE) {
  const width = 256;
  const height = 128;
  const data = new Uint8Array(width * height * 4);
  let seed = 4711;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < height; y += 1) {
    const line = random() * 10;
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const value = 204 + line + random() * 8;
      data[offset] = data[offset + 1] = data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, width, height);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 5);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createMaterials(THREE, grain) {
  return {
    aluminum: new THREE.MeshStandardMaterial({
      color: 0xb4b1aa, metalness: 0.9, roughness: 0.53,
      roughnessMap: grain, envMapIntensity: 0.64,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x030405, metalness: 0, roughness: 0.32,
      clearcoat: 0.18, clearcoatRoughness: 0.24, envMapIntensity: 0.045,
    }),
    key: new THREE.MeshStandardMaterial({
      color: 0x101113, metalness: 0.08, roughness: 0.5, envMapIntensity: 0.12,
    }),
    inset: new THREE.MeshStandardMaterial({
      color: 0x333435, metalness: 0.65, roughness: 0.52,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x090a0b, metalness: 0.02, roughness: 0.76,
    }),
    lens: new THREE.MeshPhysicalMaterial({
      color: 0x14232c, metalness: 0.55, roughness: 0.14, clearcoat: 1,
    }),
    trackpad: new THREE.MeshStandardMaterial({
      color: 0xb9b7b2, metalness: 0.72, roughness: 0.48, roughnessMap: grain,
    }),
  };
}

function createContactShadow(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 128);
  gradient.addColorStop(0, "rgba(32, 28, 24, 0.32)");
  gradient.addColorStop(0.55, "rgba(42, 37, 32, 0.14)");
  gradient.addColorStop(1, "rgba(42, 37, 32, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    depthWrite: false, map: texture, transparent: true,
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(11.2, 7.2), material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -0.182, 0.2);
  return { shadow, texture, material };
}

function addLaptop(THREE, RoundedBoxGeometry, scene, materials) {
  const root = new THREE.Group();
  root.name = "2015-retina-macbook-pro";
  scene.add(root);

  const addPanel = (parent, width, height, depth, radius, material, position, flat = false) => {
    const mesh = new THREE.Mesh(panelGeometry(THREE, width, height, depth, radius), material);
    mesh.position.set(...position);
    if (flat) mesh.rotation.x = -Math.PI / 2;
    parent.add(mesh);
    return mesh;
  };

  const base = new THREE.Mesh(chassisGeometry(THREE), materials.aluminum);
  root.add(base);
  base.receiveShadow = true;
  addPanel(root, 7.55, 2.85, 0.04, 0.14, materials.inset, [0, 0.089, -0.02], true);

  const keyGeometry = new RoundedBoxGeometry(0.46, 0.026, 0.4, 3, 0.013);
  const keys = new THREE.InstancedMesh(keyGeometry, materials.key, 82);
  const matrix = new THREE.Matrix4();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const rows = [
    ["esc", ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`), "⏻"],
    ["`", ..."1234567890-=", ["delete", 1.5]],
    [["tab", 1.5], ..."QWERTYUIOP[]\\"],
    [["caps lock", 1.8], ..."ASDFGHJKL;'", ["return", 1.7]],
    [["shift", 2.3], ..."ZXCVBNM,./", ["shift", 2.2]],
    ["fn", "control", "option", ["command", 1.25], ["", 5.25], ["command", 1.25], "option", "←", "↕", "→"],
  ];
  const legends = document.createElement("canvas");
  legends.width = 2048;
  legends.height = 768;
  const ink = legends.getContext("2d");
  ink.textAlign = "center";
  ink.textBaseline = "middle";
  ink.fillStyle = "#cccac5";
  let keyIndex = 0;
  rows.forEach((row, rowIndex) => {
    const total = row.reduce((sum, entry) => sum + (Array.isArray(entry) ? entry[1] : 1), 0);
    let offset = -total * 0.25;
    row.forEach((entry) => {
      const [label, units] = Array.isArray(entry) ? entry : [entry, 1];
      const x = offset + units * 0.25;
      const z = -2.63 + rowIndex * 0.47;
      position.set(x, 0.12, z);
      scale.set((units * 0.5 - 0.045) / 0.46, 1, rowIndex === 0 ? 0.55 : 1);
      matrix.compose(position, quaternion, scale);
      keys.setMatrixAt(keyIndex++, matrix);
      ink.font = `${label.length > 1 ? 18 : 29}px Helvetica, Arial, sans-serif`;
      ink.fillText(label, (x / 7.55 + 0.5) * legends.width, ((z + 2.87) / 2.85) * legends.height);
      offset += units * 0.5;
    });
  });
  keys.count = keyIndex;
  keys.instanceMatrix.needsUpdate = true;
  keys.castShadow = true;
  root.add(keys);
  const legendTexture = new THREE.CanvasTexture(legends);
  legendTexture.colorSpace = THREE.SRGBColorSpace;
  legendTexture.anisotropy = 4;
  materials.keyLegends = new THREE.MeshBasicMaterial({ map: legendTexture, transparent: true, depthWrite: false });
  const keyLegends = new THREE.Mesh(new THREE.PlaneGeometry(7.55, 2.85), materials.keyLegends);
  keyLegends.rotation.x = -Math.PI / 2;
  keyLegends.position.set(0, 0.134, -1.445);
  root.add(keyLegends);

  addPanel(root, 3.48, 1.96, 0.042, 0.11, materials.inset, [0, 0.095, 2.37], true);
  addPanel(root, 3.44, 1.92, 0.042, 0.1, materials.trackpad, [0, 0.101, 2.35], true);

  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 7.55, 24), materials.rubber);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, 0.18, -2.995);
  root.add(hinge);

  const holes = new THREE.InstancedMesh(new THREE.CircleGeometry(0.013, 6), materials.rubber, 600);
  quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  let hole = 0;
  for (const side of [-1, 1]) {
    for (let row = 0; row < 50; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        position.set(side * (4.02 + column * 0.062), 0.111, -2.68 + row * 0.052);
        matrix.compose(position, quaternion, scale.set(1, 1, 1));
        holes.setMatrixAt(hole++, matrix);
      }
    }
  }
  root.add(holes);

  const feet = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.21, 0.21, 0.035, 20), materials.rubber, 4);
  [[-3.96, -2.44], [3.96, -2.44], [-3.96, 2.44], [3.96, 2.44]].forEach(([x, z], index) => {
    matrix.makeTranslation(x, -0.16, z);
    feet.setMatrixAt(index, matrix);
  });
  root.add(feet);

  const ports = new THREE.InstancedMesh(new RoundedBoxGeometry(0.025, 0.095, 0.39, 2, 0.015), materials.inset, 6);
  [[-1, -2.3], [-1, -1.69], [-1, -1.1], [1, -2.27], [1, -1.55], [1, -0.83]].forEach(([side, z], index) => {
    matrix.makeTranslation(side * 4.635, -0.01, z);
    ports.setMatrixAt(index, matrix);
  });
  root.add(ports);

  const lid = new THREE.Group();
  lid.name = "display-hinge";
  lid.position.set(0, 0.26, -3.02);
  root.add(lid);
  const lidBack = addPanel(lid, 9.15, LID_HEIGHT, 0.15, 0.23, materials.aluminum, [0, 0, 0]);
  lidBack.castShadow = true;
  addPanel(lid, 9.1, 6.025, 0.041, 0.215, materials.rubber, [0, 0.028, 0.079]);
  addPanel(lid, 9.06, 5.985, 0.04, 0.2, materials.glass, [0, 0.048, 0.091]);
  const cameraHousing = new THREE.Mesh(new THREE.CircleGeometry(0.028, 24), materials.inset);
  cameraHousing.position.set(0, 5.865, 0.119);
  lid.add(cameraHousing);
  const cameraLens = new THREE.Mesh(new THREE.CircleGeometry(0.013, 20), materials.lens);
  cameraLens.position.set(0, 5.865, 0.121);
  lid.add(cameraLens);

  const contactShadow = createContactShadow(THREE);
  root.add(contactShadow.shadow);
  return { contactShadow, lid, root };
}

// Project the actual display plane into CSS homogeneous coordinates. Reusing
// these matrices keeps desktop text and the WebGL bezel on the same frame.
function projectDesktop(stage, screenElement) {
  const { width, height, projection, displayPlane, lid, camera } = stage;
  projection.copy(camera.projectionMatrix)
    .multiply(camera.matrixWorldInverse)
    .multiply(lid.matrixWorld)
    .multiply(displayPlane);
  const source = projection.elements;
  const css = stage.cssMatrix;
  const w = source[15];
  for (let column = 0; column < 16; column += 4) {
    css[column] = (source[column] + source[column + 3]) * width / (2 * w);
    css[column + 1] = (source[column + 3] - source[column + 1]) * height / (2 * w);
    css[column + 2] = 0;
    css[column + 3] = source[column + 3] / w;
  }
  css[10] = 1;
  screenElement.style.transform = `matrix3d(${css.join(",")})`;
}

const LaptopStage = forwardRef(function LaptopStage(
  { screenRef, onError, onReady, onWakeComplete, reducedMotion },
  forwardedRef,
) {
  const hostRef = useRef(null);
  const stageRef = useRef(null);
  const poseRef = useRef({ position: 0, velocity: 0 });
  const wakeRef = useRef({ value: 0, velocity: 0, target: 0, frame: 0, lastTime: 0 });
  const reducedMotionRef = useRef(reducedMotion);
  const onWakeCompleteRef = useRef(onWakeComplete);
  reducedMotionRef.current = reducedMotion;
  onWakeCompleteRef.current = onWakeComplete;

  const renderPose = (position, velocity = 0) => {
    poseRef.current = { position, velocity };
    const stage = stageRef.current;
    if (!stage || document.visibilityState === "hidden") return;
    const { lid, renderer, root, scene, camera, host, restingCamera, focusedCamera } = stage;
    const wake = wakeRef.current.value;
    const pose = getLaptopPose(position, wake);
    camera.position.lerpVectors(restingCamera, focusedCamera, pose.focus);
    camera.updateMatrixWorld(true);
    lid.rotation.x = pose.lidAngle;
    root.position.set(0, pose.lift, -pose.dolly);
    root.rotation.y = pose.yaw;
    root.visible = pose.presence > 0.001;
    root.updateMatrixWorld(true);
    host.style.opacity = String(pose.presence);

    const screenElement = screenRef.current;
    if (screenElement) {
      projectDesktop(stage, screenElement);
      screenElement.style.setProperty("--wake-progress", String(wake));
      screenElement.style.willChange = velocity || wakeRef.current.frame ? "transform, opacity" : "auto";
      screenElement.style.opacity = String(pose.screenOpacity);
      screenElement.style.visibility = root.visible && pose.screenOpacity > 0.001 ? "visible" : "hidden";
    }
    host.dataset.lidAngle = pose.lidAngle.toFixed(5);
    host.dataset.openness = pose.openness.toFixed(5);
    host.dataset.presence = pose.presence.toFixed(5);
    host.dataset.focus = pose.focus.toFixed(5);
    // Settled and offscreen scenes consume no animation frames.
    if (!root.visible && !stage.wasVisible) return;
    renderer.render(scene, camera);
    stage.wasVisible = root.visible;
    renderer.domElement.dataset.drawCalls = String(renderer.info.render.calls);
    renderer.domElement.dataset.renderedFrames = String(++stage.renderedFrames);
  };

  const finishWake = () => {
    const wake = wakeRef.current;
    cancelAnimationFrame(wake.frame);
    wake.value = wake.target;
    wake.velocity = 0;
    wake.frame = 0;
    wake.lastTime = 0;
    renderPose(poseRef.current.position, poseRef.current.velocity);
    if (wake.target === 1) onWakeCompleteRef.current?.();
  };

  const startWake = () => {
    const wake = wakeRef.current;
    if (reducedMotionRef.current) {
      finishWake();
      return;
    }
    if (wake.frame || document.visibilityState === "hidden") return;
    const step = (time) => {
      const current = wakeRef.current;
      const elapsed = current.lastTime ? Math.min((time - current.lastTime) / 1000, 0.032) : 0;
      current.lastTime = time;
      const next = advanceSpring(current.value, current.velocity, current.target, elapsed, 10);
      current.value = next.value;
      current.velocity = next.velocity;
      if (Math.abs(current.value - current.target) < 0.001 && Math.abs(current.velocity) < 0.01) {
        finishWake();
        return;
      }
      renderPose(poseRef.current.position, poseRef.current.velocity);
      current.frame = requestAnimationFrame(step);
    };
    wake.frame = requestAnimationFrame(step);
  };

  useImperativeHandle(forwardedRef, () => ({
    setPose: renderPose,
    setAwake(awake) {
      wakeRef.current.target = awake ? 1 : 0;
      if (awake) startWake();
      else finishWake();
    },
  }), []);

  useEffect(() => {
    if (reducedMotion && wakeRef.current.frame) finishWake();
  }, [reducedMotion]);

  useEffect(() => {
    let disposed = false;
    let resizeObserver;
    async function initialize() {
      try {
        const [THREE, { RoundedBoxGeometry }, { RoomEnvironment }] = await Promise.all([
          import("three"),
          import("three/addons/geometries/RoundedBoxGeometry.js"),
          import("three/addons/environments/RoomEnvironment.js"),
        ]);
        if (disposed || !hostRef.current) return;
        const host = hostRef.current;
        const scene = new THREE.Scene();
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.className = "laptop-canvas";
        host.appendChild(renderer.domElement);

        const room = new RoomEnvironment();
        const pmrem = new THREE.PMREMGenerator(renderer);
        const environment = pmrem.fromScene(room, 0.04);
        scene.environment = environment.texture;
        scene.environmentRotation.y = 0.3;
        room.dispose();
        pmrem.dispose();

        const camera = new THREE.PerspectiveCamera(3, 1, 0.1, 320);
        scene.add(new THREE.HemisphereLight(0xfffaf2, 0x484542, 1.3));
        const key = new THREE.DirectionalLight(0xfff4e5, 1.7);
        key.position.set(-8, 12, 8);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.normalBias = 0.025;
        key.shadow.camera.left = -7;
        key.shadow.camera.right = 7;
        key.shadow.camera.top = 8;
        key.shadow.camera.bottom = -7;
        key.shadow.camera.near = 0.5;
        key.shadow.camera.far = 40;
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xffffff, 1.5);
        rim.position.set(7, 5, -6);
        scene.add(rim);

        const grain = brushedTexture(THREE);
        const materials = createMaterials(THREE, grain);
        // Explicit maps retain each surface's reflection strength; the scene
        // fallback uses scene.environmentIntensity for every material in r185.
        Object.values(materials).forEach((material) => {
          material.envMap = environment.texture;
          material.envMapRotation.copy(scene.environmentRotation);
        });
        const { contactShadow, lid, root } = addLaptop(THREE, RoundedBoxGeometry, scene, materials);
        const displayPlane = new THREE.Matrix4().makeScale(SCREEN.width / SCREEN_WIDTH, -SCREEN.height / SCREEN_HEIGHT, 1);
        displayPlane.setPosition(-SCREEN.width / 2, SCREEN.bottom + SCREEN.height, SCREEN.z);
        stageRef.current = {
          THREE, camera, contactShadow, environment, grain, host, lid,
          materials, renderer, root, scene, displayPlane,
          projection: new THREE.Matrix4(), cssMatrix: new Array(16).fill(0),
          width: 1, height: 1, wasVisible: true, renderedFrames: 0,
          restingCamera: new THREE.Vector3(), focusedCamera: new THREE.Vector3(),
        };
        const resize = () => {
          const width = Math.max(1, host.clientWidth);
          const height = Math.max(1, host.clientHeight);
          const stage = stageRef.current;
          stage.width = width;
          stage.height = height;
          const pixelRatio = Math.min(window.devicePixelRatio || 1, width <= 640 ? 1.5 : 2);
          renderer.setPixelRatio(pixelRatio);
          renderer.setSize(width, height, false);
          renderer.domElement.dataset.pixelRatio = String(pixelRatio);
          camera.aspect = width / height;
          const deviceWidth = Math.min(width * 0.78, width - (width <= 640 ? 56 : 112), (height - 72) * 1.34);
          const distance = LAPTOP_WIDTH * width / (deviceWidth * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
          const focusedWidth = Math.min(width - (width <= 640 ? 52 : 76), (height - 24) * 1.51);
          const focusedDistance = 9.15 * width / (focusedWidth * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
          // Tight depth bounds keep the thin glass/gasket layers distinct,
          // including the long camera distance needed on narrow screens.
          camera.near = Math.max(1, Math.min(distance, focusedDistance) * 0.5);
          camera.far = distance + 24;
          // Center the complete open silhouette, including the nearer front
          // lip. A long lens keeps the deck narrow at the seated-eye endpoint.
          const topY = 0.26 + LID_HEIGHT * Math.cos(OPEN_LID_ANGLE);
          const topDepth = distance - LID_HEIGHT * Math.sin(OPEN_LID_ANGLE);
          const frontDepth = distance - 6.08;
          const eyeHeight = (topY / topDepth - 0.17 / frontDepth) / (1 / topDepth + 1 / frontDepth);
          const horizontalOffset = width <= 640 ? 14 * LAPTOP_WIDTH / deviceWidth : 0;
          stage.restingCamera.set(horizontalOffset, eyeHeight, distance - 3.02);
          const focusOffset = width <= 640 ? 14 : focusedWidth > width - 140 ? 24 : 0;
          const displayCenter = SCREEN.bottom + SCREEN.height / 2;
          stage.focusedCamera.set(
            focusOffset * 9.15 / focusedWidth,
            0.26 + displayCenter * Math.cos(OPEN_LID_ANGLE) - SCREEN.z * Math.sin(OPEN_LID_ANGLE),
            focusedDistance - 3.02,
          );
          camera.position.copy(stage.restingCamera);
          camera.lookAt(horizontalOffset, eyeHeight, -3.02);
          camera.updateProjectionMatrix();
          camera.updateMatrixWorld(true);
          renderPose(poseRef.current.position, poseRef.current.velocity);
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();
        // Compile during preloading so the first hinge movement has warm shaders.
        root.visible = true;
        await renderer.compileAsync(scene, camera);
        if (disposed) return;
        renderPose(poseRef.current.position, poseRef.current.velocity);
        const handleVisibility = () => {
          const wake = wakeRef.current;
          if (document.visibilityState === "hidden") {
            cancelAnimationFrame(wake.frame);
            wake.frame = 0;
            wake.lastTime = 0;
          } else {
            renderPose(poseRef.current.position, poseRef.current.velocity);
            if (wake.value !== wake.target) startWake();
          }
        };
        stageRef.current.handleVisibility = handleVisibility;
        document.addEventListener("visibilitychange", handleVisibility);
        onReady?.();
      } catch (error) {
        if (disposed) return;
        console.error("Unable to initialize the MacBook stage", error);
        onError?.(error);
      }
    }
    initialize();
    return () => {
      disposed = true;
      cancelAnimationFrame(wakeRef.current.frame);
      resizeObserver?.disconnect();
      const stage = stageRef.current;
      if (!stage) return;
      if (stage.handleVisibility) document.removeEventListener("visibilitychange", stage.handleVisibility);
      stage.scene.traverse((object) => object.geometry?.dispose?.());
      Object.values(stage.materials).forEach((material) => {
        material.map?.dispose();
        material.dispose();
      });
      stage.contactShadow.texture.dispose();
      stage.contactShadow.material.dispose();
      stage.grain.dispose();
      stage.environment.dispose();
      stage.renderer.dispose();
      stage.renderer.domElement.remove();
      stageRef.current = null;
    };
  }, []);

  return <div className="laptop-stage" ref={hostRef} aria-hidden="true" />;
});

export default LaptopStage;
