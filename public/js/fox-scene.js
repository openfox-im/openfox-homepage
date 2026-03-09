const mount = document.querySelector("[data-fox-scene]");

if (mount) {
  import("/vendor/three.module.min.js")
    .then((THREE) => initFoxScene(THREE, mount))
    .catch(() => {
      showFallback(
        mount,
        "The 3D fox scene could not load right now. WebGL or the Three.js module is unavailable."
      );
    });
}

function initFoxScene(THREE, mountNode) {
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
  } catch (_error) {
    showFallback(mountNode, "This browser does not expose the WebGL support needed for the fox scene.");
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mountNode.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x09131d, 10, 28);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  camera.position.set(0, 2.85, 10.6);

  const lights = createLights(THREE);
  scene.add(lights.group);

  const sky = createSky(THREE);
  scene.add(sky);

  const world = new THREE.Group();
  scene.add(world);

  const ground = createGround(THREE);
  world.add(ground);

  const forest = createForest(THREE);
  world.add(forest.group);

  const fox = createFox(THREE);
  world.add(fox.group);

  const fireflies = createFireflies(THREE);
  world.add(fireflies.points);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 40),
    new THREE.MeshBasicMaterial({
      color: 0x020303,
      opacity: 0.22,
      transparent: true,
      depthWrite: false
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -1.03, 0);
  world.add(shadow);

  const pointer = {
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clock = new THREE.Clock();
  let frameId = 0;
  let sceneIsVisible = true;

  const resize = () => {
    const width = Math.max(mountNode.clientWidth, 1);
    const height = Math.max(mountNode.clientHeight, 1);

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    if (reduceMotion.matches) {
      renderFrame();
    }
  };

  const renderFrame = () => {
    const elapsed = clock.getElapsedTime();
    const travel = Math.sin(elapsed * 0.85);
    const stride = elapsed * 10.5;
    const bounce = Math.abs(Math.sin(stride)) * 0.1;
    const direction = Math.cos(elapsed * 0.85) >= 0 ? 1 : -1;

    pointer.currentX = THREE.MathUtils.lerp(pointer.currentX, pointer.targetX, 0.06);
    pointer.currentY = THREE.MathUtils.lerp(pointer.currentY, pointer.targetY, 0.06);

    fox.group.position.x = travel * 4.35;
    fox.group.position.y = -0.02 + bounce;
    fox.group.rotation.y = direction > 0 ? 0 : Math.PI;
    fox.body.rotation.z = Math.sin(stride) * 0.05;
    fox.body.rotation.x = 0.03 + bounce * 0.18;
    fox.head.rotation.z = -bounce * 0.55 + Math.sin(elapsed * 3.3) * 0.025;
    fox.head.rotation.y = pointer.currentX * 0.08;
    fox.tail.rotation.y = Math.sin(stride * 0.7) * 0.28;
    fox.tail.rotation.z = 0.58 + Math.cos(stride * 0.7) * 0.16;

    for (const leg of fox.legs) {
      leg.pivot.rotation.z = Math.sin(stride + leg.phase) * 0.78;
    }

    fox.coin.rotation.x = elapsed * 6;
    fox.coinRing.rotation.x = fox.coin.rotation.x;
    fox.coin.material.emissiveIntensity = 0.34 + Math.abs(Math.sin(elapsed * 4.4)) * 0.32;

    shadow.position.x = fox.group.position.x;
    shadow.scale.x = 1.02 - bounce * 0.45;
    shadow.scale.y = 0.9 - bounce * 0.32;
    shadow.material.opacity = 0.22 - bounce * 0.34;

    for (const sway of forest.swayers) {
      sway.node.rotation.z = Math.sin(elapsed * sway.speed + sway.offset) * sway.amount;
    }

    const fireflyPositions = fireflies.points.geometry.attributes.position.array;
    for (let index = 0; index < fireflies.base.length; index += 3) {
      const particle = index / 3;
      fireflyPositions[index] =
        fireflies.base[index] + Math.cos(elapsed * 0.7 + particle * 0.3) * 0.08;
      fireflyPositions[index + 1] =
        fireflies.base[index + 1] + Math.sin(elapsed * 1.8 + particle) * 0.14;
      fireflyPositions[index + 2] =
        fireflies.base[index + 2] + Math.sin(elapsed * 0.9 + particle * 0.6) * 0.06;
    }
    fireflies.points.geometry.attributes.position.needsUpdate = true;
    fireflies.points.material.opacity = 0.52 + Math.abs(Math.sin(elapsed * 1.4)) * 0.22;

    world.rotation.y = pointer.currentX * 0.12;
    world.rotation.x = pointer.currentY * 0.04;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.currentX * 0.9, 0.06);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 2.85 + pointer.currentY * 0.45, 0.06);
    camera.lookAt(pointer.currentX * 0.28, 0.35 + pointer.currentY * 0.2, 0);

    renderer.render(scene, camera);
  };

  const stopLoop = () => {
    if (!frameId) {
      return;
    }

    window.cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const tick = () => {
    renderFrame();
    frameId = window.requestAnimationFrame(tick);
  };

  const startLoop = () => {
    if (frameId || reduceMotion.matches || !sceneIsVisible || document.hidden) {
      return;
    }

    tick();
  };

  const updatePointer = (event) => {
    if (reduceMotion.matches) {
      return;
    }

    const rect = mountNode.getBoundingClientRect();
    const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    pointer.targetX = THREE.MathUtils.clamp(normalizedX, -1, 1) * 0.75;
    pointer.targetY = THREE.MathUtils.clamp(normalizedY, -1, 1) * -0.55;
  };

  const resetPointer = () => {
    pointer.targetX = 0;
    pointer.targetY = 0;
  };

  mountNode.addEventListener("pointermove", updatePointer);
  mountNode.addEventListener("pointerleave", resetPointer);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopLoop();
      return;
    }

    if (reduceMotion.matches) {
      renderFrame();
      return;
    }

    startLoop();
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        sceneIsVisible = Boolean(entry?.isIntersecting);

        if (sceneIsVisible) {
          if (reduceMotion.matches) {
            renderFrame();
          } else {
            startLoop();
          }
        } else {
          stopLoop();
        }
      },
      {
        threshold: 0.18
      }
    );

    observer.observe(mountNode);
  }

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mountNode);
  } else {
    window.addEventListener("resize", resize);
  }

  resize();

  if (reduceMotion.matches) {
    renderFrame();
  } else {
    startLoop();
  }
}

function createLights(THREE) {
  const group = new THREE.Group();

  const ambient = new THREE.AmbientLight(0x435669, 1.15);
  group.add(ambient);

  const hemisphere = new THREE.HemisphereLight(0x84b6f4, 0x102016, 1.3);
  hemisphere.position.set(0, 10, 0);
  group.add(hemisphere);

  const moonlight = new THREE.DirectionalLight(0xfff0c9, 1.6);
  moonlight.position.set(-5.5, 8.5, 5.5);
  moonlight.castShadow = true;
  moonlight.shadow.mapSize.set(1024, 1024);
  moonlight.shadow.camera.near = 0.5;
  moonlight.shadow.camera.far = 25;
  moonlight.shadow.camera.left = -10;
  moonlight.shadow.camera.right = 10;
  moonlight.shadow.camera.top = 10;
  moonlight.shadow.camera.bottom = -10;
  group.add(moonlight);

  const rim = new THREE.DirectionalLight(0x50f1d8, 0.82);
  rim.position.set(7, 4, -8);
  group.add(rim);

  return { group };
}

function createSky(THREE) {
  const group = new THREE.Group();

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 28, 28),
    new THREE.MeshBasicMaterial({
      color: 0xf8d37a
    })
  );
  moon.position.set(-4.8, 6.1, -11.5);
  group.add(moon);

  const moonGlow = new THREE.PointLight(0xffd98d, 0.8, 28, 2);
  moonGlow.position.copy(moon.position);
  group.add(moonGlow);

  const random = createRandom(21);
  const positions = [];

  for (let index = 0; index < 90; index += 1) {
    positions.push((random() - 0.5) * 22);
    positions.push(3.8 + random() * 5.4);
    positions.push(-15 - random() * 6);
  }

  const stars = new THREE.BufferGeometry();
  stars.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  const starField = new THREE.Points(
    stars,
    new THREE.PointsMaterial({
      color: 0xeaf4ff,
      size: 0.08,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    })
  );
  group.add(starField);

  return group;
}

function createGround(THREE) {
  const group = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(11.5, 64),
    new THREE.MeshStandardMaterial({
      color: 0x132116,
      roughness: 1,
      metalness: 0
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.08;
  ground.receiveShadow = true;
  group.add(ground);

  const clearing = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 3.2),
    new THREE.MeshStandardMaterial({
      color: 0x3e3222,
      roughness: 1,
      metalness: 0
    })
  );
  clearing.rotation.x = -Math.PI / 2;
  clearing.position.set(0, -1.06, 0);
  clearing.receiveShadow = true;
  group.add(clearing);

  const trailGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(12.6, 1.45),
    new THREE.MeshBasicMaterial({
      color: 0x6a522c,
      opacity: 0.28,
      transparent: true,
      depthWrite: false
    })
  );
  trailGlow.rotation.x = -Math.PI / 2;
  trailGlow.position.set(0, -1.03, 0);
  group.add(trailGlow);

  const random = createRandom(33);
  for (let index = 0; index < 16; index += 1) {
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.12 + random() * 0.08, 0),
      new THREE.MeshStandardMaterial({
        color: 0x3d4853,
        roughness: 0.96,
        metalness: 0.02
      })
    );

    stone.position.set((random() - 0.5) * 11.5, -0.97, (random() > 0.5 ? 1 : -1) * (1.5 + random() * 1.8));
    stone.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    stone.castShadow = true;
    stone.receiveShadow = true;
    group.add(stone);
  }

  return group;
}

function createForest(THREE) {
  const group = new THREE.Group();
  const swayers = [];
  const random = createRandom(7);

  const materials = {
    bark: new THREE.MeshStandardMaterial({
      color: 0x3b2619,
      roughness: 1,
      metalness: 0
    }),
    leafA: new THREE.MeshStandardMaterial({
      color: 0x2b5f33,
      roughness: 0.96,
      metalness: 0
    }),
    leafB: new THREE.MeshStandardMaterial({
      color: 0x1e4827,
      roughness: 0.98,
      metalness: 0
    }),
    shrub: new THREE.MeshStandardMaterial({
      color: 0x22472c,
      roughness: 1,
      metalness: 0
    })
  };

  for (let index = 0; index < 30; index += 1) {
    const tree = new THREE.Group();

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 1.4, 10),
      materials.bark
    );
    trunk.position.y = 0.7;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    const canopy = new THREE.Group();
    const layers = 2 + Math.floor(random() * 2);

    for (let layer = 0; layer < layers; layer += 1) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.72 - layer * 0.12 + random() * 0.08, 1.15, 8),
        layer % 2 === 0 ? materials.leafA : materials.leafB
      );
      cone.position.y = 1.22 + layer * 0.42;
      cone.rotation.y = random() * Math.PI;
      cone.castShadow = true;
      canopy.add(cone);
    }

    tree.add(canopy);

    const side = index % 2 === 0 ? 1 : -1;
    let x = (random() - 0.5) * 14;
    if (Math.abs(x) < 1.8) {
      x += side * (2 + random() * 2.2);
    }

    tree.position.set(x, -1.08, side * (2.7 + random() * 2.6));
    tree.scale.setScalar(0.78 + random() * 0.9);
    tree.rotation.y = random() * Math.PI * 2;
    group.add(tree);

    swayers.push({
      node: canopy,
      amount: 0.03 + random() * 0.025,
      speed: 0.65 + random() * 0.45,
      offset: random() * Math.PI * 2
    });
  }

  for (let index = 0; index < 12; index += 1) {
    const shrub = new THREE.Mesh(
      new THREE.SphereGeometry(0.45 + random() * 0.18, 18, 16),
      materials.shrub
    );
    shrub.scale.set(1.2 + random() * 0.4, 0.65 + random() * 0.15, 1.1 + random() * 0.4);
    shrub.position.set((random() - 0.5) * 12, -0.82, (random() > 0.5 ? 1 : -1) * (1.9 + random() * 1.8));
    shrub.castShadow = true;
    shrub.receiveShadow = true;
    group.add(shrub);
  }

  return { group, swayers };
}

function createFox(THREE) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const materials = {
    fur: new THREE.MeshStandardMaterial({
      color: 0xe96f2a,
      roughness: 0.84,
      metalness: 0.02
    }),
    furDark: new THREE.MeshStandardMaterial({
      color: 0xbd4a18,
      roughness: 0.88,
      metalness: 0.02
    }),
    cream: new THREE.MeshStandardMaterial({
      color: 0xf9ead2,
      roughness: 0.9,
      metalness: 0
    }),
    dark: new THREE.MeshStandardMaterial({
      color: 0x1e1817,
      roughness: 0.96,
      metalness: 0
    }),
    coin: new THREE.MeshStandardMaterial({
      color: 0xffcf47,
      emissive: 0xaa6a05,
      emissiveIntensity: 0.34,
      roughness: 0.2,
      metalness: 1
    }),
    coinEdge: new THREE.MeshStandardMaterial({
      color: 0xffe28d,
      roughness: 0.16,
      metalness: 1
    })
  };

  // Simple pivots keep the run cycle readable without importing an external model.
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.72, 24, 22), materials.fur);
  torso.scale.set(2.05, 1.04, 1.08);
  torso.position.set(0, 0.36, 0);
  torso.castShadow = true;
  body.add(torso);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 18), materials.cream);
  belly.scale.set(1.65, 0.72, 0.84);
  belly.position.set(0.42, 0.15, 0);
  belly.castShadow = true;
  body.add(belly);

  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 18), materials.furDark);
  shoulder.scale.set(1.1, 0.95, 0.86);
  shoulder.position.set(0.86, 0.47, 0);
  shoulder.castShadow = true;
  body.add(shoulder);

  const head = new THREE.Group();
  head.position.set(1.45, 0.68, 0);
  body.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.5, 22, 20), materials.fur);
  skull.scale.set(1.12, 0.9, 0.94);
  skull.castShadow = true;
  head.add(skull);

  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 16), materials.cream);
  muzzle.scale.set(2.2, 0.7, 0.82);
  muzzle.position.set(0.42, -0.06, 0);
  muzzle.castShadow = true;
  head.add(muzzle);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), materials.dark);
  nose.position.set(0.78, -0.04, 0);
  nose.castShadow = true;
  head.add(nose);

  const eyeGeometry = new THREE.SphereGeometry(0.04, 12, 12);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeometry, materials.dark);
    eye.position.set(0.28, 0.06, side * 0.2);
    head.add(eye);
  }

  const earGeometry = new THREE.ConeGeometry(0.13, 0.34, 4);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeometry, materials.furDark);
    ear.position.set(0.02, 0.42, side * 0.24);
    ear.rotation.z = side * 0.16;
    ear.rotation.x = side * 0.08;
    ear.castShadow = true;
    head.add(ear);
  }

  const tail = new THREE.Group();
  tail.position.set(-1.35, 0.58, 0);
  body.add(tail);

  const tailBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.3, 1.55, 12),
    materials.fur
  );
  tailBody.rotation.z = -1.08;
  tailBody.position.set(-0.58, 0.02, 0);
  tailBody.castShadow = true;
  tail.add(tailBody);

  const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), materials.cream);
  tailTip.scale.set(1.8, 0.75, 0.9);
  tailTip.position.set(-1.12, -0.48, 0);
  tailTip.castShadow = true;
  tail.add(tailTip);

  const legs = [];
  const legPairs = [
    { x: 0.82, z: 0.28, phase: 0 },
    { x: 0.82, z: -0.28, phase: Math.PI },
    { x: -0.72, z: 0.26, phase: Math.PI },
    { x: -0.72, z: -0.26, phase: 0 }
  ];

  for (const legPair of legPairs) {
    const pivot = new THREE.Group();
    pivot.position.set(legPair.x, 0.02, legPair.z);
    body.add(pivot);

    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.07, 0.88, 10),
      materials.furDark
    );
    upper.position.y = -0.44;
    upper.castShadow = true;
    pivot.add(upper);

    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), materials.dark);
    paw.scale.set(1.3, 0.65, 1.25);
    paw.position.y = -0.88;
    paw.castShadow = true;
    pivot.add(paw);

    legs.push({
      pivot,
      phase: legPair.phase
    });
  }

  const coin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.09, 28),
    materials.coin
  );
  coin.rotation.z = Math.PI / 2;
  coin.position.set(0.96, -0.05, 0);
  coin.castShadow = true;
  head.add(coin);

  const coinRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.018, 10, 32),
    materials.coinEdge
  );
  coinRing.rotation.y = Math.PI / 2;
  coinRing.position.copy(coin.position);
  coinRing.castShadow = true;
  head.add(coinRing);

  group.position.y = -0.02;

  return {
    group,
    body,
    head,
    tail,
    legs,
    coin,
    coinRing
  };
}

function createFireflies(THREE) {
  const random = createRandom(17);
  const positions = [];

  for (let index = 0; index < 22; index += 1) {
    positions.push((random() - 0.5) * 12);
    positions.push(0.2 + random() * 2.4);
    positions.push((random() - 0.5) * 6.5);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffdf72,
    size: 0.12,
    transparent: true,
    opacity: 0.6,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  points.position.y = 0.2;

  return {
    points,
    base: Float32Array.from(positions)
  };
}

function showFallback(mountNode, message) {
  mountNode.classList.add("is-fallback");
  mountNode.textContent = "";

  const note = document.createElement("p");
  note.className = "scene-card__fallback";
  note.textContent = message;

  mountNode.append(note);
}

function createRandom(seed) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
